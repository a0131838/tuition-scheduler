import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { campusRequiresRoom } from "@/lib/campus";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { recordSchedulingChange } from "@/lib/scheduling-change-history";
import { campusDeliveryMode, checkTeacherDeliveryMode, checkTeacherTravelBuffer } from "@/lib/teacher-delivery-mode";
import { createTicketTeacherConfirmation, finishTicketAfterFormalExecution, urgentTeacherConsentRequired } from "@/lib/ai-ticket-communication";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type MiniappLocationChangeInput = {
  sessionId: string;
  campusId: string;
  roomId: string | null;
  reason: string;
};

type Actor = { userId: string; email: string; name: string | null; role: string };

type TokenPayload = MiniappLocationChangeInput & { userId: string; expiresAt: number };

export class MiniappLocationChangeError extends Error {
  constructor(message: string, public status = 409, public code = "LOCATION_CHANGE_BLOCKED") {
    super(message);
  }
}

const sessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  attendances: true,
  teacher: { select: { id: true, name: true } },
  class: {
    include: {
      course: { select: { name: true } },
      subject: { select: { name: true } },
      level: { select: { name: true } },
      teacher: { select: { id: true, name: true } },
      campus: true,
      room: true,
      enrollments: { select: { studentId: true } },
    },
  },
});

async function sessionContext(db: DbClient, sessionId: string) {
  const session = await db.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
  if (!session) throw new MiniappLocationChangeError("课程不存在或已被删除。", 404, "SESSION_NOT_FOUND");
  return session;
}

function locationText(campus: { name: string; isOnline: boolean }, room: { name: string } | null) {
  return campus.isOnline ? campus.name : room ? `${campus.name} · ${room.name}` : campus.name;
}

