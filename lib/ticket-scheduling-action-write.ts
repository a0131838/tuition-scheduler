import type { Prisma } from "@prisma/client";

export async function applyLinkedTicketSchedulingAction(
  tx: Prisma.TransactionClient,
  input: {
    ticketId: string;
    actionId?: string | null;
    actionType: string;
    sourceSessionId?: string | null;
    resultSessionId?: string | null;
    appliedByUserId: string;
    requestedTeacherId?: string | null;
    chargePolicy?: string | null;
  }
) {
  const action = await tx.ticketSchedulingAction.findFirst({
    where: {
      ticketId: input.ticketId,
      ...(input.actionId ? { id: input.actionId } : {}),
      actionType: input.actionType,
      status: { notIn: ["APPLIED", "CANCELLED"] },
      ...(input.sourceSessionId ? { OR: [{ sourceSessionId: input.sourceSessionId }, { sourceSessionId: null }] } : {}),
    },
    orderBy: { sequence: "asc" },
  });
  if (action) {
    await tx.ticketSchedulingAction.update({
      where: { id: action.id },
      data: {
        status: "APPLIED",
        sourceSessionId: input.sourceSessionId ?? action.sourceSessionId,
        resultSessionId: input.resultSessionId ?? action.resultSessionId,
        requestedTeacherId: input.requestedTeacherId ?? action.requestedTeacherId,
        chargePolicy: input.chargePolicy ?? action.chargePolicy,
        appliedAt: new Date(),
        appliedByUserId: input.appliedByUserId,
      },
    });
  }
  const [total, unresolved] = await Promise.all([
    tx.ticketSchedulingAction.count({ where: { ticketId: input.ticketId } }),
    tx.ticketSchedulingAction.count({ where: { ticketId: input.ticketId, status: { notIn: ["APPLIED", "CANCELLED"] } } }),
  ]);
  return { matchedActionId: action?.id ?? null, hasActions: total > 0, allResolved: total === 0 || unresolved === 0, unresolved };
}

export class TicketSchedulingActionContextError extends Error {
  constructor(message = "Ticket scheduling action context is invalid") {
    super(message);
    this.name = "TicketSchedulingActionContextError";
  }
}

export async function applyAdminLinkedTicketSchedulingAction(
  tx: Prisma.TransactionClient,
  input: {
    ticketId: string;
    actionId: string;
    actionType: string;
    sourceSessionId?: string | null;
    resultSessionId?: string | null;
    requestedTeacherId?: string | null;
    chargePolicy?: string | null;
    resultText: string;
    appliedByUserId: string;
    actorEmail: string;
    actorName?: string | null;
    actorRole?: string | null;
    auditAction: string;
  }
) {
  const ticket = await tx.ticket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      status: true,
      isArchived: true,
      risksNotes: true,
    },
  });
  if (!ticket || ticket.isArchived || ["Completed", "Cancelled"].includes(ticket.status)) {
    throw new TicketSchedulingActionContextError("Ticket is already closed");
  }

  const actionState = await applyLinkedTicketSchedulingAction(tx, {
    ticketId: input.ticketId,
    actionId: input.actionId,
    actionType: input.actionType,
    sourceSessionId: input.sourceSessionId,
    resultSessionId: input.resultSessionId,
    requestedTeacherId: input.requestedTeacherId,
    chargePolicy: input.chargePolicy,
    appliedByUserId: input.appliedByUserId,
  });
  if (actionState.matchedActionId !== input.actionId) {
    throw new TicketSchedulingActionContextError();
  }

  const now = new Date();
  const actorLabel = input.actorName?.trim() || input.actorEmail;
  const visibleLog = `[${now.toISOString()}] ${actorLabel} · ${input.resultText}`;
  await tx.ticket.update({
    where: { id: input.ticketId },
    data: {
      status: actionState.allResolved ? "Completed" : "Confirmed",
      systemUpdated: "Y",
      finalSchedule: input.resultText,
      parentCompletionResult: input.resultText,
      nextAction: actionState.allResolved
        ? "所有排课动作已完成，无需继续跟进。"
        : `本次课表操作已完成，仍有 ${actionState.unresolved} 个排课动作待执行。`,
      nextActionDue: actionState.allResolved ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000),
      risksNotes: ticket.risksNotes ? `${ticket.risksNotes}\n\n${visibleLog}` : visibleLog,
      lastUpdateAt: now,
      completedAt: actionState.allResolved ? now : null,
      completedByUserId: actionState.allResolved ? input.appliedByUserId : null,
    },
  });
  if (actionState.allResolved) {
    await tx.parentAvailabilityRequest.updateMany({
      where: { ticketId: input.ticketId },
      data: { isActive: false },
    });
  }
  await tx.auditLog.create({
    data: {
      actorEmail: input.actorEmail.trim().toLowerCase(),
      actorName: input.actorName?.trim() || null,
      actorRole: input.actorRole || null,
      module: "TICKETS",
      action: input.auditAction,
      entityType: "TicketSchedulingAction",
      entityId: input.actionId,
      meta: {
        ticketId: input.ticketId,
        actionType: input.actionType,
        sourceSessionId: input.sourceSessionId ?? null,
        resultSessionId: input.resultSessionId ?? null,
        allResolved: actionState.allResolved,
        unresolved: actionState.unresolved,
      },
    },
  });
  return actionState;
}
