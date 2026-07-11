import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { campusRequiresRoom } from "@/lib/campus";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import { schedulingCoordinationCourseLabelsMatch } from "@/lib/scheduling-coordination";
import { pickStudentSessionConflict, pickTeacherSessionConflict } from "@/lib/session-conflict";
import { isSessionDuplicateError } from "@/lib/session-unique";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";
import { SCHEDULING_COORDINATION_TICKET_TYPE } from "@/lib/tickets";

export type MiniappSchedulingAction = "create" | "reschedule";

type DbClient = typeof prisma | Prisma.TransactionClient;

type SchedulingInput = {
  action: MiniappSchedulingAction;
  sessionId: string;
  startAt: Date;
  durationMin: number;
};

type SchedulingActor = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

export type MiniappSchedulingPreviewTokenPayload = {
  userId: string;
  action: MiniappSchedulingAction;
  sessionId: string;
  startAt: string;
  durationMin: number;
  coordinationTicketIds: string[];
  expiresAt: number;
};

export class MiniappSchedulingError extends Error {
  constructor(
    message: string,
    public status = 409,
    public code = "SCHEDULING_BLOCKED"
  ) {
    super(message);
  }
}

const sessionContextInclude = {
  attendances: {
    select: {
      studentId: true,
      status: true,
      excusedCharge: true,
      deductedMinutes: true,
      deductedCount: true,
    },
  },
  teacher: { select: { id: true, name: true } },
  student: { select: { id: true, name: true } },
  class: {
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      campus: { select: { id: true, name: true, isOnline: true, requiresRoom: true } },
      room: { select: { id: true, name: true } },
      oneOnOneStudent: { select: { id: true, name: true } },
      enrollments: { include: { student: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.SessionInclude;

type SessionContext = Prisma.SessionGetPayload<{ include: typeof sessionContextInclude }>;

function expectedStudents(session: SessionContext) {
  if (session.class.capacity === 1) {
    const id = session.studentId ?? session.class.oneOnOneStudentId ?? session.class.enrollments[0]?.studentId ?? null;
    const name =
      session.student?.name ??
      session.class.oneOnOneStudent?.name ??
      session.class.enrollments.find((row) => row.studentId === id)?.student.name ??
      null;
    return id ? [{ id, name }] : [];
  }
  return Array.from(new Map(session.class.enrollments.map((row) => [row.studentId, { id: row.studentId, name: row.student.name }])).values());
}

function courseLabel(session: SessionContext) {
  return [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
}

function locationText(session: SessionContext) {
  const campus = session.class.campus;
  if (campus.isOnline) return campus.name || "线上";
  return session.class.room?.name ? `${campus.name} · ${session.class.room.name}` : campus.name;
}

function conflictSelect() {
  return {
    id: true,
    classId: true,
    studentId: true,
    class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
    attendances: {
      select: {
        studentId: true,
        status: true,
        excusedCharge: true,
        deductedMinutes: true,
        deductedCount: true,
      },
    },
  } as const;
}

async function getSessionContext(db: DbClient, sessionId: string) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionContextInclude });
  if (!session) throw new MiniappSchedulingError("课程不存在或已被删除。", 404, "SESSION_NOT_FOUND");
  return session;
}

async function openCoordinationTickets(db: DbClient, studentIds: string[], expectedCourseLabel: string) {
  const rows = await db.ticket.findMany({
    where: {
      studentId: { in: studentIds },
      type: SCHEDULING_COORDINATION_TICKET_TYPE,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    select: {
      id: true,
      ticketNo: true,
      studentId: true,
      studentName: true,
      status: true,
      course: true,
      parentVisible: true,
      risksNotes: true,
      parentAvailabilityRequest: { select: { courseLabel: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.filter((ticket) =>
    schedulingCoordinationCourseLabelsMatch(
      ticket.parentAvailabilityRequest?.courseLabel ?? ticket.course,
      expectedCourseLabel
    )
  );
}

async function validateScheduling(db: DbClient, input: SchedulingInput) {
  if (!Number.isFinite(input.durationMin) || input.durationMin < 15 || input.durationMin > 360) {
    throw new MiniappSchedulingError("课程时长必须在 15 到 360 分钟之间。", 409, "INVALID_DURATION");
  }
  if (Number.isNaN(input.startAt.getTime())) {
    throw new MiniappSchedulingError("请选择有效的上课日期和时间。", 409, "INVALID_START_AT");
  }
  if (input.startAt.getTime() < Date.now()) {
    throw new MiniappSchedulingError("移动端只能安排未来时间的课程。", 409, "PAST_TIME_BLOCKED");
  }

  const session = await getSessionContext(db, input.sessionId);
  if (input.action === "reschedule" && session.endAt <= new Date()) {
    throw new MiniappSchedulingError("已经结束的课程不能在移动端改课。", 409, "PAST_SESSION_BLOCKED");
  }
  if (input.action === "reschedule" && session.attendances.some((row) => row.status !== "UNMARKED")) {
    throw new MiniappSchedulingError("课程已经点名，不能在移动端改课。", 409, "ATTENDANCE_LOCKED");
  }

  const endAt = new Date(input.startAt.getTime() + input.durationMin * 60_000);
  const excludeSessionIds = input.action === "reschedule" ? [session.id] : [];
  const teacherId = session.teacherId ?? session.class.teacherId;
  const students = expectedStudents(session);
  const schedulingStudentId = session.class.capacity === 1 ? students[0]?.id ?? null : null;
  if (students.length === 0) {
    throw new MiniappSchedulingError("当前课程没有可排课学生。", 409, "NO_STUDENTS");
  }

  const availabilityError = await checkTeacherSchedulingAvailability(db, teacherId, input.startAt, endAt);
  if (availabilityError) {
    throw new MiniappSchedulingError(`老师 availability 不匹配：${availabilityError}`, 409, "AVAIL_CONFLICT");
  }

  const duplicate = await db.session.findFirst({
    where: {
      id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
      classId: session.classId,
      startAt: input.startAt,
      endAt,
    },
    select: { id: true },
  });
  if (duplicate) throw new MiniappSchedulingError("同一课程在该时间已经存在。", 409, "DUPLICATE");

  const studentIds = students.map((student) => student.id);
  const studentConflicts = await db.session.findMany({
    where: {
      id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: input.startAt },
      OR: [
        { studentId: { in: studentIds } },
        { class: { oneOnOneStudentId: { in: studentIds } } },
        { class: { enrollments: { some: { studentId: { in: studentIds } } } } },
        { attendances: { some: { studentId: { in: studentIds } } } },
      ],
    },
    select: conflictSelect(),
    orderBy: { startAt: "asc" },
  });
  for (const student of students) {
    const conflict = pickStudentSessionConflict(studentConflicts, student.id);
    if (conflict) {
      throw new MiniappSchedulingError(
        `${student.name || "学生"} 与其他课程时间冲突。`,
        409,
        "STUDENT_CONFLICT"
      );
    }
  }

  const teacherConflicts = await db.session.findMany({
    where: {
      id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      startAt: { lt: endAt },
      endAt: { gt: input.startAt },
    },
    select: conflictSelect(),
  });
  if (pickTeacherSessionConflict(teacherConflicts, schedulingStudentId)) {
    throw new MiniappSchedulingError("老师与其他课程时间冲突。", 409, "TEACHER_CONFLICT");
  }

  const teacherAppointment = await db.appointment.findFirst({
    where: { teacherId, startAt: { lt: endAt }, endAt: { gt: input.startAt } },
    select: { id: true },
  });
  if (teacherAppointment) {
    throw new MiniappSchedulingError("老师与已有预约时间冲突。", 409, "APPOINTMENT_CONFLICT");
  }

  const roomId = session.class.roomId;
  if (!roomId && campusRequiresRoom(session.class.campus)) {
    throw new MiniappSchedulingError("当前线下课程没有设置教室，请先在电脑后台补充。", 409, "ROOM_REQUIRED");
  }
  if (roomId) {
    const roomConflicts = await db.session.findMany({
      where: {
        id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: input.startAt },
      },
      select: conflictSelect(),
    });
    if (pickTeacherSessionConflict(roomConflicts)) {
      throw new MiniappSchedulingError("教室与其他课程时间冲突。", 409, "ROOM_CONFLICT");
    }
  }

  const requiredHoursMinutes = session.class.capacity === 1 ? input.durationMin : 1;
  for (const student of students) {
    const packageDecision = await getSchedulablePackageDecision(db, {
      studentId: student.id,
      courseId: session.class.courseId,
      at: input.startAt,
      requiredHoursMinutes,
    });
    if (!packageDecision.ok) {
      throw new MiniappSchedulingError(packageDecision.message, 409, packageDecision.code);
    }
  }

  const expectedCourseLabel = courseLabel(session);
  const coordinationTickets = await openCoordinationTickets(db, studentIds, expectedCourseLabel);

  return {
    session,
    startAt: input.startAt,
    endAt,
    teacherId,
    students,
    preview: {
      action: input.action,
      actionLabel: input.action === "create" ? "新增课程" : "修改本节课",
      beforeText: input.action === "reschedule" ? `${formatBusinessDateTime(session.startAt)} - ${formatBusinessDateTime(session.endAt)}` : "新增一节课程",
      afterText: `${formatBusinessDateTime(input.startAt)} - ${formatBusinessDateTime(endAt)}`,
      courseLabel: expectedCourseLabel,
      teacherName: session.teacher?.name ?? session.class.teacher.name,
      studentText: students.map((student) => student.name).filter(Boolean).join("、") || "-",
      locationText: locationText(session),
      durationMin: input.durationMin,
      coordinationTickets: coordinationTickets.map((ticket) => ({
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        studentName: ticket.studentName,
        status: ticket.status,
      })),
    },
    coordinationTickets,
  };
}

export async function previewMiniappSessionScheduling(input: SchedulingInput) {
  return validateScheduling(prisma, input);
}

export async function applyMiniappSessionScheduling(
  input: SchedulingInput,
  actor: SchedulingActor,
  completeCoordinationTicketIds: string[] = []
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const checked = await validateScheduling(tx, input);
        const requestedTicketIds = Array.from(new Set(completeCoordinationTicketIds));
        const eligibleTicketIds = new Set(checked.coordinationTickets.map((ticket) => ticket.id));
        if (requestedTicketIds.some((ticketId) => !eligibleTicketIds.has(ticketId))) {
          throw new MiniappSchedulingError(
            "排课协调工单已变化，请重新检查冲突。",
            409,
            "COORDINATION_PREVIEW_STALE"
          );
        }
        let writtenSessionId: string;
        if (input.action === "reschedule") {
          const updated = await tx.session.update({
            where: { id: checked.session.id },
            data: { startAt: checked.startAt, endAt: checked.endAt },
          });
          writtenSessionId = updated.id;
        } else {
          const teacherOverride = checked.teacherId === checked.session.class.teacherId ? null : checked.teacherId;
          const created = await tx.session.create({
            data: {
              classId: checked.session.classId,
              startAt: checked.startAt,
              endAt: checked.endAt,
              teacherId: teacherOverride,
              studentId: checked.session.class.capacity === 1 ? checked.students[0]?.id ?? null : null,
            },
          });
          writtenSessionId = created.id;
        }

        await tx.auditLog.create({
          data: {
            actorEmail: actor.email.trim().toLowerCase(),
            actorName: actor.name?.trim() || null,
            actorRole: actor.role,
            module: "SCHEDULING",
            action: input.action === "create" ? "MINIAPP_SESSION_CREATE" : "MINIAPP_SESSION_RESCHEDULE",
            entityType: "Session",
            entityId: writtenSessionId,
            meta: {
              sourceSessionId: input.sessionId,
              startAt: checked.startAt.toISOString(),
              endAt: checked.endAt.toISOString(),
              durationMin: input.durationMin,
            },
          },
        });
        const completedCoordinationTickets = [];
        if (requestedTicketIds.length) {
          const now = new Date();
          const actorName = actor.name?.trim() || actor.email;
          const completionResult = `已完成排课：${checked.preview.afterText}；老师：${checked.preview.teacherName}；地点：${checked.preview.locationText}。`;
          for (const ticket of checked.coordinationTickets.filter((row) => requestedTicketIds.includes(row.id))) {
            const coordinationLog = `[${formatBusinessDateTime(now)}] ${actorName} · 移动排课\n${completionResult}`;
            const previousNotes = String(ticket.risksNotes ?? "").trim();
            await tx.ticket.update({
              where: { id: ticket.id },
              data: {
                status: "Completed",
                systemUpdated: "Y",
                finalSchedule: completionResult,
                parentCompletionResult: completionResult,
                nextAction: "排课已完成，无需继续跟进。",
                nextActionDue: null,
                risksNotes: previousNotes ? `${previousNotes}\n\n${coordinationLog}` : coordinationLog,
                lastUpdateAt: now,
                completedAt: now,
                completedByUserId: actor.userId,
              },
            });
            await tx.parentAvailabilityRequest.updateMany({
              where: { ticketId: ticket.id },
              data: { isActive: false },
            });
            await tx.auditLog.create({
              data: {
                actorEmail: actor.email.trim().toLowerCase(),
                actorName: actor.name?.trim() || null,
                actorRole: actor.role,
                module: "TICKETS",
                action: "MINIAPP_COORDINATION_COMPLETE_AFTER_SCHEDULING",
                entityType: "Ticket",
                entityId: ticket.id,
                meta: { sessionId: writtenSessionId, sourceSessionId: input.sessionId },
              },
            });
            completedCoordinationTickets.push({
              id: ticket.id,
              ticketNo: ticket.ticketNo,
              studentId: ticket.studentId,
              parentVisible: ticket.parentVisible,
            });
          }
        }
        return { ...checked, writtenSessionId, completedCoordinationTickets };
      },
      { maxWait: 5000, timeout: 20000 }
    );
  } catch (error) {
    if (isSessionDuplicateError(error)) {
      throw new MiniappSchedulingError("同一课程在该时间已经存在。", 409, "DUPLICATE");
    }
    throw error;
  }
}

function signPart(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createMiniappSchedulingPreviewToken(
  payload: Omit<MiniappSchedulingPreviewTokenPayload, "expiresAt">,
  secret: string
) {
  const fullPayload: MiniappSchedulingPreviewTokenPayload = {
    ...payload,
    expiresAt: Date.now() + 10 * 60_000,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${encoded}.${signPart(encoded, secret)}`;
}

export function verifyMiniappSchedulingPreviewToken(token: string, secret: string) {
  const [encoded, signature] = String(token ?? "").split(".");
  if (!encoded || !signature) return null;
  const expected = signPart(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MiniappSchedulingPreviewTokenPayload;
    if (!payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
