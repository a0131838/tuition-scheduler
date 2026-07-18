import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { campusRequiresRoom } from "@/lib/campus";
import { formatBusinessDateTime } from "@/lib/date-only";
import { applyLinkedTicketSchedulingAction } from "@/lib/ticket-scheduling-action-write";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import { pickStudentSessionConflict, pickTeacherSessionConflict } from "@/lib/session-conflict";
import { isSessionDuplicateError } from "@/lib/session-unique";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";
import { prisma } from "@/lib/prisma";
import { NEW_SESSION_TICKET_TYPES } from "@/lib/miniapp-scheduling-coordination-board";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type TicketNewSessionInput = {
  ticketId: string | null;
  studentId: string | null;
  subjectId: string;
  levelId: string | null;
  teacherId: string;
  campusId: string;
  roomId: string | null;
  startAt: Date;
  durationMin: number;
  weeks?: number;
};

type Actor = { userId: string; email: string; name: string | null; role: string };

type TokenPayload = {
  userId: string;
  ticketId: string | null;
  studentId: string | null;
  subjectId: string;
  levelId: string | null;
  teacherId: string;
  campusId: string;
  roomId: string | null;
  startAt: string;
  durationMin: number;
  weeks: number;
  expiresAt: number;
};

export class TicketNewSessionError extends Error {
  constructor(message: string, public status = 409, public code = "NEW_SESSION_BLOCKED") {
    super(message);
  }
}

function canTeach(
  teacher: { subjectCourseId: string | null; subjects: Array<{ id: string }> },
  subjectId: string
) {
  return teacher.subjectCourseId === subjectId || teacher.subjects.some((subject) => subject.id === subjectId);
}

function conflictSelect() {
  return {
    id: true,
    classId: true,
    studentId: true,
    class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
    attendances: {
      select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
    },
  } as const;
}

export function buildTicketNewSessionStartTimes(startAt: Date, requestedWeeks = 1) {
  const weeks = requestedWeeks;
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) {
    throw new TicketNewSessionError("连续排课周数必须在 1 到 12 周之间。", 409, "INVALID_WEEKS");
  }
  return Array.from({ length: weeks }, (_, index) => new Date(startAt.getTime() + index * 7 * 24 * 60 * 60 * 1000));
}

function schedulingRows(input: TicketNewSessionInput) {
  return buildTicketNewSessionStartTimes(input.startAt, input.weeks ?? 1).map((startAt) => ({
    ...input,
    weeks: 1,
    startAt,
  }));
}

