import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import {
  COORDINATION_BOARD_STATUSES,
  COORDINATION_COMMUNICATION_TARGETS,
  coordinationBoardTicketDto,
  coordinationBoardTicketInclude,
  defaultCoordinationNextAction,
  MOBILE_SCHEDULING_TICKET_TYPES,
} from "@/lib/miniapp-scheduling-coordination-board";
import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { canTransitionTicketStatus, TICKET_OWNER_OPTIONS } from "@/lib/tickets";

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function parseFollowUpDate(value: unknown) {
  const raw = clean(value, 20);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T18:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function requireTicketAccess(req: Request, ticketId: string) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  if (!canManageMiniappSchedulingCoordination(auth.user)) {
    return { ok: false as const, response: bad("Scheduling coordination permission required", 403) };
  }
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, type: { in: [...MOBILE_SCHEDULING_TICKET_TYPES] }, isArchived: false },
    include: coordinationBoardTicketInclude,
  });
  if (!ticket) return { ok: false as const, response: bad("Coordination ticket not found", 404) };
  return { ok: true as const, auth, ticket };
}

function statusOptions(currentStatus: string) {
  return COORDINATION_BOARD_STATUSES.filter((item) => canTransitionTicketStatus(currentStatus, item.value));
}

function ownerOptions() {
  return [{ value: "", label: "未分配" }, ...TICKET_OWNER_OPTIONS.map((item) => ({ value: item.value, label: item.zh }))];
}

async function upcomingStudentSessions(studentId: string | null, studentName: string) {
  let resolvedStudentId = studentId;
  if (!resolvedStudentId) {
    const matches = await prisma.student.findMany({ where: { name: studentName }, select: { id: true }, take: 2 });
    if (matches.length === 1) resolvedStudentId = matches[0].id;
  }
  if (!resolvedStudentId) return [];
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: new Date() },
      OR: [
        { studentId: resolvedStudentId },
        { class: { oneOnOneStudentId: resolvedStudentId } },
        { class: { enrollments: { some: { studentId: resolvedStudentId } } } },
        { attendances: { some: { studentId: resolvedStudentId } } },
      ],
    },
    include: {
      teacher: { select: { name: true } },
      attendances: { where: { studentId: resolvedStudentId }, select: { status: true, excusedCharge: true } },
      class: {
        include: {
          course: { select: { name: true } },
          subject: { select: { name: true } },
          level: { select: { name: true } },
          teacher: { select: { name: true } },
          campus: { select: { name: true, isOnline: true } },
          room: { select: { name: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 30,
  });
  return sessions.map((session) => {
    const attendance = session.attendances[0] ?? null;
    const isExcused = attendance?.status === "EXCUSED";
    const campusName = session.class.campus.name;
    const roomName = session.class.room?.name ?? "";
    return {
      id: session.id,
      startText: formatBusinessDateTime(session.startAt),
      endText: formatBusinessDateTime(session.endAt),
      courseLabel: [session.class.course.name, session.class.subject?.name, session.class.level?.name]
        .filter(Boolean)
        .join(" / "),
      teacherName: session.teacher?.name ?? session.class.teacher.name,
      locationText: session.class.campus.isOnline ? campusName : roomName ? `${campusName} · ${roomName}` : campusName,
      isExcused,
      attendanceLabel: isExcused ? (attendance?.excusedCharge ? "已请假（扣课时）" : "已请假（不扣课时）") : "已安排",
    };
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await ctx.params;
  const access = await requireTicketAccess(req, ticketId);
  if (!access.ok) return access.response;
  const upcomingSessions = await upcomingStudentSessions(access.ticket.studentId, access.ticket.studentName);
  return ok({
    ticket: coordinationBoardTicketDto(access.ticket),
    statusOptions: statusOptions(access.ticket.status),
    ownerOptions: ownerOptions(),
    upcomingSessions,
    capabilities: {
      canCreateNewSession:
        access.auth.user.role === "ADMIN" && ["新排课", "补课加课", "排课协调"].includes(access.ticket.type),
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await ctx.params;
  const access = await requireTicketAccess(req, ticketId);
  if (!access.ok) return access.response;
  if (["Completed", "Cancelled"].includes(access.ticket.status)) {
    return bad("Completed coordination tickets cannot be edited here", 409);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const communicationTarget = clean((body as any).communicationTarget, 30);
  const communicationResult = clean((body as any).communicationResult, 2000);
  const status = clean((body as any).status, 40);
  const ownerProvided = Object.prototype.hasOwnProperty.call(body, "owner");
  const owner = ownerProvided ? clean((body as any).owner, 40) : String(access.ticket.owner ?? "");
  const nextAction = clean((body as any).nextAction, 1000) || defaultCoordinationNextAction(status);
  const nextActionDue = parseFollowUpDate((body as any).nextActionDue);
  if (!COORDINATION_COMMUNICATION_TARGETS.includes(communicationTarget as any)) {
    return bad("Invalid communication target", 409);
  }
  if (!communicationResult) return bad("Communication result is required", 409);
  if (!COORDINATION_BOARD_STATUSES.some((item) => item.value === status)) return bad("Invalid status", 409);
  if (owner && !TICKET_OWNER_OPTIONS.some((item) => item.value === owner)) return bad("Invalid owner", 409);
  if (!canTransitionTicketStatus(access.ticket.status, status)) {
    return bad("Invalid coordination status transition", 409, { from: access.ticket.status, to: status });
  }
  if (!nextActionDue) return bad("Valid follow-up date is required", 409);

  const now = new Date();
  const actorName = access.auth.user.name || access.auth.user.email;
  const log = `[${formatBusinessDateTime(now)}] ${actorName} · ${communicationTarget}\n${communicationResult}`;
  const previousNotes = String(access.ticket.risksNotes ?? "").trim();
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.ticket.update({
      where: { id: access.ticket.id },
      data: {
        status,
        ...(ownerProvided ? { owner: owner || null } : {}),
        nextAction,
        nextActionDue,
        risksNotes: previousNotes ? `${previousNotes}\n\n${log}` : log,
        lastUpdateAt: now,
      },
      include: coordinationBoardTicketInclude,
    });
    await tx.auditLog.create({
      data: {
        actorEmail: access.auth.user.email.trim().toLowerCase(),
        actorName: access.auth.user.name?.trim() || null,
        actorRole: access.auth.user.role,
        module: "TICKETS",
        action: "MINIAPP_COORDINATION_BOARD_UPDATE",
        entityType: "Ticket",
        entityId: saved.id,
        meta: {
          communicationTarget,
          fromStatus: access.ticket.status,
          toStatus: status,
          fromOwner: access.ticket.owner,
          toOwner: owner || null,
        },
      },
    });
    return saved;
  });

  if (updated.parentVisible && updated.studentId && status !== access.ticket.status) {
    await queueMiniappNotificationsForStudent({
      studentId: updated.studentId,
      templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
      eventType: "REQUEST_STATUS_CHANGED",
      targetType: "Ticket",
      targetId: `${updated.id}:${updated.updatedAt.toISOString()}`,
      permission: "canCreateRequests",
      payload: {
        ticketNo: updated.ticketNo, type: updated.type, status: updated.status,
        ticketId: updated.id, studentName: updated.studentName, updatedAt: updated.updatedAt.toISOString(),
      },
    }).catch(() => null);
  }

  return ok({
    message: "排课协调记录已更新。",
    ticket: coordinationBoardTicketDto(updated),
    statusOptions: statusOptions(updated.status),
    ownerOptions: ownerOptions(),
  });
}
