import assert from "node:assert/strict";
import test from "node:test";
import {
  FEEDBACK_WINDOW_HOURS,
  getFeedbackDueAt,
  getFeedbackOverdueCutoff,
  getFeedbackOverdueMinutes,
  getFeedbackSubmissionStatus,
  isFeedbackOverdue,
} from "../lib/feedback-timing";

test("feedback due time is 12 hours after class end", () => {
  const endAt = new Date("2026-04-15T10:30:00.000Z");
  const dueAt = getFeedbackDueAt(endAt);

  assert.equal(FEEDBACK_WINDOW_HOURS, 12);
  assert.equal(dueAt.toISOString(), "2026-04-15T22:30:00.000Z");
});

test("feedback is not overdue until after the exact due time", () => {
  const endAt = new Date("2026-04-15T10:30:00.000Z");

  assert.equal(isFeedbackOverdue(endAt, new Date("2026-04-15T22:30:00.000Z")), false);
  assert.equal(isFeedbackOverdue(endAt, new Date("2026-04-15T22:30:00.001Z")), true);
});

test("feedback submission status uses the same cutoff", () => {
  const endAt = new Date("2026-04-15T10:30:00.000Z");

  assert.equal(getFeedbackSubmissionStatus(endAt, new Date("2026-04-15T22:29:59.999Z")), "ON_TIME");
  assert.equal(getFeedbackSubmissionStatus(endAt, new Date("2026-04-15T22:30:00.001Z")), "LATE");
});

test("feedback overdue cutoff and minutes stay aligned", () => {
  const now = new Date("2026-04-16T08:00:00.000Z");
  const cutoff = getFeedbackOverdueCutoff(now);

  assert.equal(cutoff.toISOString(), "2026-04-15T20:00:00.000Z");
  assert.equal(getFeedbackOverdueMinutes(new Date("2026-04-15T06:00:00.000Z"), now), 840);
  assert.equal(getFeedbackOverdueMinutes(new Date("2026-04-15T21:30:00.000Z"), now), 0);
});
