import type { Prisma } from "@prisma/client";

export async function applyLinkedTicketSchedulingAction(
  tx: Prisma.TransactionClient,
  input: {
    ticketId: string;
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
