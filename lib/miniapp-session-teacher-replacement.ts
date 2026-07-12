import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { schedulingCoordinationCourseLabelsMatch } from "@/lib/scheduling-coordination";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { getSessionStudents } from "@/lib/session-students";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type MiniappTeacherReplacementInput = {
  sessionId: string;
  newTeacherId: string;
  reason: string;
};

type ReplacementActor = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

export type MiniappTeacherReplacementTokenPayload = MiniappTeacherReplacementInput & {
  userId: string;
  ticketIds: string[];
  expiresAt: number;
};

export class MiniappTeacherReplacementError extends Error {
  constructor(
    message: string,
    public status = 409,
    public code = "TEACHER_REPLACEMENT_BLOCKED"
  ) {
    super(message);
  }
}

const sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  student: { select: { id: true, name: true } },
  attendances: true,
  teacher: { select: { id: true, name: true } },
  class: {
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      campus: { select: { name: true, isOnline: true } },
      room: { select: { name: true } },
      oneOnOneStudent: { select: { id: true, name: true } },
      enrollments: { include: { student: { select: { id: true, name: true } } } },
    },
  },
});

function canTeach(teacher: { subjectCourseId: string | null; subjectCourse: { courseId: string } | null; subjects: Array<{ id: string; courseId: string }> }, courseId: string, subjectId: string | null) {
  if (subjectId) return teacher.subjectCourseId === subjectId || teacher.subjects.some((subject) => subject.id === subjectId);
  return teacher.subjectCourse?.courseId === courseId || teacher.subjects.some((subject) => subject.courseId === courseId);
}

function courseLabel(session: Prisma.SessionGetPayload<{ include: typeof sessionInclude }>) {
  return [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
}

async function getSession(db: DbClient, sessionId: string) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new MiniappTeacherReplacementError("课程不存在或已被删除。", 404, "SESSION_NOT_FOUND");
  return session;
}

export async function listMiniappReplacementTeachers(sessionId: string) {
  const session = await getSession(prisma, sessionId);
  if (session.startAt <= new Date()) return [];
  const currentTeacherId = session.teacherId ?? session.class.teacherId;
  const teachers = await prisma.teacher.findMany({
    include: {
      subjectCourse: { select: { courseId: true } },
      subjects: { select: { id: true, courseId: true } },
    },
    orderBy: { name: "asc" },
  });
  return teachers
    .filter((teacher) => teacher.id !== currentTeacherId && canTeach(teacher, session.class.courseId, session.class.subjectId))
    .map((teacher) => ({ id: teacher.id, name: teacher.name }));
}

