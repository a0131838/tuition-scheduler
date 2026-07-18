import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  normalizeSchedulingActionInput,
  schedulingActionCanBeReady,
  schedulingActionDefinition,
  TICKET_SCHEDULING_ACTION_TYPES,
} from "../lib/ticket-scheduling-actions";

test("source-session actions require exact lessons and action-specific execution details", () => {
  for (const actionType of ["RESCHEDULE_SESSION", "CANCEL_SESSION", "REPLACE_TEACHER"]) {
    const missing = normalizeSchedulingActionInput({ actionType });
    assert.equal(missing?.status, "NEED_INFO");
    assert.equal(schedulingActionDefinition(actionType)?.needsSource, true);
  }
  assert.equal(normalizeSchedulingActionInput({ actionType: "CANCEL_SESSION", sourceSessionId: "session-1" })?.status, "READY");
  assert.equal(normalizeSchedulingActionInput({ actionType: "RESCHEDULE_SESSION", sourceSessionId: "session-1" })?.status, "NEED_INFO");
  assert.equal(normalizeSchedulingActionInput({ actionType: "RESCHEDULE_SESSION", sourceSessionId: "session-1", requestedStartAt: "2026-08-01T10:00:00+08:00" })?.status, "READY");
  assert.equal(normalizeSchedulingActionInput({ actionType: "REPLACE_TEACHER", sourceSessionId: "session-1" })?.status, "NEED_INFO");
  assert.equal(normalizeSchedulingActionInput({ actionType: "REPLACE_TEACHER", sourceSessionId: "session-1", requestedTeacherId: "teacher-1" })?.status, "READY");
  assert.equal(schedulingActionCanBeReady({ actionType: "RESCHEDULE_SESSION", sourceSessionId: "session-1" }), false);
});

test("new scheduling and coordination remain separate action intents", () => {
  const create = normalizeSchedulingActionInput({ actionType: "CREATE_SESSION", requestedStartAt: "2026-08-01T10:00:00+08:00", courseLabel: "Math", durationMin: 60 });
  const coordinate = normalizeSchedulingActionInput({ actionType: "COORDINATE_ONLY" });
  assert.equal(create?.status, "READY");
  assert.equal(coordinate?.status, "NEED_INFO");
  assert.equal(TICKET_SCHEDULING_ACTION_TYPES.length, 5);
});

test("invalid or unsafe action input is rejected or bounded", () => {
  assert.equal(normalizeSchedulingActionInput({ actionType: "DELETE_SESSION" }), null);
  assert.equal(normalizeSchedulingActionInput({ actionType: "CREATE_SESSION", durationMin: 5 })?.durationMin, null);
  assert.equal(normalizeSchedulingActionInput({ actionType: "CREATE_SESSION", durationMin: 60 })?.durationMin, 60);
});

test("ticket completion paths guard unresolved scheduling actions", () => {
  const webDetail = readFileSync("app/admin/tickets/[id]/page.tsx", "utf8");
  const webList = readFileSync("app/admin/tickets/page.tsx", "utf8");
  const miniappRoute = readFileSync("app/api/miniapp/staff/parent-requests/[id]/route.ts", "utf8");
  assert.match(webDetail, /scheduling-actions-open/);
  assert.match(webList, /scheduling-actions-open/);
  assert.match(miniappRoute, /schedulingCompletionBlock/);
});

test("execution services write structured action results inside their existing transactions", () => {
  for (const file of [
    "lib/miniapp-session-scheduling.ts",
    "lib/miniapp-session-cancellation.ts",
    "lib/miniapp-session-teacher-replacement.ts",
    "lib/miniapp-ticket-new-session.ts",
  ]) {
    assert.match(readFileSync(file, "utf8"), /applyLinkedTicketSchedulingAction/);
  }
});

test("public web intake defaults to the guided multi-action workflow", () => {
  const wrapper = readFileSync("app/tickets/intake/IntakeForm.tsx", "utf8");
  const guided = readFileSync("app/tickets/intake/GuidedIntakeForm.tsx", "utf8");
  const page = readFileSync("app/tickets/intake/[token]/page.tsx", "utf8");
  const route = readFileSync("app/api/tickets/intake/[token]/route.ts", "utf8");
  assert.match(wrapper, /GuidedIntakeForm/);
  assert.match(guided, /添加另一个动作/);
  assert.match(guided, /sourceSessionId/);
  assert.match(page, /sessionLookupPath/);
  assert.match(route, /CREATE_GUIDED_TICKET_SCHEDULING_ACTIONS/);
  assert.match(route, /sessionBelongsToStudentWhere/);
  assert.match(route, /ticketSchedulingAction\.createMany/);
});