export async function listMiniappSessionLocations(sessionId: string) {
  const session = await sessionContext(prisma, sessionId);
  const campuses = await prisma.campus.findMany({
    select: {
      id: true,
      name: true,
      isOnline: true,
      requiresRoom: true,
      rooms: { select: { id: true, name: true, capacity: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return {
    currentCampusId: session.class.campusId,
    currentRoomId: session.class.roomId,
    currentLocationText: locationText(session.class.campus, session.class.room),
    campuses,
  };
}

async function validate(db: DbClient, input: MiniappLocationChangeInput) {
  const session = await sessionContext(db, input.sessionId);
  if (session.startAt <= new Date()) {
    throw new MiniappLocationChangeError("移动端只能更改尚未开始课程的地点。", 409, "PAST_SESSION_BLOCKED");
  }
  if (
    session.attendances.some(
      (row) => row.status !== "UNMARKED" || row.deductedMinutes > 0 || row.deductedCount > 0 || Boolean(row.packageId) || row.excusedCharge
    )
  ) {
    throw new MiniappLocationChangeError("课程已有点名、请假或扣费记录，不能在移动端换地点。", 409, "ATTENDANCE_LOCKED");
  }
  const campus = await db.campus.findUnique({ where: { id: input.campusId } });
  if (!campus) throw new MiniappLocationChangeError("校区不存在。", 404, "CAMPUS_NOT_FOUND");
  if (!input.roomId && campusRequiresRoom(campus)) {
    throw new MiniappLocationChangeError("该线下校区必须选择教室。", 409, "ROOM_REQUIRED");
  }
  const room = input.roomId ? await db.room.findUnique({ where: { id: input.roomId } }) : null;
  if (input.roomId && (!room || room.campusId !== campus.id)) {
    throw new MiniappLocationChangeError("教室与校区不匹配。", 409, "ROOM_MISMATCH");
  }
  if (room && room.capacity < session.class.capacity) {
    throw new MiniappLocationChangeError(`教室容量 ${room.capacity} 小于班级容量 ${session.class.capacity}。`, 409, "ROOM_CAPACITY");
  }
  if (campus.id === session.class.campusId && (room?.id ?? null) === session.class.roomId) {
    throw new MiniappLocationChangeError("请选择不同于当前安排的地点。", 409, "SAME_LOCATION");
  }
  const teacherId = session.teacherId ?? session.class.teacherId;
  const deliveryModeError = await checkTeacherDeliveryMode(db, teacherId, campus);
  if (deliveryModeError) throw new MiniappLocationChangeError(deliveryModeError, 409, "TEACHER_DELIVERY_MODE_MISMATCH");
  const travelBufferError = await checkTeacherTravelBuffer(db, {
    teacherId, sessionId: session.id, startAt: session.startAt, endAt: session.endAt, campus,
  });
  if (travelBufferError) throw new MiniappLocationChangeError(travelBufferError, 409, "TRAVEL_BUFFER_CONFLICT");
  if (room) {
    const conflicts = await db.session.findMany({
      where: {
        id: { not: session.id },
        class: { roomId: room.id },
        startAt: { lt: session.endAt },
        endAt: { gt: session.startAt },
      },
      select: {
        id: true,
        classId: true,
        studentId: true,
        class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
        attendances: { select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true } },
      },
    });
    if (pickTeacherSessionConflict(conflicts)) {
      throw new MiniappLocationChangeError("新教室在该时间已被其他课程占用。", 409, "ROOM_CONFLICT");
    }
  }
  const courseLabel = [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
  return {
    session,
    campus,
    room,
    preview: {
      courseLabel,
      timeText: `${formatBusinessDateTime(session.startAt)} - ${formatBusinessDateTime(session.endAt)}`,
      fromLocationText: locationText(session.class.campus, session.class.room),
      toLocationText: locationText(campus, room),
      reason: input.reason,
    },
  };
}

export async function previewMiniappSessionLocationChange(input: MiniappLocationChangeInput) {
  return validate(prisma, input);
}

export async function applyMiniappSessionLocationChange(input: MiniappLocationChangeInput, actor: Actor, ticketIds: string[] = []) {
  return prisma.$transaction(async (tx) => {
    const checked = await validate(tx, input);
    const source = checked.session.class;
    const locationClass = await tx.class.create({
      data: {
        courseId: source.courseId,
        subjectId: source.subjectId,
        levelId: source.levelId,
        teacherId: source.teacherId,
        campusId: checked.campus.id,
        roomId: checked.room?.id ?? null,
        capacity: source.capacity,
        oneOnOneStudentId: source.oneOnOneStudentId,
      },
    });
    if (source.enrollments.length) {
      await tx.enrollment.createMany({
        data: source.enrollments.map((row) => ({ classId: locationClass.id, studentId: row.studentId })),
        skipDuplicates: true,
      });
    }
    await tx.session.update({ where: { id: checked.session.id }, data: { classId: locationClass.id } });
    await recordSchedulingChange(tx, {
      actor,
      action: "MINIAPP_SESSION_CHANGE_LOCATION",
      sessionId: checked.session.id,
      classId: source.id,
      before: {
        startAt: checked.session.startAt.toISOString(),
        endAt: checked.session.endAt.toISOString(),
        campusName: source.campus.name,
        roomName: source.room?.name ?? null,
      },
      after: {
        startAt: checked.session.startAt.toISOString(),
        endAt: checked.session.endAt.toISOString(),
        campusName: checked.campus.name,
        roomName: checked.room?.name ?? null,
      },
      reason: input.reason,
      source: "MINIAPP",
    });
    const resultText = `已调整课程地点：${checked.preview.timeText}；${checked.preview.fromLocationText} → ${checked.preview.toLocationText}。`;
    const teacherId = checked.session.teacherId ?? checked.session.class.teacherId;
    const requiresTeacherConsent = campusDeliveryMode(checked.campus) === "HOME" || urgentTeacherConsentRequired(checked.session.startAt);
    for (const ticketId of Array.from(new Set(ticketIds))) {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, isArchived: false, status: { notIn: ["Completed", "Cancelled"] } },
        select: { id: true, risksNotes: true },
      });
      if (!ticket) throw new MiniappLocationChangeError("地点变更工单已变化，请重新预检。", 409, "TICKET_PREVIEW_STALE");
      await createTicketTeacherConfirmation(tx, {
        ticketId, teacherId, managerUserId: actor.userId, sessionId: checked.session.id,
        title: requiresTeacherConsent ? "课程地点变更待同意" : "课程地点变更通知",
        detail: requiresTeacherConsent ? `${resultText}\n这是临近开课或上门安排，请确认可以执行。` : `${resultText}\n变更已生效，请确认已知悉。`,
        mode: requiresTeacherConsent ? "CONSENT" : "NOTICE",
      });
      await finishTicketAfterFormalExecution(tx, {
        ticketId, resultText, actorUserId: actor.userId, risksNotes: String(ticket.risksNotes ?? ""),
        logLabel: `${actor.name?.trim() || actor.email} · 移动端改地点`, requiresTeacherConsent,
      });
    }
    return { preview: checked.preview, classId: locationClass.id };
  }, { maxWait: 5000, timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createMiniappLocationChangeToken(payload: Omit<TokenPayload, "expiresAt">, secret: string) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyMiniappLocationChangeToken(token: string, secret: string): TokenPayload | null {
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
