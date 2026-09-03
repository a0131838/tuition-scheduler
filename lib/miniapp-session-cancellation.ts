import crypto from "crypto";
import { PackageStatus, PackageType, Prisma } from "@prisma/client";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import {
  packageModeFromNote,
  packageModeSupportsClass,
  pickPreferredActivePackage,
  type PackageMode,
} from "@/lib/package-mode";
import { formatBusinessDateTime } from "@/lib/date-only";
import { applyLinkedTicketSchedulingAction } from "@/lib/ticket-scheduling-action-write";
import { createTicketTeacherConfirmation, finishTicketAfterFormalExecution } from "@/lib/ai-ticket-communication";
import { prisma } from "@/lib/prisma";
import { schedulingCoordinationCourseLabelsMatch } from "@/lib/scheduling-coordination";
import { getSessionStudents } from "@/lib/session-students";
import { recordSchedulingChange } from "@/lib/scheduling-change-history";

type DbClient = typeof prisma | Prisma.TransactionClient;

type CancellationPackageMode = PackageMode | "MONTHLY";

export function resolveCancellationDeduction(
  mode: CancellationPackageMode,
  durationMin: number
) {
  if (mode === "MONTHLY") return { units: 0, deductedMinutes: 0, deductedCount: 0 };
  if (mode === "GROUP_COUNT") return { units: 1, deductedMinutes: 0, deductedCount: 1 };
  const minutes = Math.max(1, Math.round(durationMin));
  return { units: minutes, deductedMinutes: minutes, deductedCount: 0 };
}

export type MiniappCancellationInput = {
  sessionId: string;
  studentId: string;
  charge: boolean;
  note: string;
};

type CancellationActor = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
};

export type MiniappCancellationPreviewTokenPayload = MiniappCancellationInput & {
  userId: string;
  ticketIds: string[];
  expiresAt: number;
};

export class MiniappCancellationError extends Error {
  constructor(
    message: string,
    public status = 409,
    public code = "CANCELLATION_BLOCKED"
  ) {
    super(message);
  }
}

const cancellationSessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  student: { select: { id: true, name: true } },
  attendances: true,
  teacher: { select: { id: true, name: true } },
  class: {
    include: {
      course: { select: { id: true, name: true } },
      subject: { select: { name: true } },
      level: { select: { name: true } },
      teacher: { select: { id: true, name: true } },
      campus: { select: { name: true, isOnline: true } },
      room: { select: { name: true } },
      oneOnOneStudent: { select: { id: true, name: true } },
      enrollments: { include: { student: { select: { id: true, name: true } } } },
    },
  },
});

