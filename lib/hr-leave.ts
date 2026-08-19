import { HrLeaveLedgerEntryType, HrLeaveStatus, HrLeaveType, Prisma } from "@prisma/client";
import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { isSessionFullyCancelled } from "@/lib/session-students";

const BALANCE_CONTROLLED_TYPES = new Set<HrLeaveType>([
  HrLeaveType.ANNUAL,
  HrLeaveType.SICK_OUTPATIENT,
  HrLeaveType.HOSPITALISATION,
  HrLeaveType.OFF_IN_LIEU,
]);

export function calculateWorkingLeaveMinutes(input: {
  startAt: Date;
  endAt: Date;
  portion?: "FULL_DAY" | "HALF_DAY" | "HOURLY";
  hourlyMinutes?: number;
  workPattern?: Prisma.JsonValue | null;
}) {
  if (!(input.startAt instanceof Date) || !(input.endAt instanceof Date) || input.endAt < input.startAt) {
    throw new Error("Invalid leave period");
  }
  const pattern = input.workPattern && typeof input.workPattern === "object" && !Array.isArray(input.workPattern)
    ? (input.workPattern as Record<string, unknown>)
    : {};
  const dailyMinutes = Math.max(60, Math.min(24 * 60, Number(pattern.dailyMinutes) || 480));
  const workDays = Array.isArray(pattern.workDays)
    ? new Set(pattern.workDays.map(Number).filter((value) => value >= 0 && value <= 6))
    : new Set([1, 2, 3, 4, 5]);
  if (input.portion === "HOURLY") return Math.max(1, Math.min(dailyMinutes, Math.round(input.hourlyMinutes || 0)));

  const cursor = new Date(input.startAt);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(input.endAt);
  last.setHours(0, 0, 0, 0);
  let workingDays = 0;
  while (cursor <= last) {
    if (workDays.has(cursor.getDay())) workingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!workingDays) throw new Error("Leave period contains no working day");
  return workingDays * (input.portion === "HALF_DAY" ? Math.round(dailyMinutes / 2) : dailyMinutes);
}

