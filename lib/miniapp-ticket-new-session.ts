import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { campusRequiresRoom } from "@/lib/campus";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import { pickStudentSessionConflict, pickTeacherSessionConflict } from "@/lib/session-conflict";
import { isSessionDuplicateError } from "@/lib/session-unique";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type TicketNewSessionInput = {
  ticketId: string;
  subjectId: string;
  levelId: string | null;
  teacherId: string;
  campusId: string;
  roomId: string | null;
  startAt: Date;
  durationMin: number;
};

type Actor = { userId: string; email: string; name: string | null; role: string };

type TokenPayload = {
  userId: string;
  ticketId: string;
  subjectId: string;
  levelId: string | null;
  teacherId: string;
  campusId: string;
  roomId: string | null;
  startAt: string;
  durationMin: number;
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

async function validate(db: DbClient, input: TicketNewSessionInput) {
  if (!Number.isFinite(input.durationMin) || input.durationMin < 15 || input.durationMin > 360) {
    throw new TicketNewSessionError("课程时长必须在 15 到 360 分钟之间。", 409, "INVALID_DURATION");
  }
  if (Number.isNaN(input.startAt.getTime()) || input.startAt.getTime() < Date.now()) {
    throw new TicketNewSessionError("请选择未来的有效上课时间。", 409, "INVALID_START_AT");
  }

  const ticket = await db.ticket.findFirst({
    where: {
      id: input.ticketId,
      type: { in: ["新排课", "补课加课", "排课协调"] },
      isArchived: false,
      status: { notIn: ["Completed", "Cancelled"] },
    },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!ticket) throw new TicketNewSessionError("工单不存在或已完成。", 404, "TICKET_NOT_FOUND");
  let student = ticket.student;
  if (!student) {
    const matches = await db.student.findMany({ where: { name: ticket.studentName }, select: { id: true, name: true }, take: 2 });
    if (matches.length !== 1) {
      throw new TicketNewSessionError("工单尚未关联唯一学生，请先在电脑端补充学生关联。", 409, "STUDENT_LINK_REQUIRED");
    }
    student = matches[0];
  }

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
    endAt,
    preview: {
      studentName: student.name,
      courseLabel,
      teacherName: teacher.name,
      locationText,
      scheduleText: `${formatBusinessDateTime(input.startAt)} - ${formatBusinessDateTime(endAt)}`,
      durationMin: input.durationMin,
      ticketNo: ticket.ticketNo,
    },
  };
}

export async function getTicketNewSessionOptions(ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, type: { in: ["新排课", "补课加课", "排课协调"] }, isArchived: false },
    select: { studentId: true, studentName: true },
  });
  if (!ticket) return null;
  let studentId = ticket.studentId;
  if (!studentId) {
    const matches = await prisma.student.findMany({ where: { name: ticket.studentName }, select: { id: true }, take: 2 });
    if (matches.length !== 1) return null;
    studentId = matches[0].id;
  }
  const now = new Date();
  const packages = await prisma.coursePackage.findMany({
    where: {
      studentId,
      status: "ACTIVE",
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
    select: {
      course: {
        select: {
          id: true,
          name: true,
          subjects: { select: { id: true, name: true, levels: { select: { id: true, name: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const courseMap = new Map(packages.map((row) => [row.course.id, row.course]));
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
  return { courses: Array.from(courseMap.values()), teachers, campuses };
}

export async function previewTicketNewSession(input: TicketNewSessionInput) {
  return validate(prisma, input);
}

export async function applyTicketNewSession(input: TicketNewSessionInput, actor: Actor) {
  try {
    return await prisma.$transaction(async (tx) => {
      const checked = await validate(tx, input);
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
      const session = await tx.session.create({
        data: {
          classId: cls.id,
          startAt: input.startAt,
          endAt: checked.endAt,
          studentId: checked.student.id,
        },
      });
      const now = new Date();
      const completionResult = `已完成排课：${checked.preview.scheduleText}；课程：${checked.preview.courseLabel}；老师：${checked.preview.teacherName}；地点：${checked.preview.locationText}。`;
      const actorName = actor.name?.trim() || actor.email;
      const log = `[${formatBusinessDateTime(now)}] ${actorName} · 移动端新排课\n${completionResult}`;
      const previousNotes = String(checked.ticket.risksNotes ?? "").trim();
      await tx.ticket.update({
        where: { id: checked.ticket.id },
        data: {
          studentId: checked.student.id,
          status: "Completed",
          systemUpdated: "Y",
          finalSchedule: completionResult,
          parentCompletionResult: completionResult,
          nextAction: "排课已完成，无需继续跟进。",
          nextActionDue: null,
          risksNotes: previousNotes ? `${previousNotes}\n\n${log}` : log,
          lastUpdateAt: now,
          completedAt: now,
          completedByUserId: actor.userId,
        },
      });
      await tx.parentAvailabilityRequest.updateMany({ where: { ticketId: checked.ticket.id }, data: { isActive: false } });
      await tx.auditLog.createMany({
        data: [
          {
            actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
            module: "SCHEDULING", action: "MINIAPP_TICKET_NEW_SESSION_CREATE", entityType: "Session", entityId: session.id,
            meta: { ticketId: checked.ticket.id, startAt: input.startAt.toISOString(), endAt: checked.endAt.toISOString() },
          },
          {
            actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
            module: "TICKETS", action: "MINIAPP_COORDINATION_COMPLETE_AFTER_NEW_SESSION", entityType: "Ticket", entityId: checked.ticket.id,
            meta: { sessionId: session.id },
          },
        ],
      });
      return { ...checked, sessionId: session.id };
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
