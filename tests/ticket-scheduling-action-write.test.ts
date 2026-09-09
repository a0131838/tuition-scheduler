import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAdminLinkedTicketSchedulingAction,
  TicketSchedulingActionContextError,
} from "../lib/ticket-scheduling-action-write";

type WriteFixtureAction = {
  id: string;
  ticketId: string;
  sequence: number;
  actionType: string;
  status: string;
  sourceSessionId: string | null;
  resultSessionId: string | null;
  requestedTeacherId: string | null;
  chargePolicy: string | null;
  appliedAt?: Date | null;
  appliedByUserId?: string | null;
};

function createSchedulingWriteFixture(input?: {
  ticketStatus?: string;
  isArchived?: boolean;
  actions?: WriteFixtureAction[];
}) {
  const ticket = {
    id: "ticket-1",
    status: input?.ticketStatus ?? "Confirmed",
    isArchived: input?.isArchived ?? false,
    risksNotes: "Existing note",
  };
  const actions = input?.actions ?? [
    {
      id: "action-1",
      ticketId: ticket.id,
      sequence: 1,
      actionType: "CREATE_SESSION",
      status: "READY",
      sourceSessionId: null,
      resultSessionId: null,
      requestedTeacherId: null,
      chargePolicy: null,
    },
  ];
  const ticketUpdates: Array<Record<string, any>> = [];
  const audits: Array<Record<string, any>> = [];
  const parentAvailabilityUpdates: Array<Record<string, any>> = [];

  const tx = {
    $queryRaw: async () => [],
    ticketSchedulingAction: {
      findFirst: async ({ where }: any) =>
        actions
          .filter((action) => {
            if (action.ticketId !== where.ticketId) return false;
            if (where.id && action.id !== where.id) return false;
            if (action.actionType !== where.actionType) return false;
            if (where.status?.notIn?.includes(action.status)) return false;
            if (where.OR) {
              const sourceMatches = where.OR.some(
                (condition: any) =>
                  "sourceSessionId" in condition && action.sourceSessionId === condition.sourceSessionId
              );
              if (!sourceMatches) return false;
            }
            return true;
          })
          .sort((a, b) => a.sequence - b.sequence)[0] ?? null,
      update: async ({ where, data }: any) => {
        const action = actions.find((row) => row.id === where.id);
        assert.ok(action);
        Object.assign(action, data);
        return action;
      },
      count: async ({ where }: any) =>
        actions.filter((action) => {
          if (action.ticketId !== where.ticketId) return false;
          if (where.status?.notIn?.includes(action.status)) return false;
          return true;
        }).length,
    },
    ticket: {
      findUnique: async ({ where }: any) => (where.id === ticket.id ? { ...ticket } : null),
      update: async ({ where, data }: any) => {
        assert.equal(where.id, ticket.id);
        ticketUpdates.push(data);
        Object.assign(ticket, data);
        return ticket;
      },
    },
    parentAvailabilityRequest: {
      updateMany: async (args: any) => {
        parentAvailabilityUpdates.push(args);
        return { count: 1 };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      },
    },
  };

  return { tx: tx as any, ticket, actions, ticketUpdates, audits, parentAvailabilityUpdates };
}

function applySchedulingWrite(tx: any, overrides?: Record<string, unknown>) {
  return applyAdminLinkedTicketSchedulingAction(tx, {
    ticketId: "ticket-1",
    actionId: "action-1",
    actionType: "CREATE_SESSION",
    resultSessionId: "session-new",
    resultText: "已完成排课：2026-08-01 10:00；老师：Jasmine。",
    appliedByUserId: "admin-1",
    actorEmail: " EVA@123.com ",
    actorName: "Eva",
    actorRole: "ADMIN",
    auditAction: "ADMIN_TICKET_NEW_SESSION_APPLIED",
    ...overrides,
  });
}