export async function getEmployeeLeaveBalances(employeeId: string, now = new Date()) {
  const rows = await prisma.hrLeaveLedgerEntry.groupBy({
    by: ["leaveType"],
    where: { employeeId, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    _sum: { minutes: true },
  });
  return new Map(rows.map((row) => [row.leaveType, row._sum.minutes ?? 0]));
}

async function resolveLeaveApprover(employeeId: string) {
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { userId: true, managerUserId: true },
  });
  if (!employee) throw new Error("Employee profile not found");
  if (employee.managerUserId && employee.managerUserId !== employee.userId) return employee.managerUserId;

  const hrManager = await prisma.user.findFirst({
    where: {
      id: { not: employee.userId },
      role: "ADMIN",
      workspaceAccesses: { some: { workspace: "HR", isActive: true } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (hrManager) return hrManager.id;

  const config = await getApprovalRoleConfig();
  const fallback = await prisma.user.findFirst({
    where: { id: { not: employee.userId }, email: { in: config.managerApproverEmails, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

export async function countEmployeeScheduleConflicts(employeeId: string, startAt: Date, endAt: Date) {
  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { teacherId: true } });
  if (!employee?.teacherId) return 0;
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId: employee.teacherId }, { teacherId: null, class: { teacherId: employee.teacherId } }],
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      student: { select: { id: true } },
      class: {
        include: {
          oneOnOneStudent: { select: { id: true } },
          enrollments: { include: { student: { select: { id: true } } } },
        },
      },
    },
  });
  return sessions.filter((session) => !isSessionFullyCancelled(session)).length;
}

export async function submitLeaveRequest(input: {
  employeeId: string;
  leaveType: HrLeaveType;
  startAt: Date;
  endAt: Date;
  portion?: "FULL_DAY" | "HALF_DAY" | "HOURLY";
  hourlyMinutes?: number;
  reason?: string | null;
  attachment?: { privatePath: string; originalName: string; mimeType?: string | null } | null;
  actor: { email: string; name?: string | null; role?: string | null };
}) {
  const employee = await prisma.employeeProfile.findUnique({ where: { id: input.employeeId } });
  if (!employee?.leaveEligible) throw new Error("Employee is not eligible for leave requests");
  const durationMinutes = calculateWorkingLeaveMinutes({
    startAt: input.startAt,
    endAt: input.endAt,
    portion: input.portion,
    hourlyMinutes: input.hourlyMinutes,
    workPattern: employee.workPattern,
  });
  const overlap = await prisma.hrLeaveRequest.findFirst({
    where: {
      employeeId: input.employeeId,
      status: { in: [HrLeaveStatus.SUBMITTED, HrLeaveStatus.APPROVED] },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: { id: true },
  });
  if (overlap) throw new Error("An active leave request already overlaps this period");
  const approverUserId = await resolveLeaveApprover(input.employeeId);
  const scheduleConflictCount = await countEmployeeScheduleConflicts(input.employeeId, input.startAt, input.endAt);
  const row = await prisma.hrLeaveRequest.create({
    data: {
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startAt: input.startAt,
      endAt: input.endAt,
      durationMinutes,
      reason: input.reason?.trim() || null,
      attachmentPrivatePath: input.attachment?.privatePath,
      attachmentOriginalName: input.attachment?.originalName,
      attachmentMimeType: input.attachment?.mimeType,
      status: HrLeaveStatus.SUBMITTED,
      approverUserId,
      submittedAt: new Date(),
      scheduleConflictCount,
    },
  });
  await logAudit({ actor: input.actor, module: "hr", action: "LEAVE_SUBMITTED", entityType: "HrLeaveRequest", entityId: row.id, meta: { leaveType: row.leaveType, durationMinutes, scheduleConflictCount } });
  return row;
}

export async function decideLeaveRequest(input: {
  requestId: string;
  decision: "APPROVE" | "REJECT";
  decisionNote?: string | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  const request = await prisma.hrLeaveRequest.findUnique({
    where: { id: input.requestId },
    include: { employee: { select: { userId: true } } },
  });
  if (!request || request.status !== HrLeaveStatus.SUBMITTED) throw new Error("Leave request is no longer pending");
  if (request.employee.userId === input.actor.id) throw new Error("Self-approval is not allowed");
  if (request.approverUserId && request.approverUserId !== input.actor.id && input.actor.role !== "ADMIN") {
    throw new Error("This leave request is assigned to another approver");
  }

  if (input.decision === "APPROVE" && BALANCE_CONTROLLED_TYPES.has(request.leaveType)) {
    const balances = await getEmployeeLeaveBalances(request.employeeId);
    if ((balances.get(request.leaveType) ?? 0) < request.durationMinutes) throw new Error("Insufficient leave balance");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.hrLeaveRequest.updateMany({
      where: { id: request.id, status: HrLeaveStatus.SUBMITTED },
      data: {
        status: input.decision === "APPROVE" ? HrLeaveStatus.APPROVED : HrLeaveStatus.REJECTED,
        approverUserId: input.actor.id,
        decidedAt: now,
        decisionNote: input.decisionNote?.trim() || null,
      },
    });
    if (updated.count !== 1) throw new Error("Leave request was updated by another user");
    if (input.decision === "APPROVE" && BALANCE_CONTROLLED_TYPES.has(request.leaveType)) {
      await tx.hrLeaveLedgerEntry.create({
        data: {
          employeeId: request.employeeId,
          leaveType: request.leaveType,
          entryType: HrLeaveLedgerEntryType.USED,
          minutes: -request.durationMinutes,
          leaveRequestId: request.id,
          source: "APPROVED_LEAVE",
          createdById: input.actor.id,
        },
      });
    }
  });
  await logAudit({ actor: input.actor, module: "hr", action: input.decision === "APPROVE" ? "LEAVE_APPROVED" : "LEAVE_REJECTED", entityType: "HrLeaveRequest", entityId: request.id, meta: { note: input.decisionNote || null } });
}

export async function cancelLeaveRequest(input: {
  requestId: string;
  employeeUserId: string;
  reason?: string | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  const request = await prisma.hrLeaveRequest.findUnique({ where: { id: input.requestId }, include: { employee: { select: { userId: true } } } });
  if (!request || (request.status !== HrLeaveStatus.SUBMITTED && request.status !== HrLeaveStatus.APPROVED)) throw new Error("Leave request cannot be cancelled");
  if (request.employee.userId !== input.employeeUserId && input.actor.role !== "ADMIN") throw new Error("Leave request does not belong to this employee");
  const wasApproved = request.status === HrLeaveStatus.APPROVED;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.hrLeaveRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: HrLeaveStatus.CANCELLED, cancelledAt: new Date(), cancelReason: input.reason?.trim() || null },
    });
    if (changed.count !== 1) throw new Error("Leave request was updated by another user");
    if (wasApproved && BALANCE_CONTROLLED_TYPES.has(request.leaveType)) {
      await tx.hrLeaveLedgerEntry.create({
        data: {
          employeeId: request.employeeId,
          leaveType: request.leaveType,
          entryType: HrLeaveLedgerEntryType.RESTORED,
          minutes: request.durationMinutes,
          leaveRequestId: request.id,
          source: "CANCELLED_APPROVED_LEAVE",
          createdById: input.actor.id,
        },
      });
    }
  });
  await logAudit({ actor: input.actor, module: "hr", action: "LEAVE_CANCELLED", entityType: "HrLeaveRequest", entityId: request.id });
}

export async function findApprovedTeacherLeaveConflict(teacherId: string, startAt: Date, endAt: Date) {
  return prisma.hrLeaveRequest.findFirst({
    where: {
      status: HrLeaveStatus.APPROVED,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      employee: { teacherId },
    },
    select: { id: true, leaveType: true, startAt: true, endAt: true },
  });
}

export function hrLeaveTypeLabel(type: HrLeaveType) {
  return {
    ANNUAL: "Annual leave / 年假",
    SICK_OUTPATIENT: "Outpatient sick leave / 门诊病假",
    HOSPITALISATION: "Hospitalisation leave / 住院病假",
    OFF_IN_LIEU: "Off in lieu / 调休",
    UNPAID: "Unpaid leave / 无薪假",
    OTHER: "Other leave / 其他假期",
  }[type];
}