async function validate(db: DbClient, input: TicketNewSessionInput) {
  if (!Number.isFinite(input.durationMin) || input.durationMin < 15 || input.durationMin > 360) {
    throw new TicketNewSessionError("课程时长必须在 15 到 360 分钟之间。", 409, "INVALID_DURATION");
  }
  if (Number.isNaN(input.startAt.getTime()) || input.startAt.getTime() < Date.now()) {
    throw new TicketNewSessionError("请选择未来的有效上课时间。", 409, "INVALID_START_AT");
  }

  if (Boolean(input.ticketId) === Boolean(input.studentId)) {
    throw new TicketNewSessionError("排课来源无效。", 409, "INVALID_SCHEDULING_CONTEXT");
  }
  const ticket = input.ticketId
    ? await db.ticket.findFirst({
        where: {
          id: input.ticketId,
          OR: [
            { type: { in: [...NEW_SESSION_TICKET_TYPES] } },
            { schedulingActions: { some: { actionType: "CREATE_SESSION", status: { notIn: ["APPLIED", "CANCELLED"] } } } },
          ],
          isArchived: false,
          status: { notIn: ["Completed", "Cancelled"] },
        },
        include: { student: { select: { id: true, name: true } } },
      })
    : null;
  if (input.ticketId && !ticket) throw new TicketNewSessionError("工单不存在或已完成。", 404, "TICKET_NOT_FOUND");
  let student = ticket?.student ?? null;
  if (!student && ticket) {
    const matches = await db.student.findMany({ where: { name: ticket.studentName }, select: { id: true, name: true }, take: 2 });
    if (matches.length !== 1) {
      throw new TicketNewSessionError("工单尚未关联唯一学生，请先在电脑端补充学生关联。", 409, "STUDENT_LINK_REQUIRED");
    }
    student = matches[0];
  }
  if (!student && input.studentId) {
    student = await db.student.findUnique({ where: { id: input.studentId }, select: { id: true, name: true } });
  }
  if (!student) throw new TicketNewSessionError("学生不存在。", 404, "STUDENT_NOT_FOUND");

  const subject = await db.subject.findUnique({
    where: { id: input.subjectId },
    include: { course: { select: { id: true, name: true } }, levels: { select: { id: true, name: true } } },
  });
  if (!subject) throw new TicketNewSessionError("课程科目不存在。", 404, "SUBJECT_NOT_FOUND");
  const level = input.levelId ? subject.levels.find((row) => row.id === input.levelId) ?? null : null;
  if (input.levelId && !level) throw new TicketNewSessionError("课程级别与科目不匹配。", 409, "LEVEL_MISMATCH");

  const teacher = await db.teacher.findUnique({
    where: { id: input.teacherId },
    include: { subjects: { select: { id: true } } },
  });
  if (!teacher || !canTeach(teacher, subject.id)) {
    throw new TicketNewSessionError("所选老师没有该科目的授课资质。", 409, "TEACHER_NOT_QUALIFIED");
  }

  const campus = await db.campus.findUnique({ where: { id: input.campusId } });
  if (!campus) throw new TicketNewSessionError("校区不存在。", 404, "CAMPUS_NOT_FOUND");
  if (!input.roomId && campusRequiresRoom(campus)) {
    throw new TicketNewSessionError("该线下校区必须选择教室。", 409, "ROOM_REQUIRED");
  }
  const room = input.roomId ? await db.room.findUnique({ where: { id: input.roomId } }) : null;
  if (input.roomId && (!room || room.campusId !== campus.id)) {
    throw new TicketNewSessionError("教室与校区不匹配。", 409, "ROOM_MISMATCH");
  }

  const endAt = new Date(input.startAt.getTime() + input.durationMin * 60_000);
  const availabilityError = await checkTeacherSchedulingAvailability(db, teacher.id, input.startAt, endAt);
  if (availabilityError) {
    throw new TicketNewSessionError(`老师 availability 不匹配：${availabilityError}`, 409, "AVAIL_CONFLICT");
  }

  const studentConflicts = await db.session.findMany({
    where: {
      startAt: { lt: endAt },
      endAt: { gt: input.startAt },
      OR: [
        { studentId: student.id },
        { class: { oneOnOneStudentId: student.id } },
        { class: { enrollments: { some: { studentId: student.id } } } },
        { attendances: { some: { studentId: student.id } } },
      ],
    },
    select: conflictSelect(),
  });
  if (pickStudentSessionConflict(studentConflicts, student.id)) {
    throw new TicketNewSessionError("学生与其他课程时间冲突。", 409, "STUDENT_CONFLICT");
  }

  const teacherConflicts = await db.session.findMany({
    where: {
      OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      startAt: { lt: endAt },
      endAt: { gt: input.startAt },
    },
    select: conflictSelect(),
  });
  if (pickTeacherSessionConflict(teacherConflicts, student.id)) {
    throw new TicketNewSessionError("老师与其他课程时间冲突。", 409, "TEACHER_CONFLICT");
  }
  const appointment = await db.appointment.findFirst({
    where: { teacherId: teacher.id, startAt: { lt: endAt }, endAt: { gt: input.startAt } },
    select: { id: true },
  });
  if (appointment) throw new TicketNewSessionError("老师与已有预约时间冲突。", 409, "APPOINTMENT_CONFLICT");

  if (room) {
    const roomConflicts = await db.session.findMany({
      where: { class: { roomId: room.id }, startAt: { lt: endAt }, endAt: { gt: input.startAt } },
      select: conflictSelect(),
    });
    if (pickTeacherSessionConflict(roomConflicts)) {
      throw new TicketNewSessionError("教室与其他课程时间冲突。", 409, "ROOM_CONFLICT");
    }
  }

  const packageDecision = await getSchedulablePackageDecision(db, {
    studentId: student.id,
    courseId: subject.courseId,
    at: input.startAt,
    requiredHoursMinutes: input.durationMin,
  });
  if (!packageDecision.ok) {
    throw new TicketNewSessionError(packageDecision.message, 409, packageDecision.code);
  }

  const courseLabel = [subject.course.name, subject.name, level?.name].filter(Boolean).join(" / ");
  const locationText = campus.isOnline ? campus.name : room ? `${campus.name} · ${room.name}` : campus.name;
  return {
    ticket,
    student,
    subject,
    level,
    teacher,
    campus,
    room,
    startAt: input.startAt,
    endAt,
    preview: {
      studentName: student.name,
      courseLabel,
      teacherName: teacher.name,
      locationText,
      scheduleText: `${formatBusinessDateTime(input.startAt)} - ${formatBusinessDateTime(endAt)}`,
      durationMin: input.durationMin,
      ticketNo: ticket?.ticketNo ?? null,
    },
  };
}