async function validateReplacement(db: DbClient, input: MiniappTeacherReplacementInput) {
  const session = await getSession(db, input.sessionId);
  if (session.startAt <= new Date()) {
    throw new MiniappTeacherReplacementError("移动端只能更换尚未开始课程的老师。", 409, "PAST_SESSION_BLOCKED");
  }
  if (
    session.attendances.some(
      (row) =>
        row.status !== "UNMARKED" ||
        row.deductedMinutes > 0 ||
        row.deductedCount > 0 ||
        Boolean(row.packageId) ||
        row.excusedCharge
    )
  ) {
    throw new MiniappTeacherReplacementError("课程已有点名、请假或扣费记录，不能在移动端换老师。", 409, "ATTENDANCE_LOCKED");
  }
  const currentTeacherId = session.teacherId ?? session.class.teacherId;
  if (input.newTeacherId === currentTeacherId) {
    throw new MiniappTeacherReplacementError("请选择不同于当前安排的老师。", 409, "SAME_TEACHER");
  }
  const teacher = await db.teacher.findUnique({
    where: { id: input.newTeacherId },
    include: { subjectCourse: { select: { courseId: true } }, subjects: { select: { id: true, courseId: true } } },
  });
  if (!teacher) throw new MiniappTeacherReplacementError("老师不存在。", 404, "TEACHER_NOT_FOUND");
  if (!canTeach(teacher, session.class.courseId, session.class.subjectId)) {
    throw new MiniappTeacherReplacementError("该老师没有本课程/科目的授课资质。", 409, "CANNOT_TEACH");
  }
  const availabilityError = await checkTeacherSchedulingAvailability(db, teacher.id, session.startAt, session.endAt);
  if (availabilityError) {
    throw new MiniappTeacherReplacementError(`老师 availability 不匹配：${availabilityError}`, 409, "AVAIL_CONFLICT");
  }

  const conflicts = await db.session.findMany({
    where: {
      id: { not: session.id },
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
      OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
    },
    select: {
      id: true,
      classId: true,
      studentId: true,
      class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
      attendances: {
        select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
      },
    },
  });
  if (pickTeacherSessionConflict(conflicts, session.studentId)) {
    throw new MiniappTeacherReplacementError("新老师与其他课程时间冲突。", 409, "TEACHER_CONFLICT");
  }
  const appointment = await db.appointment.findFirst({
    where: { teacherId: teacher.id, startAt: { lt: session.endAt }, endAt: { gt: session.startAt } },
    select: { id: true },
  });
  if (appointment) throw new MiniappTeacherReplacementError("新老师与已有预约时间冲突。", 409, "APPOINTMENT_CONFLICT");

  const students = getSessionStudents(session);
  const expectedCourseLabel = courseLabel(session);
  const rows = await db.ticket.findMany({
    where: {
      studentId: { in: students.map((student) => student.id) },
      type: "改上课老师",
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
  const tickets = rows.filter((ticket) =>
    schedulingCoordinationCourseLabelsMatch(
      ticket.parentAvailabilityRequest?.courseLabel ?? ticket.course,
      expectedCourseLabel
    )
  );

  const campus = session.class.campus;
  const location = campus.isOnline
    ? campus.name
    : session.class.room?.name
      ? `${campus.name} · ${session.class.room.name}`
      : campus.name;
  return {
    session,
    teacher,
    currentTeacherId,
    tickets,
    preview: {
      courseLabel: expectedCourseLabel,
      timeText: `${formatBusinessDateTime(session.startAt)} - ${formatBusinessDateTime(session.endAt)}`,
      fromTeacherName: session.teacher?.name ?? session.class.teacher.name,
      toTeacherName: teacher.name,
      locationText: location,
      reason: input.reason,
      tickets: tickets.map((ticket) => ({ id: ticket.id, ticketNo: ticket.ticketNo, studentName: ticket.studentName })),
    },
  };
}

export async function previewMiniappTeacherReplacement(input: MiniappTeacherReplacementInput) {
  return validateReplacement(prisma, input);
}

export async function applyMiniappTeacherReplacement(
  input: MiniappTeacherReplacementInput,
  actor: ReplacementActor,
  completeTicketIds: string[]
) {
  return prisma.$transaction(
    async (tx) => {
      const checked = await validateReplacement(tx, input);
      const requestedIds = Array.from(new Set(completeTicketIds));
      const eligibleIds = new Set(checked.tickets.map((ticket) => ticket.id));
      if (requestedIds.some((ticketId) => !eligibleIds.has(ticketId))) {
        throw new MiniappTeacherReplacementError("换老师工单已变化，请重新预检。", 409, "TICKET_PREVIEW_STALE");
      }
      await tx.session.update({
        where: { id: checked.session.id },
        data: { teacherId: checked.teacher.id === checked.session.class.teacherId ? null : checked.teacher.id },
      });
      await tx.sessionTeacherChange.create({
        data: {
          sessionId: checked.session.id,
          fromTeacherId: checked.currentTeacherId,
          toTeacherId: checked.teacher.id,
          reason: input.reason,
        },
      });

      const now = new Date();
      const actorName = actor.name?.trim() || actor.email;
      const resultText = `已更换本节课老师：${checked.preview.timeText}；${checked.preview.fromTeacherName} → ${checked.preview.toTeacherName}。`;
      const completedTickets = [];
      for (const ticket of checked.tickets.filter((row) => requestedIds.includes(row.id))) {
        const log = `[${formatBusinessDateTime(now)}] ${actorName} · 移动换老师\n${resultText}`;
        const previousNotes = String(ticket.risksNotes ?? "").trim();
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "Completed",
            systemUpdated: "Y",
            finalSchedule: resultText,
            parentCompletionResult: resultText,
            nextAction: "本节课老师已更换，无需继续跟进。",
            nextActionDue: null,
            risksNotes: previousNotes ? `${previousNotes}\n\n${log}` : log,
            lastUpdateAt: now,
            completedAt: now,
            completedByUserId: actor.userId,
          },
        });
        await tx.parentAvailabilityRequest.updateMany({ where: { ticketId: ticket.id }, data: { isActive: false } });
        await tx.auditLog.create({
          data: {
            actorEmail: actor.email.trim().toLowerCase(),
            actorName: actor.name?.trim() || null,
            actorRole: actor.role,
            module: "TICKETS",
            action: "MINIAPP_TEACHER_CHANGE_TICKET_COMPLETE",
            entityType: "Ticket",
            entityId: ticket.id,
            meta: { sessionId: checked.session.id, toTeacherId: checked.teacher.id },
          },
        });
        completedTickets.push({
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          studentId: ticket.studentId,
          studentName: ticket.studentName,
          parentVisible: ticket.parentVisible,
          updatedAt: now,
        });
      }

      await tx.auditLog.create({
        data: {
          actorEmail: actor.email.trim().toLowerCase(),
          actorName: actor.name?.trim() || null,
          actorRole: actor.role,
          module: "SCHEDULING",
          action: "MINIAPP_SESSION_REPLACE_TEACHER",
          entityType: "Session",
          entityId: checked.session.id,
          meta: {
            fromTeacherId: checked.currentTeacherId,
            toTeacherId: checked.teacher.id,
            reason: input.reason,
          },
        },
      });
      return { preview: checked.preview, completedTickets };
    },
    { maxWait: 5000, timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

function signPart(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createMiniappTeacherReplacementToken(
  payload: Omit<MiniappTeacherReplacementTokenPayload, "expiresAt">,
  secret: string
) {
  const fullPayload = { ...payload, expiresAt: Date.now() + 10 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${encoded}.${signPart(encoded, secret)}`;
}

export function verifyMiniappTeacherReplacementToken(token: string, secret: string) {
  const [encoded, signature] = String(token ?? "").split(".");
  if (!encoded || !signature) return null;
  const expected = signPart(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MiniappTeacherReplacementTokenPayload;
    if (!payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