test("applying one of several actions keeps the ticket open and records the exact result", async () => {
  const fixture = createSchedulingWriteFixture({
    actions: [
      {
        id: "action-1",
        ticketId: "ticket-1",
        sequence: 1,
        actionType: "CREATE_SESSION",
        status: "READY",
        sourceSessionId: null,
        resultSessionId: null,
        requestedTeacherId: null,
        chargePolicy: null,
      },
      {
        id: "action-2",
        ticketId: "ticket-1",
        sequence: 2,
        actionType: "CANCEL_SESSION",
        status: "READY",
        sourceSessionId: "session-old",
        resultSessionId: null,
        requestedTeacherId: null,
        chargePolicy: null,
      },
    ],
  });

  const result = await applySchedulingWrite(fixture.tx);

  assert.equal(result.allResolved, false);
  assert.equal(result.unresolved, 1);
  assert.equal(fixture.actions[0]?.status, "APPLIED");
  assert.equal(fixture.actions[0]?.resultSessionId, "session-new");
  assert.equal(fixture.actions[1]?.status, "READY");
  assert.equal(fixture.ticket.status, "Confirmed");
  assert.equal(fixture.ticketUpdates[0]?.completedAt, null);
  assert.ok(fixture.ticketUpdates[0]?.nextActionDue instanceof Date);
  assert.equal(fixture.parentAvailabilityUpdates.length, 0);
  assert.equal(fixture.audits.length, 1);
  assert.equal(fixture.audits[0]?.actorEmail, "eva@123.com");
  assert.deepEqual(fixture.audits[0]?.meta, {
    ticketId: "ticket-1",
    actionType: "CREATE_SESSION",
    sourceSessionId: null,
    resultSessionId: "session-new",
    allResolved: false,
    resultSessionIds: ["session-new"],
    unresolved: 1,
  });
});

test("applying the final action completes the ticket and closes parent availability", async () => {
  const fixture = createSchedulingWriteFixture();

  const result = await applySchedulingWrite(fixture.tx);

  assert.equal(result.allResolved, true);
  assert.equal(result.unresolved, 0);
  assert.equal(fixture.ticket.status, "Completed");
  assert.ok(fixture.ticketUpdates[0]?.completedAt instanceof Date);
  assert.equal(fixture.ticketUpdates[0]?.completedByUserId, "admin-1");
  assert.equal(fixture.ticketUpdates[0]?.nextActionDue, null);
  assert.equal(fixture.parentAvailabilityUpdates.length, 1);
  assert.deepEqual(fixture.parentAvailabilityUpdates[0], {
    where: { ticketId: "ticket-1" },
    data: { isActive: false },
  });
});

test("an incorrect action context is rejected before ticket or audit writes", async () => {
  const fixture = createSchedulingWriteFixture();

  await assert.rejects(
    applySchedulingWrite(fixture.tx, { actionId: "action-missing" }),
    TicketSchedulingActionContextError
  );

  assert.equal(fixture.actions[0]?.status, "READY");
  assert.equal(fixture.ticketUpdates.length, 0);
  assert.equal(fixture.parentAvailabilityUpdates.length, 0);
  assert.equal(fixture.audits.length, 0);
});

test("a mismatched source session or closed ticket cannot consume an action", async () => {
  const sourceFixture = createSchedulingWriteFixture({
    actions: [
      {
        id: "action-1",
        ticketId: "ticket-1",
        sequence: 1,
        actionType: "CANCEL_SESSION",
        status: "READY",
        sourceSessionId: "session-expected",
        resultSessionId: null,
        requestedTeacherId: null,
        chargePolicy: null,
      },
    ],
  });
  await assert.rejects(
    applySchedulingWrite(sourceFixture.tx, {
      actionType: "CANCEL_SESSION",
      sourceSessionId: "session-other",
      resultSessionId: "session-other",
    }),
    TicketSchedulingActionContextError
  );
  assert.equal(sourceFixture.actions[0]?.status, "READY");

  const closedFixture = createSchedulingWriteFixture({ ticketStatus: "Completed" });
  await assert.rejects(applySchedulingWrite(closedFixture.tx), TicketSchedulingActionContextError);
  assert.equal(closedFixture.actions[0]?.status, "READY");
  assert.equal(closedFixture.ticketUpdates.length, 0);
  assert.equal(closedFixture.audits.length, 0);
});