export async function getTicketNewSessionOptions(ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
      OR: [
        { type: { in: [...NEW_SESSION_TICKET_TYPES] } },
        { schedulingActions: { some: { actionType: "CREATE_SESSION", status: { notIn: ["APPLIED", "CANCELLED"] } } } },
      ],
    },
    select: { studentId: true, studentName: true },
  });
  if (!ticket) return null;
  let studentId = ticket.studentId;
  if (!studentId) {
    const matches = await prisma.student.findMany({ where: { name: ticket.studentName }, select: { id: true }, take: 2 });
    if (matches.length !== 1) return null;
    studentId = matches[0].id;
  }
  return getStudentNewSessionOptions(studentId);
}

export async function getStudentNewSessionOptions(studentId: string) {
  const now = new Date();
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true, school: true, targetSchool: true, servicePlanType: true },
  });
  if (!student) return null;
  const packages = await prisma.coursePackage.findMany({
    where: {
      OR: [{ studentId }, { sharedStudents: { some: { studentId } } }],
      status: "ACTIVE",
      AND: [
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
        { OR: [{ type: "MONTHLY" }, { remainingMinutes: { gt: 0 } }] },
      ],
    },
    select: {
      course: {
        select: {
          id: true,
          name: true,
          subjects: { select: { id: true, name: true, levels: { select: { id: true, name: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } },
        },
      },
      sharedCourses: {
        select: {
          course: {
            select: {
              id: true,
              name: true,
              subjects: { select: { id: true, name: true, levels: { select: { id: true, name: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const courseMap = new Map<string, (typeof packages)[number]["course"]>();
  for (const pkg of packages) {
    courseMap.set(pkg.course.id, pkg.course);
    for (const shared of pkg.sharedCourses) courseMap.set(shared.course.id, shared.course);
  }
  const subjectIds = Array.from(courseMap.values()).flatMap((course) => course.subjects.map((subject) => subject.id));
  const [teachers, campuses] = await Promise.all([
    prisma.teacher.findMany({
      where: { OR: [{ subjectCourseId: { in: subjectIds } }, { subjects: { some: { id: { in: subjectIds } } } }] },
      select: { id: true, name: true, subjectCourseId: true, subjects: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.campus.findMany({
      select: { id: true, name: true, isOnline: true, requiresRoom: true, rooms: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const [openTickets, upcomingSessions] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        studentId,
        OR: [
          { type: { in: [...NEW_SESSION_TICKET_TYPES] } },
          { schedulingActions: { some: { actionType: "CREATE_SESSION", status: { notIn: ["APPLIED", "CANCELLED"] } } } },
        ],
        isArchived: false,
        status: { notIn: ["Completed", "Cancelled"] },
      },
      select: { id: true, ticketNo: true, type: true, status: true, course: true, owner: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.session.findMany({
      where: {
        startAt: { gte: now },
        OR: [
          { studentId },
          { class: { oneOnOneStudentId: studentId } },
          { class: { enrollments: { some: { studentId } } } },
          { attendances: { some: { studentId } } },
        ],
      },
      select: {
        id: true,
        startAt: true,
        class: {
          select: {
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            teacher: { select: { name: true } },
            campus: { select: { name: true } },
            room: { select: { name: true } },
          },
        },
        teacher: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
      take: 12,
    }),
  ]);
  return {
    student,
    courses: Array.from(courseMap.values()),
    teachers,
    campuses,
    openTickets,
    upcomingSessions: upcomingSessions.map((session) => ({
      id: session.id,
      startText: formatBusinessDateTime(session.startAt),
      courseLabel: [session.class.course?.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ") || "-",
      teacherName: session.teacher?.name ?? session.class.teacher.name,
      locationText: session.class.room?.name ? `${session.class.campus.name} · ${session.class.room.name}` : session.class.campus.name,
    })),
  };
}

export async function previewTicketNewSession(input: TicketNewSessionInput) {
  const checkedRows = [];
  for (const row of schedulingRows(input)) checkedRows.push(await validate(prisma, row));
  const first = checkedRows[0];
  const last = checkedRows[checkedRows.length - 1];
  return {
    ...first,
    checkedRows,
    preview: {
      ...first.preview,
      weeks: checkedRows.length,
      scheduleText: checkedRows.length === 1
        ? first.preview.scheduleText
        : `连续 ${checkedRows.length} 周：${first.preview.scheduleText} 至 ${last.preview.scheduleText}`,
      rows: checkedRows.map((row, index) => ({ index: index + 1, scheduleText: row.preview.scheduleText })),
    },
  };
}

export async function applyTicketNewSession(input: TicketNewSessionInput, actor: Actor) {
  try {
    return await prisma.$transaction(async (tx) => {
      const checkedRows = [];
      for (const row of schedulingRows(input)) checkedRows.push(await validate(tx, row));
      const checked = checkedRows[0];
      let group = await tx.oneOnOneGroup.findFirst({
        where: {
          teacherId: checked.teacher.id,
          courseId: checked.subject.courseId,
          subjectId: checked.subject.id,
          levelId: checked.level?.id ?? null,
          campusId: checked.campus.id,
          roomId: checked.room?.id ?? null,
        },
      });
      if (!group) {
        group = await tx.oneOnOneGroup.create({
          data: {
            teacherId: checked.teacher.id,
            courseId: checked.subject.courseId,
            subjectId: checked.subject.id,
            levelId: checked.level?.id ?? null,
            campusId: checked.campus.id,
            roomId: checked.room?.id ?? null,
          },
        });
      }
      let cls = await tx.class.findFirst({
        where: { oneOnOneGroupId: group.id, capacity: 1, oneOnOneStudentId: checked.student.id },
      });
      if (!cls) {
        cls = await tx.class.create({
          data: {
            teacherId: checked.teacher.id,
            courseId: checked.subject.courseId,
            subjectId: checked.subject.id,
            levelId: checked.level?.id ?? null,
            campusId: checked.campus.id,
            roomId: checked.room?.id ?? null,
            capacity: 1,
            oneOnOneGroupId: group.id,
            oneOnOneStudentId: checked.student.id,
          },
        });
      }
      await tx.enrollment.upsert({
        where: { classId_studentId: { classId: cls.id, studentId: checked.student.id } },
        update: {},
        create: { classId: cls.id, studentId: checked.student.id },
      });
      const sessions = [];
      for (const row of checkedRows) {
        sessions.push(await tx.session.create({
          data: {
            classId: cls.id,
            startAt: row.startAt,
            endAt: row.endAt,
            studentId: checked.student.id,
          },
        }));
      }
      const now = new Date();
      const scheduleText = checkedRows.length === 1
        ? checked.preview.scheduleText
        : `连续 ${checkedRows.length} 周：${checkedRows[0].preview.scheduleText} 至 ${checkedRows[checkedRows.length - 1].preview.scheduleText}`;
      const completionResult = `已完成排课：${scheduleText}；课程：${checked.preview.courseLabel}；老师：${checked.preview.teacherName}；地点：${checked.preview.locationText}。`;
      const actorName = actor.name?.trim() || actor.email;
      let completedTicket = checked.ticket;
      let ticketAllResolved = true;
      if (checked.ticket) {
        const log = `[${formatBusinessDateTime(now)}] ${actorName} · 移动端新排课\n${completionResult}`;
        const previousNotes = String(checked.ticket.risksNotes ?? "").trim();
        const actionState = await applyLinkedTicketSchedulingAction(tx, {
          ticketId: checked.ticket.id,
          actionType: "CREATE_SESSION",
          resultSessionId: sessions[0]?.id ?? null,
          appliedByUserId: actor.userId,
        });
        ticketAllResolved = actionState.allResolved;
        completedTicket = await tx.ticket.update({
          where: { id: checked.ticket.id },
          data: {
            studentId: checked.student.id,
            status: actionState.allResolved ? "Completed" : "Confirmed",
            systemUpdated: "Y",
            finalSchedule: completionResult,
            parentCompletionResult: completionResult,
            nextAction: actionState.allResolved ? "排课已完成，无需继续跟进。" : `本次排课已完成，仍有 ${actionState.unresolved} 个动作待执行。`,
            nextActionDue: actionState.allResolved ? null : checked.ticket.nextActionDue,
            risksNotes: previousNotes ? `${previousNotes}\n\n${log}` : log,
            lastUpdateAt: now,
            completedAt: actionState.allResolved ? now : null,
            completedByUserId: actionState.allResolved ? actor.userId : null,
          },
          include: { student: { select: { id: true, name: true } } },
        });
        if (actionState.allResolved) await tx.parentAvailabilityRequest.updateMany({ where: { ticketId: checked.ticket.id }, data: { isActive: false } });
      }
      await tx.auditLog.createMany({
        data: [
          ...sessions.map((session, index) => ({
            actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
            module: "SCHEDULING",
            action: checked.ticket
              ? sessions.length > 1 ? "MINIAPP_TICKET_NEW_SESSION_SERIES_CREATE" : "MINIAPP_TICKET_NEW_SESSION_CREATE"
              : sessions.length > 1 ? "MINIAPP_DIRECT_NEW_SESSION_SERIES_CREATE" : "MINIAPP_DIRECT_NEW_SESSION_CREATE",
            entityType: "Session", entityId: session.id,
            meta: { ticketId: checked.ticket?.id ?? null, studentId: checked.student.id, weeks: sessions.length, index: index + 1, startAt: session.startAt.toISOString(), endAt: session.endAt.toISOString() },
          })),
          ...(checked.ticket ? [{
            actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
            module: "TICKETS", action: ticketAllResolved ? "MINIAPP_COORDINATION_COMPLETE_AFTER_NEW_SESSION" : "MINIAPP_NEW_SESSION_ACTION_APPLIED", entityType: "Ticket", entityId: checked.ticket.id,
            meta: { sessionIds: sessions.map((session) => session.id), weeks: sessions.length },
          }] : []),
        ],
      });
      return {
        ...checked,
        ticket: completedTicket,
        preview: { ...checked.preview, scheduleText, weeks: sessions.length },
        sessionId: sessions[0].id,
        sessionIds: sessions.map((session) => session.id),
        weeks: sessions.length,
      };
    }, { maxWait: 5000, timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isSessionDuplicateError(error)) throw new TicketNewSessionError("同一课程在该时间已经存在。", 409, "DUPLICATE");
    throw error;
  }
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createTicketNewSessionToken(payload: Omit<TokenPayload, "expiresAt">, secret: string) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyTicketNewSessionToken(token: string, secret: string): TokenPayload | null {
  const [encoded, signature] = String(token ?? "").split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
