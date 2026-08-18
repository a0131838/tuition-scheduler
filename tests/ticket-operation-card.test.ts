import assert from "node:assert/strict";
import test from "node:test";
import { buildTicketOperationCard, isSchedulingTicketType } from "../lib/ticket-operation-card";

test("scheduling tickets expose one current decision instead of raw workflow controls", () => {
  const card = buildTicketOperationCard({
    type: "改课程时间",
    status: "Confirmed",
    schedulingActions: [{ status: "READY" }, { status: "APPLIED" }],
  });
  assert.equal(isSchedulingTicketType("改课程时间"), true);
  assert.equal(card.lane, "DO_NOW");
  assert.equal(card.actionAnchor, "ticket-decision");
  assert.equal(card.unresolvedActionCount, 1);
  assert.match(card.stepDescription, /只核验一次/);
});

test("waiting and completed tickets are separated from actionable work", () => {
  const waiting = buildTicketOperationCard({
    type: "新排课",
    status: "Waiting Parent",
    nextAction: "等待家长确认周六时间",
  });
  assert.equal(waiting.lane, "WAITING");
  assert.equal(waiting.stepTitle, "跟进家长回复");
  assert.equal(waiting.stepDescription, "等待家长确认周六时间");

  const completed = buildTicketOperationCard({ type: "取消课程", status: "Completed" });
  assert.equal(completed.lane, "DONE");
  assert.equal(completed.actionAnchor, "ticket-advanced");
});

test("non-scheduling tickets still receive one clear next step", () => {
  const card = buildTicketOperationCard({
    type: "课后反馈",
    status: "New",
    nextAction: "提醒老师提交反馈",
  });
  assert.equal(card.lane, "DO_NOW");
  assert.equal(card.actionAnchor, "ticket-request");
  assert.equal(card.stepDescription, "提醒老师提交反馈");
});