function courseLabel(session: Prisma.SessionGetPayload<{ include: typeof cancellationSessionInclude }>) {
  return [session.class.course.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
}

function locationText(session: Prisma.SessionGetPayload<{ include: typeof cancellationSessionInclude }>) {
  const campus = session.class.campus;
  if (campus.isOnline) return campus.name;
  return session.class.room?.name ? `${campus.name} · ${session.class.room.name}` : campus.name;
}

async function validateCancellation(db: DbClient, input: MiniappCancellationInput) {
  const session = await db.session.findUnique({ where: { id: input.sessionId }, include: cancellationSessionInclude });
  if (!session) throw new MiniappCancellationError("课程不存在或已被删除。", 404, "SESSION_NOT_FOUND");
  if (session.startAt <= new Date()) {
    throw new MiniappCancellationError("移动端只能处理尚未开始的课程。", 409, "PAST_SESSION_BLOCKED");
  }
  const student = getSessionStudents(session).find((row) => row.id === input.studentId);
  if (!student) throw new MiniappCancellationError("学生不在本节课程中。", 409, "STUDENT_NOT_IN_SESSION");

  const attendance = session.attendances.find((row) => row.studentId === input.studentId) ?? null;
  if (attendance?.status === "EXCUSED") {
    throw new MiniappCancellationError("该学生已经完成请假/取消处理。", 409, "ALREADY_EXCUSED");
  }
  if (
    attendance &&
    (attendance.status !== "UNMARKED" ||
      attendance.deductedMinutes > 0 ||
      attendance.deductedCount > 0 ||
      attendance.packageId ||
      attendance.excusedCharge)
  ) {
    throw new MiniappCancellationError("课程已有点名或扣费记录，不能在移动端取消。", 409, "ATTENDANCE_LOCKED");
  }

  const durationMin = Math.max(1, Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60_000));
  let packageId: string | null = null;
  let packageMode: CancellationPackageMode | null = null;
  let deduction = { units: 0, deductedMinutes: 0, deductedCount: 0 };
  if (input.charge) {
    const isGroupClass = session.class.capacity !== 1;
    const candidates = await db.coursePackage.findMany({
      where: {
        AND: [
          coursePackageAccessibleByStudent(input.studentId),
          coursePackageMatchesCourse(session.class.courseId),
          { status: PackageStatus.ACTIVE },
          { validFrom: { lte: session.startAt } },
          { OR: [{ validTo: null }, { validTo: { gte: session.startAt } }] },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
      select: { id: true, type: true, note: true, remainingMinutes: true },
    });
    const eligible = candidates.map((pkg) => {
      const mode: CancellationPackageMode = pkg.type === PackageType.MONTHLY ? "MONTHLY" : packageModeFromNote(pkg.note);
      const resolved = resolveCancellationDeduction(mode, durationMin);
      const modeMatches = mode === "MONTHLY" || packageModeSupportsClass(mode, isGroupClass);
      return { ...pkg, mode, deduction: resolved, modeMatches };
    }).filter((pkg) => pkg.modeMatches && (pkg.mode === "MONTHLY" || (pkg.remainingMinutes ?? 0) >= pkg.deduction.units));
    const pkg = pickPreferredActivePackage(eligible, isGroupClass);
    packageId = pkg?.id ?? null;
    packageMode = pkg?.mode ?? null;
    deduction = pkg?.deduction ?? deduction;
    if (!packageId) {
      throw new MiniappCancellationError("没有可扣除本节课时的有效课包。", 409, "NO_CHARGEABLE_PACKAGE");
    }
  }

  const expectedCourseLabel = courseLabel(session);
  const ticketRows = await db.ticket.findMany({
    where: {
      studentId: input.studentId,
      OR: [
        { schedulingActions: { some: { actionType: "CANCEL_SESSION", sourceSessionId: session.id, status: { notIn: ["APPLIED", "CANCELLED"] } } } },
        { type: "临时取消&请假课程", schedulingActions: { none: {} } },
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
  const tickets = ticketRows.filter((ticket) =>
    schedulingCoordinationCourseLabelsMatch(
      ticket.parentAvailabilityRequest?.courseLabel ?? ticket.course,
      expectedCourseLabel
    )
  );

  return {
    session,
    student,
    attendance,
    durationMin,
    packageId,
    packageMode,
    deduction,
    tickets,
    preview: {
      courseLabel: expectedCourseLabel,
      timeText: `${formatBusinessDateTime(session.startAt)} - ${formatBusinessDateTime(session.endAt)}`,
      studentName: student.name || "学生",
      teacherName: session.teacher?.name ?? session.class.teacher.name,
      locationText: locationText(session),
      chargeLabel: !input.charge ? "不扣课时"
        : packageMode === "MONTHLY" ? "月度课包内计费（不扣余额）"
          : packageMode === "GROUP_COUNT" ? "扣除 1 次班课"
            : `扣除 ${durationMin} 分钟课时`,
      note: input.note,
      tickets: tickets.map((ticket) => ({ id: ticket.id, ticketNo: ticket.ticketNo, status: ticket.status })),
    },
  };
}

export async function previewMiniappSessionCancellation(input: MiniappCancellationInput) {
  return validateCancellation(prisma, input);
}

export async function applyMiniappSessionCancellation(
  input: MiniappCancellationInput,
  actor: CancellationActor,
  completeTicketIds: string[]
) {
  return prisma.$transaction(
    async (tx) => {
      const checked = await validateCancellation(tx, input);
      const requestedTicketIds = Array.from(new Set(completeTicketIds));
      const eligibleIds = new Set(checked.tickets.map((ticket) => ticket.id));
      if (requestedTicketIds.some((ticketId) => !eligibleIds.has(ticketId))) {
        throw new MiniappCancellationError("请假工单已变化，请重新预检。", 409, "TICKET_PREVIEW_STALE");
      }

      if (input.charge && checked.packageId && checked.deduction.units > 0) {
        const deducted = await tx.coursePackage.updateMany({
          where: { id: checked.packageId, remainingMinutes: { gte: checked.deduction.units } },
          data: { remainingMinutes: { decrement: checked.deduction.units } },
        });
        if (deducted.count !== 1) {
          throw new MiniappCancellationError("课包余额已变化，请重新预检。", 409, "PACKAGE_BALANCE_CHANGED");
        }
        await tx.packageTxn.create({
          data: {
            packageId: checked.packageId,
            kind: "DEDUCT",
            deltaMinutes: -checked.deduction.units,
            sessionId: checked.session.id,
            note: `Miniapp cancellation charge. studentId=${input.studentId}`,
          },
        });
      }

      await tx.attendance.upsert({
        where: { sessionId_studentId: { sessionId: checked.session.id, studentId: input.studentId } },
        create: {
          sessionId: checked.session.id,
          studentId: input.studentId,
          status: "EXCUSED",
          deductedCount: input.charge ? checked.deduction.deductedCount : 0,
          deductedMinutes: input.charge ? checked.deduction.deductedMinutes : 0,
          packageId: input.charge ? checked.packageId : null,
          note: input.note || "Canceled from staff miniapp",
          excusedCharge: input.charge,
          waiveDeduction: !input.charge,
          waiveReason: input.charge ? null : "Staff miniapp cancellation without charge",
        },
        update: {
          status: "EXCUSED",
          deductedCount: input.charge ? checked.deduction.deductedCount : 0,
          deductedMinutes: input.charge ? checked.deduction.deductedMinutes : 0,
          packageId: input.charge ? checked.packageId : null,
          note: input.note || "Canceled from staff miniapp",
          excusedCharge: input.charge,
          waiveDeduction: !input.charge,
          waiveReason: input.charge ? null : "Staff miniapp cancellation without charge",
        },
      });

      await recordSchedulingChange(tx, {
        actor,
        action: "SESSION_CANCELLED",
        sessionId: checked.session.id,
        classId: checked.session.classId,
        before: {
          startAt: checked.session.startAt.toISOString(),
          endAt: checked.session.endAt.toISOString(),
          teacherName: checked.session.teacher?.name ?? checked.session.class.teacher.name,
          studentName: getSessionStudents(checked.session).find((student) => student.id === input.studentId)?.name ?? null,
          campusName: checked.session.class.campus.name,
          roomName: checked.session.class.room?.name ?? null,
        },
        after: { status: input.charge ? "Cancelled - charged" : "Cancelled - no charge" },
        reason: input.note,
        source: "MINIAPP",
      });

      const now = new Date();
      const actorName = actor.name?.trim() || actor.email;
      const resultText = `已处理请假/取消：${checked.preview.timeText}；${checked.preview.chargeLabel}。`;
      const completedTickets: Array<{
        id: string;
        ticketNo: string;
        studentId: string | null;
        studentName: string;
        parentVisible: boolean;
        updatedAt: Date;
      }> = [];
      for (const ticket of checked.tickets.filter((row) => requestedTicketIds.includes(row.id))) {
        const log = `[${formatBusinessDateTime(now)}] ${actorName} · 移动请假/取消\n${resultText}`;
        const previousNotes = String(ticket.risksNotes ?? "").trim();
        const actionState = await applyLinkedTicketSchedulingAction(tx, {
          ticketId: ticket.id,
          actionType: "CANCEL_SESSION",
          sourceSessionId: checked.session.id,
          resultSessionId: checked.session.id,
          appliedByUserId: actor.userId,
          chargePolicy: input.charge ? "CHARGE" : "NO_CHARGE",
        });
        const teacherId = checked.session.teacher?.id ?? checked.session.class.teacher.id;
        await createTicketTeacherConfirmation(tx, {
          ticketId: ticket.id, teacherId, managerUserId: actor.userId, sessionId: checked.session.id,
          title: "课程取消通知", detail: `${resultText}\n本次取消已生效，请确认已知悉。`, mode: "NOTICE",
        });
        if (actionState.allResolved) {
          await finishTicketAfterFormalExecution(tx, { ticketId: ticket.id, resultText, actorUserId: actor.userId, risksNotes: previousNotes, logLabel: `${actorName} · 移动请假/取消`, requiresTeacherConsent: false });
          completedTickets.push({ id: ticket.id, ticketNo: ticket.ticketNo, studentId: ticket.studentId, studentName: ticket.studentName, parentVisible: ticket.parentVisible, updatedAt: now });
        } else {
          await tx.ticket.update({ where: { id: ticket.id }, data: { status: "Confirmed", systemUpdated: "Y", finalSchedule: resultText, parentCompletionResult: resultText, nextAction: `取消已处理，仍有 ${actionState.unresolved} 个排课动作待执行。`, nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000), risksNotes: previousNotes ? `${previousNotes}\n\n${log}` : log, lastUpdateAt: now, completedAt: null, completedByUserId: null } });
        }
        await tx.auditLog.create({
          data: {
            actorEmail: actor.email.trim().toLowerCase(),
            actorName: actor.name?.trim() || null,
            actorRole: actor.role,
            module: "TICKETS",
            action: actionState.allResolved ? "MINIAPP_LEAVE_TICKET_COMPLETED_TEACHER_NOTIFIED" : "MINIAPP_LEAVE_ACTION_APPLIED",
            entityType: "Ticket",
            entityId: ticket.id,
            meta: { sessionId: checked.session.id, studentId: input.studentId, charge: input.charge },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorEmail: actor.email.trim().toLowerCase(),
          actorName: actor.name?.trim() || null,
          actorRole: actor.role,
          module: "ATTENDANCE",
          action: "MINIAPP_ADMIN_CANCEL_STUDENT_SESSION",
          entityType: "Session",
          entityId: checked.session.id,
          meta: {
            studentId: input.studentId,
            charge: input.charge,
            packageMode: checked.packageMode,
            deductedMinutes: input.charge ? checked.deduction.deductedMinutes : 0,
            deductedCount: input.charge ? checked.deduction.deductedCount : 0,
            packageId: input.charge ? checked.packageId : null,
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

export function createMiniappCancellationPreviewToken(
  payload: Omit<MiniappCancellationPreviewTokenPayload, "expiresAt">,
  secret: string
) {
  const fullPayload = { ...payload, expiresAt: Date.now() + 10 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${encoded}.${signPart(encoded, secret)}`;
}

export function verifyMiniappCancellationPreviewToken(token: string, secret: string) {
  const [encoded, signature] = String(token ?? "").split(".");
  if (!encoded || !signature) return null;
  const expected = signPart(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MiniappCancellationPreviewTokenPayload;
    if (!payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
