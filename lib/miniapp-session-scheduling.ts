import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { campusRequiresRoom } from "@/lib/campus";
import { formatBusinessDateTime } from "@/lib/date-only";
import { applyLinkedTicketSchedulingAction } from "@/lib/ticket-scheduling-action-write";
import { createTicketTeacherConfirmation, finishTicketAfterFormalExecution, urgentTeacherConsentRequired } from "@/lib/ai-ticket-communication";
import { prisma } from "@/lib/prisma";
import { getSchedulablePackageDecision } from "@/lib/scheduling-package";
import { schedulingCoordinationCourseLabelsMatch } from "@/lib/scheduling-coordination";
import { pickStudentSessionConflict, pickTeacherSessionConflict } from "@/lib/session-conflict";
import { isSessionDuplicateError } from "@/lib/session-unique";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";
import { campusDeliveryMode, checkTeacherDeliveryMode, checkTeacherTravelBuffer } from "@/lib/teacher-delivery-mode";
import { SCHEDULING_COORDINATION_TICKET_TYPE } from "@/lib/tickets";

export type MiniappSchedulingAction = "create" | "reschedule";

type DbClient = typeof prisma | Prisma.TransactionClient;

type SchedulingInput = {
  action: MiniappSchedulingAction;
  sessionId: string;
  startAt: Date;
  durationMin: number;
  campusId?: string;
  roomId?: string | null;
  reason?: string;
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

export type MiniappSeriesSchedulingInput = {
  sessionId: string;
  startAt: Date;
  durationMin: number;
  weeks: number;
};

export type MiniappSeriesSchedulingTokenPayload = {
  userId: string;
  sessionId: string;
  startAt: string;
  durationMin: number;
  weeks: number;
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

function targetLocationText(campus: { name: string; isOnline: boolean }, room: { name: string } | null) {
  if (campus.isOnline) return campus.name || "线上";
  return room?.name ? `${campus.name} · ${room.name}` : campus.name;
}

async function createLocationClass(db: Prisma.TransactionClient, checked: Awaited<ReturnType<typeof validateScheduling>>) {
  if (!checked.locationChanged) return checked.session.classId;
  const source = checked.session.class;
  const locationClass = await db.class.create({
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
    await db.enrollment.createMany({
      data: source.enrollments.map((row) => ({ classId: locationClass.id, studentId: row.studentId })),
      skipDuplicates: true,
    });
  }
  return locationClass.id;
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

async function openCoordinationTickets(
  db: DbClient,
  studentIds: string[],
  expectedCourseLabel: string,
  action: MiniappSchedulingAction,
  sourceSessionId: string
) {
  const ticketTypes =
    action === "create"
      ? [SCHEDULING_COORDINATION_TICKET_TYPE, "新排课", "补课加课"]
      : [SCHEDULING_COORDINATION_TICKET_TYPE, "改课程时间"];
  const rows = await db.ticket.findMany({
    where: {
      studentId: { in: studentIds },
      OR: action === "reschedule"
        ? [
            { schedulingActions: { some: { actionType: "RESCHEDULE_SESSION", sourceSessionId, status: { notIn: ["APPLIED", "CANCELLED"] } } } },
            { type: { in: ticketTypes }, schedulingActions: { none: {} } },
          ]
        : [
            { schedulingActions: { some: { actionType: "CREATE_SESSION", status: { notIn: ["APPLIED", "CANCELLED"] } } } },
            { type: { in: ticketTypes }, schedulingActions: { none: {} } },
          ],
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

  const campus = input.campusId
    ? await db.campus.findUnique({ where: { id: input.campusId } })
    : session.class.campus;
  if (!campus) throw new MiniappSchedulingError("目标校区不存在。", 404, "CAMPUS_NOT_FOUND");
  const roomId = input.campusId ? input.roomId ?? null : session.class.roomId;
  const room = roomId ? await db.room.findUnique({ where: { id: roomId } }) : null;
  if (roomId && (!room || room.campusId !== campus.id)) {
    throw new MiniappSchedulingError("目标教室与校区不匹配。", 409, "ROOM_MISMATCH");
  }
  if (!roomId && campusRequiresRoom(campus)) {
    throw new MiniappSchedulingError("目标线下校区必须选择教室。", 409, "ROOM_REQUIRED");
  }
  if (room && room.capacity < session.class.capacity) {
    throw new MiniappSchedulingError(`目标教室容量 ${room.capacity} 小于班级容量 ${session.class.capacity}。`, 409, "ROOM_CAPACITY");
  }
  const locationChanged = campus.id !== session.class.campusId || (room?.id ?? null) !== session.class.roomId;

  const availabilityError = await checkTeacherSchedulingAvailability(db, teacherId, input.startAt, endAt);
  if (availabilityError) {
    throw new MiniappSchedulingError(`老师 availability 不匹配：${availabilityError}`, 409, "AVAIL_CONFLICT");
  }
  const deliveryModeError = await checkTeacherDeliveryMode(db, teacherId, campus);
  if (deliveryModeError) throw new MiniappSchedulingError(deliveryModeError, 409, "TEACHER_DELIVERY_MODE_MISMATCH");
  const travelBufferError = await checkTeacherTravelBuffer(db, {
    teacherId,
    sessionId: input.action === "reschedule" ? session.id : null,
    startAt: input.startAt,
    endAt,
    campus,
  });
  if (travelBufferError) throw new MiniappSchedulingError(travelBufferError, 409, "TRAVEL_BUFFER_CONFLICT");

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
  const coordinationTickets = await openCoordinationTickets(db, studentIds, expectedCourseLabel, input.action, input.sessionId);

  return {
    session,
    campus,
    room,
    locationChanged,
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
      locationText: targetLocationText(campus, room),
      beforeLocationText: locationText(session),
      locationChanged,
      reason: input.reason?.trim() || null,
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

function validateBatchRescheduleRows(rows: Awaited<ReturnType<typeof validateScheduling>>[]) {
  for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
    const left = rows[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < rows.length; rightIndex += 1) {
      const right = rows[rightIndex];
      if (left.startAt >= right.endAt || right.startAt >= left.endAt) continue;
      if (left.teacherId === right.teacherId) throw new MiniappSchedulingError("整批改课后的老师时间互相冲突。", 409, "BATCH_TEACHER_CONFLICT");
      if (left.students.some((student) => right.students.some((other) => other.id === student.id))) {
        throw new MiniappSchedulingError("整批改课后的学生时间互相冲突。", 409, "BATCH_STUDENT_CONFLICT");
      }
      const leftRoom = left.room?.id ?? null;
      if (leftRoom && leftRoom === (right.room?.id ?? null)) throw new MiniappSchedulingError("整批改课后的教室时间互相冲突。", 409, "BATCH_ROOM_CONFLICT");
    }
  }
}

export async function previewMiniappSessionReschedulingBatch(inputs: SchedulingInput[]) {
  if (inputs.length < 2 || inputs.length > 64 || inputs.some((input) => input.action !== "reschedule")) {
    throw new MiniappSchedulingError("整批改课必须包含 2 到 64 节课程。", 409, "INVALID_BATCH");
  }
  if (new Set(inputs.map((input) => input.sessionId)).size !== inputs.length) {
    throw new MiniappSchedulingError("整批改课包含重复课次。", 409, "DUPLICATE_BATCH_SESSION");
  }
  const rows: Awaited<ReturnType<typeof validateScheduling>>[] = [];
  for (const input of inputs) rows.push(await validateScheduling(prisma, input));
  validateBatchRescheduleRows(rows);
  return { rows, preview: { action: "reschedule", actionLabel: "整批修改课程", commandCount: rows.length, rows: rows.map((row) => row.preview) } };
}

export async function applyMiniappSessionReschedulingBatch(
  inputs: SchedulingInput[], actor: SchedulingActor, completeCoordinationTicketIds: string[] = []
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const rows: Awaited<ReturnType<typeof validateScheduling>>[] = [];
      for (const input of inputs) rows.push(await validateScheduling(tx, input));
      validateBatchRescheduleRows(rows);
      const requestedTicketIds = Array.from(new Set(completeCoordinationTicketIds));
      const eligibleTicketIds = new Set(rows.flatMap((row) => row.coordinationTickets.map((ticket) => ticket.id)));
      if (requestedTicketIds.some((ticketId) => !eligibleTicketIds.has(ticketId))) {
        throw new MiniappSchedulingError("排课协调工单已变化，请重新检查冲突。", 409, "COORDINATION_PREVIEW_STALE");
      }
      const writtenSessionIds: string[] = [];
      for (const row of rows) {
        const classId = await createLocationClass(tx, row);
        const updated = await tx.session.update({ where: { id: row.session.id }, data: { startAt: row.startAt, endAt: row.endAt, classId } });
        writtenSessionIds.push(updated.id);
      }
      await tx.auditLog.createMany({ data: rows.map((row, index) => ({
        actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
        module: "SCHEDULING", action: "MINIAPP_SESSION_RESCHEDULE_BATCH", entityType: "Session", entityId: writtenSessionIds[index],
        meta: { ticketIds: requestedTicketIds, batchSize: rows.length, index: index + 1, sourceSessionId: row.session.id, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() },
      })) });
      const completedCoordinationTickets: Array<{ id: string; ticketNo: string; studentId: string | null; studentName: string; parentVisible: boolean; updatedAt: Date }> = [];
      const now = new Date();
      const actorName = actor.name?.trim() || actor.email;
      const completionResult = `已完成整批改课：共 ${rows.length} 节；${rows[0].preview.afterText} 至 ${rows[rows.length - 1].preview.afterText}。`;
      const requiresTeacherConsent = rows.some((row) => urgentTeacherConsentRequired(row.startAt) || campusDeliveryMode(row.campus) === "HOME");
      const tickets = new Map(rows.flatMap((row) => row.coordinationTickets).map((ticket) => [ticket.id, ticket]));
      for (const ticketId of requestedTicketIds) {
        const ticket = tickets.get(ticketId);
        if (!ticket) continue;
        const log = `[${formatBusinessDateTime(now)}] ${actorName} · 移动端整批改课\n${completionResult}`;
        let actionState: Awaited<ReturnType<typeof applyLinkedTicketSchedulingAction>> | null = null;
        for (let index = 0; index < rows.length; index += 1) {
          actionState = await applyLinkedTicketSchedulingAction(tx, {
            ticketId: ticket.id,
            actionType: "RESCHEDULE_SESSION",
            sourceSessionId: rows[index].session.id,
            resultSessionId: writtenSessionIds[index],
            appliedByUserId: actor.userId,
          });
        }
        for (const row of Array.from(new Map(rows.map((item, index) => [item.teacherId, { row: item, sessionId: writtenSessionIds[index] }])).values())) {
          await createTicketTeacherConfirmation(tx, {
            ticketId: ticket.id,
            teacherId: row.row.teacherId,
            managerUserId: actor.userId,
            sessionId: row.sessionId,
            title: requiresTeacherConsent ? "整批改课待同意" : "整批改课通知",
            detail: requiresTeacherConsent ? `${completionResult}\n包含临近开课课程，请确认同意调整。` : `${completionResult}\n调整已生效，请确认已知悉。`,
            mode: requiresTeacherConsent ? "CONSENT" : "NOTICE",
          });
        }
        if (actionState?.allResolved) {
          await finishTicketAfterFormalExecution(tx, {
            ticketId: ticket.id,
            resultText: completionResult,
            actorUserId: actor.userId,
            risksNotes: ticket.risksNotes,
            logLabel: `${actorName} · 移动端整批改课`,
            requiresTeacherConsent,
          });
        } else {
          await tx.ticket.update({ where: { id: ticket.id }, data: {
            status: "Confirmed", systemUpdated: "Y", finalSchedule: completionResult, parentCompletionResult: completionResult,
            nextAction: `本次整批改课已完成，仍有 ${actionState?.unresolved ?? 0} 个动作待执行。`,
            nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            risksNotes: ticket.risksNotes ? `${ticket.risksNotes}\n\n${log}` : log,
            lastUpdateAt: now, completedAt: null, completedByUserId: null,
          } });
        }
        await tx.auditLog.create({ data: {
          actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
          module: "TICKETS", action: actionState?.allResolved ? "MINIAPP_COORDINATION_WAITING_TEACHER_AFTER_BATCH_RESCHEDULE" : "MINIAPP_BATCH_RESCHEDULE_ACTION_APPLIED", entityType: "Ticket", entityId: ticket.id,
          meta: { sessionIds: writtenSessionIds, batchSize: rows.length },
        } });
      }
      return { rows, writtenSessionIds, completedCoordinationTickets, preview: { action: "reschedule", actionLabel: "整批修改课程", commandCount: rows.length, rows: rows.map((row) => row.preview) } };
    }, { maxWait: 5000, timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isSessionDuplicateError(error)) throw new MiniappSchedulingError("同一课程在该时间已经存在。", 409, "DUPLICATE");
    throw error;
  }
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
          const classId = await createLocationClass(tx, checked);
          const updated = await tx.session.update({
            where: { id: checked.session.id },
            data: { startAt: checked.startAt, endAt: checked.endAt, classId },
          });
          writtenSessionId = updated.id;
        } else {
          const teacherOverride = checked.teacherId === checked.session.class.teacherId ? null : checked.teacherId;
          const created = await tx.session.create({
            data: {
              classId: await createLocationClass(tx, checked),
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
              fromCampusId: checked.session.class.campusId,
              fromRoomId: checked.session.class.roomId,
              toCampusId: checked.campus.id,
              toRoomId: checked.room?.id ?? null,
              reason: input.reason?.trim() || null,
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
            const actionState = await applyLinkedTicketSchedulingAction(tx, {
              ticketId: ticket.id,
              actionType: input.action === "reschedule" ? "RESCHEDULE_SESSION" : "CREATE_SESSION",
              sourceSessionId: input.sessionId,
              resultSessionId: writtenSessionId,
              appliedByUserId: actor.userId,
            });
            const requiresTeacherConsent = urgentTeacherConsentRequired(checked.startAt) || campusDeliveryMode(checked.campus) === "HOME";
            await createTicketTeacherConfirmation(tx, { ticketId: ticket.id, teacherId: checked.teacherId, managerUserId: actor.userId, sessionId: writtenSessionId, title: requiresTeacherConsent ? "课程安排待同意" : "课程安排通知", detail: requiresTeacherConsent ? `${completionResult}\n临近开课，请确认同意调整。` : `${completionResult}\n安排已生效，请确认已知悉。`, mode: requiresTeacherConsent ? "CONSENT" : "NOTICE" });
            if (actionState.allResolved) {
              await finishTicketAfterFormalExecution(tx, { ticketId: ticket.id, resultText: completionResult, actorUserId: actor.userId, risksNotes: previousNotes, logLabel: `${actorName} · 移动排课`, requiresTeacherConsent });
            } else {
              await tx.ticket.update({ where: { id: ticket.id }, data: { status: "Confirmed", systemUpdated: "Y", finalSchedule: completionResult, parentCompletionResult: completionResult, nextAction: `本次排课已完成，仍有 ${actionState.unresolved} 个动作待执行。`, nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000), risksNotes: previousNotes ? `${previousNotes}\n\n${coordinationLog}` : coordinationLog, lastUpdateAt: now, completedAt: null, completedByUserId: null } });
            }
            await tx.auditLog.create({
              data: {
                actorEmail: actor.email.trim().toLowerCase(),
                actorName: actor.name?.trim() || null,
                actorRole: actor.role,
                module: "TICKETS",
                action: actionState.allResolved ? "MINIAPP_COORDINATION_WAITING_TEACHER_AFTER_SCHEDULING" : "MINIAPP_SCHEDULING_ACTION_APPLIED",
                entityType: "Ticket",
                entityId: ticket.id,
                meta: { sessionId: writtenSessionId, sourceSessionId: input.sessionId },
              },
            });
            if (actionState.allResolved && !requiresTeacherConsent) completedCoordinationTickets.push({
              id: ticket.id,
              ticketNo: ticket.ticketNo,
              studentId: ticket.studentId,
              studentName: ticket.studentName,
              parentVisible: ticket.parentVisible,
              updatedAt: now,
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

function seriesRows(input: MiniappSeriesSchedulingInput) {
  if (!Number.isInteger(input.weeks) || input.weeks < 2 || input.weeks > 12) {
    throw new MiniappSchedulingError("连续排课周数必须在 2 到 12 周之间。", 409, "INVALID_WEEKS");
  }
  return Array.from({ length: input.weeks }, (_, index) => ({
    action: "create" as const,
    sessionId: input.sessionId,
    startAt: new Date(input.startAt.getTime() + index * 7 * 24 * 60 * 60 * 1000),
    durationMin: input.durationMin,
  }));
}

export async function previewMiniappSessionSeries(input: MiniappSeriesSchedulingInput) {
  const checkedRows = [];
  for (const row of seriesRows(input)) checkedRows.push(await validateScheduling(prisma, row));
  const first = checkedRows[0];
  const last = checkedRows[checkedRows.length - 1];
  return {
    checkedRows,
    preview: {
      actionLabel: "连续新增课程",
      courseLabel: first.preview.courseLabel,
      teacherName: first.preview.teacherName,
      studentText: first.preview.studentText,
      locationText: first.preview.locationText,
      weeks: input.weeks,
      durationMin: input.durationMin,
      firstText: first.preview.afterText,
      lastText: last.preview.afterText,
      rows: checkedRows.map((row, index) => ({ index: index + 1, timeText: row.preview.afterText })),
      coordinationTickets: first.preview.coordinationTickets,
    },
  };
}

export async function applyMiniappSessionSeries(
  input: MiniappSeriesSchedulingInput,
  actor: SchedulingActor,
  completeCoordinationTicketIds: string[] = []
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const checkedRows = [];
      for (const row of seriesRows(input)) checkedRows.push(await validateScheduling(tx, row));
      const first = checkedRows[0];
      const requestedTicketIds = Array.from(new Set(completeCoordinationTicketIds));
      const eligibleIds = new Set(first.coordinationTickets.map((ticket) => ticket.id));
      if (requestedTicketIds.some((ticketId) => !eligibleIds.has(ticketId))) {
        throw new MiniappSchedulingError("排课工单已变化，请重新检查整批课程。", 409, "COORDINATION_PREVIEW_STALE");
      }
      const sessionIds: string[] = [];
      for (const checked of checkedRows) {
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
        sessionIds.push(created.id);
        await tx.auditLog.create({
          data: {
            actorEmail: actor.email.trim().toLowerCase(),
            actorName: actor.name?.trim() || null,
            actorRole: actor.role,
            module: "SCHEDULING",
            action: "MINIAPP_SESSION_SERIES_CREATE",
            entityType: "Session",
            entityId: created.id,
            meta: { sourceSessionId: input.sessionId, weeks: input.weeks, startAt: checked.startAt.toISOString(), endAt: checked.endAt.toISOString() },
          },
        });
      }
      const completedCoordinationTickets = [];
      if (requestedTicketIds.length) {
        const now = new Date();
        const actorName = actor.name?.trim() || actor.email;
        const firstText = checkedRows[0].preview.afterText;
        const lastText = checkedRows[checkedRows.length - 1].preview.afterText;
      const completionResult = `已连续排课 ${input.weeks} 周：首节 ${firstText}；末节 ${lastText}；老师：${first.preview.teacherName}；地点：${first.preview.locationText}。`;
      const requiresTeacherConsent = checkedRows.some((row) => urgentTeacherConsentRequired(row.startAt) || campusDeliveryMode(row.campus) === "HOME");
        for (const ticket of first.coordinationTickets.filter((row) => requestedTicketIds.includes(row.id))) {
          const log = `[${formatBusinessDateTime(now)}] ${actorName} · 移动连续排课\n${completionResult}`;
          const previousNotes = String(ticket.risksNotes ?? "").trim();
          const actionState = await applyLinkedTicketSchedulingAction(tx, {
            ticketId: ticket.id,
            actionType: "CREATE_SESSION",
            sourceSessionId: input.sessionId,
            resultSessionId: sessionIds[0] ?? null,
            appliedByUserId: actor.userId,
          });
          await createTicketTeacherConfirmation(tx, { ticketId: ticket.id, teacherId: first.teacherId, managerUserId: actor.userId, title: requiresTeacherConsent ? "连续课程安排待同意" : "连续课程安排通知", detail: requiresTeacherConsent ? `${completionResult}\n包含临近开课课程，请确认同意整批安排。` : `${completionResult}\n整批安排已生效，请确认已知悉。`, mode: requiresTeacherConsent ? "CONSENT" : "NOTICE" });
          if (actionState.allResolved) {
            await finishTicketAfterFormalExecution(tx, { ticketId: ticket.id, resultText: completionResult, actorUserId: actor.userId, risksNotes: previousNotes, logLabel: `${actorName} · 移动连续排课`, requiresTeacherConsent });
          } else {
            await tx.ticket.update({ where: { id: ticket.id }, data: { status: "Confirmed", systemUpdated: "Y", finalSchedule: completionResult, parentCompletionResult: completionResult, nextAction: `连续排课已完成，仍有 ${actionState.unresolved} 个动作待执行。`, nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000), risksNotes: previousNotes ? `${previousNotes}\n\n${log}` : log, lastUpdateAt: now, completedAt: null, completedByUserId: null } });
          }
          await tx.auditLog.create({
            data: {
              actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name?.trim() || null, actorRole: actor.role,
              module: "TICKETS", action: actionState.allResolved ? "MINIAPP_COORDINATION_WAITING_TEACHER_AFTER_SERIES_SCHEDULING" : "MINIAPP_SERIES_SCHEDULING_ACTION_APPLIED",
              entityType: "Ticket", entityId: ticket.id, meta: { sessionIds, sourceSessionId: input.sessionId },
            },
          });
          if (actionState.allResolved && !requiresTeacherConsent) completedCoordinationTickets.push({
            id: ticket.id, ticketNo: ticket.ticketNo, studentId: ticket.studentId,
            studentName: ticket.studentName, parentVisible: ticket.parentVisible, updatedAt: now,
          });
        }
      }
      return { sessionIds, checkedRows, completedCoordinationTickets };
    }, { maxWait: 5000, timeout: 30000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (isSessionDuplicateError(error)) throw new MiniappSchedulingError("连续排课中存在重复课程。", 409, "DUPLICATE");
    throw error;
  }
}

export function createMiniappSeriesSchedulingToken(
  payload: Omit<MiniappSeriesSchedulingTokenPayload, "expiresAt">,
  secret: string
) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${encoded}.${signPart(encoded, secret)}`;
}

export function verifyMiniappSeriesSchedulingToken(token: string, secret: string): MiniappSeriesSchedulingTokenPayload | null {
  const [encoded, signature] = String(token ?? "").split(".");
  if (!encoded || !signature) return null;
  const expected = signPart(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MiniappSeriesSchedulingTokenPayload;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
