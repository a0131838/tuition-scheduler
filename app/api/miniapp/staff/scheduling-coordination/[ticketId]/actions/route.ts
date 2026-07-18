import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import {
  normalizeSchedulingActionInput,
  schedulingActionCanBeReady,
  schedulingActionDefinition,
  schedulingActionDto,
  schedulingActionInclude,
} from "@/lib/ticket-scheduling-actions";

async function access(req: Request, ticketId: string) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  if (!canManageMiniappSchedulingCoordination(auth.user)) {
    return { ok: false as const, response: bad("Scheduling coordination permission required", 403) };
  }
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, studentId: true, status: true, isArchived: true } });
  if (!ticket) return { ok: false as const, response: bad("Ticket not found", 404) };
  if (ticket.isArchived || ["Completed", "Cancelled"].includes(ticket.status)) {
    return { ok: false as const, response: bad("Closed ticket cannot be changed", 409) };
  }
  return { ok: true as const, auth, ticket };
}

async function validateSource(studentId: string | null, sourceSessionId: string | null) {
  if (!sourceSessionId) return true;
  if (!studentId) return false;
  return Boolean(await prisma.session.findFirst({ where: { id: sourceSessionId, ...sessionBelongsToStudentWhere(studentId) }, select: { id: true } }));
}

async function list(ticketId: string) {
  const actions = await prisma.ticketSchedulingAction.findMany({
    where: { ticketId },
    include: schedulingActionInclude,
    orderBy: { sequence: "asc" },
  });
  return actions.map(schedulingActionDto);
}

export async function POST(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await ctx.params;
  const checked = await access(req, ticketId);
  if (!checked.ok) return checked.response;
  const body = await req.json().catch(() => null);
  const input = normalizeSchedulingActionInput((body ?? {}) as any);
  if (!input) return bad("Invalid scheduling action", 409);
  if (!(await validateSource(checked.ticket.studentId, input.sourceSessionId))) return bad("Selected lesson does not belong to this student", 409);
  let inferredCourseLabel = input.courseLabel;
  if (input.sourceSessionId) {
    const source = await prisma.session.findUnique({ where: { id: input.sourceSessionId }, select: { class: { select: { course: { select: { name: true } }, subject: { select: { name: true } }, level: { select: { name: true } } } } } });
    if (source) inferredCourseLabel = [source.class.course.name, source.class.subject?.name, source.class.level?.name].filter(Boolean).join(" / ");
  }
  const last = await prisma.ticketSchedulingAction.findFirst({ where: { ticketId }, orderBy: { sequence: "desc" }, select: { sequence: true } });
  await prisma.$transaction([
    prisma.ticketSchedulingAction.create({ data: { ticketId, sequence: (last?.sequence ?? -1) + 1, ...input, courseLabel: inferredCourseLabel } }),
    ...(inferredCourseLabel ? [prisma.ticket.update({ where: { id: ticketId }, data: { course: inferredCourseLabel } })] : []),
    prisma.auditLog.create({ data: {
      actorEmail: checked.auth.user.email.trim().toLowerCase(), actorName: checked.auth.user.name?.trim() || null,
      actorRole: checked.auth.user.role, module: "TICKETS", action: "ADD_TICKET_SCHEDULING_ACTION",
      entityType: "Ticket", entityId: ticketId, meta: { actionType: input.actionType, sourceSessionId: input.sourceSessionId },
    } }),
  ]);
  return ok({ schedulingActions: await list(ticketId) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await ctx.params;
  const checked = await access(req, ticketId);
  if (!checked.ok) return checked.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const actionId = String((body as any).actionId ?? "").trim();
  const action = await prisma.ticketSchedulingAction.findFirst({ where: { id: actionId, ticketId } });
  if (!action) return bad("Scheduling action not found", 404);
  if (["APPLIED", "CANCELLED"].includes(action.status)) return bad("Resolved action cannot be edited", 409);
  const sourceSessionId = Object.prototype.hasOwnProperty.call(body, "sourceSessionId")
    ? String((body as any).sourceSessionId ?? "").trim() || null
    : action.sourceSessionId;
  if (!(await validateSource(checked.ticket.studentId, sourceSessionId))) return bad("Selected lesson does not belong to this student", 409);
  const requestedStatus = String((body as any).status ?? "").trim();
  const allowedStatuses = new Set(["NEED_INFO", "WAITING_PARENT", "WAITING_TEACHER", "READY", "CONFLICT", "CANCELLED"]);
  let status = allowedStatuses.has(requestedStatus) ? requestedStatus : action.status;
  if (
    status === "READY" &&
    !schedulingActionCanBeReady({
      actionType: action.actionType,
      sourceSessionId,
      requestedStartAt: action.requestedStartAt,
      requestedEndAt: action.requestedEndAt,
      requestedTeacherId: action.requestedTeacherId,
      courseLabel: action.courseLabel,
      durationMin: action.durationMin,
    })
  ) status = "NEED_INFO";
  const notes = Object.prototype.hasOwnProperty.call(body, "notes") ? String((body as any).notes ?? "").trim().slice(0, 2000) || null : action.notes;
  await prisma.$transaction([
    prisma.ticketSchedulingAction.update({ where: { id: action.id }, data: { sourceSessionId, status, notes } }),
    prisma.auditLog.create({ data: {
      actorEmail: checked.auth.user.email.trim().toLowerCase(), actorName: checked.auth.user.name?.trim() || null,
      actorRole: checked.auth.user.role, module: "TICKETS", action: "UPDATE_TICKET_SCHEDULING_ACTION",
      entityType: "TicketSchedulingAction", entityId: action.id,
      meta: { ticketId, fromStatus: action.status, toStatus: status, sourceSessionId },
    } }),
  ]);
  return ok({ schedulingActions: await list(ticketId) });
}
