import assert from "node:assert/strict";
import test from "node:test";
import { getFeedbackDueAt, getFeedbackSubmissionStatus, getFeedbackOverdueMinutes, isFeedbackOverdue } from "../lib/feedback-timing";
import { lessonWorkStatus } from "../lib/lesson-work-status";

const end = new Date("2026-11-17T04:30:00Z");
const created = new Date("2026-11-22T11:35:05.743Z");
const now = new Date("2026-11-22T12:00:00Z");
const lesson = () => ({
  endAt: end, feedbackAvailableAt: created, studentId: "wang", student: { id: "wang", name: "Training student" },
  class: { capacity: 1, teacherId: "teacher", enrollments: [{ studentId: "other" }, { studentId: "wang" }] },
  attendances: [{ studentId: "wang", status: "PRESENT", deductedMinutes: 90, deductedCount: 0, waiveDeduction: false, package: { type: "HOURS" } }],
  feedbacks: [] as Array<{ teacherId: string; status: string; submittedAt?: Date; isProxyDraft?: boolean; reviewStatus?: string }>,
});

test("backfilled lesson has twelve hours from real creation; ordinary and unknown legacy creation retain original deadline", () => {
  assert.equal(getFeedbackDueAt(end, created).toISOString(), "2026-11-22T23:35:05.743Z");
  assert.equal(getFeedbackDueAt(end, null).toISOString(), "2026-11-17T16:30:00.000Z");
  assert.equal(+getFeedbackDueAt(end, new Date("2026-11-01")), +getFeedbackDueAt(end));
  assert.equal(+getFeedbackDueAt(end, "invalid"), +getFeedbackDueAt(end));
});

test("web, mini submission and reminder timing share the exact same boundary", () => {
  const due = getFeedbackDueAt(end, created), after = new Date(+due + 1);
  assert.equal(isFeedbackOverdue(end, due, created), false);
  assert.equal(getFeedbackSubmissionStatus(end, due, created), "ON_TIME");
  assert.equal(isFeedbackOverdue(end, after, created), true);
  assert.equal(getFeedbackSubmissionStatus(end, after, created), "LATE");
  assert.equal(getFeedbackOverdueMinutes(end, now, created), 0);
  assert.equal(getFeedbackOverdueMinutes(end, new Date(+due + 60000), created), 1);
});

test("already-deducted historical lesson stays feedback-pending without becoming deduction-pending or immediately overdue", () => {
  const input = lesson(), before = structuredClone(input), work = lessonWorkStatus(input, "teacher", now, "ZH");
  assert.equal(work.attendanceLabel, "点名：1/1");
  assert.equal(work.deductionLabel, "已扣课：90分钟");
  assert.equal(work.deductionNeedsReview, false);
  assert.equal(work.feedbackPending, true);
  assert.equal(work.feedbackOverdue, false);
  assert.equal(work.backfilled, true);
  assert.match(work.feedbackHint, /请勿重复扣课/);
  for (let i = 0; i < 5; i++) lessonWorkStatus(input, "teacher", now);
  assert.deepEqual(input, before);
});

test("pending publication is submitted, other lesson teacher and proxy draft cannot satisfy feedback", () => {
  const input = lesson();
  input.feedbacks = [{ teacherId: "teacher", status: "ON_TIME", submittedAt: now, reviewStatus: "PENDING_REVIEW" }];
  assert.equal(lessonWorkStatus(input, "teacher", now, "ZH").feedbackLabel, "反馈已提交");
  assert.equal(lessonWorkStatus(input, "teacher", now).feedbackPending, false);
  input.feedbacks[0].teacherId = "other";
  assert.equal(lessonWorkStatus(input, "teacher", now).feedbackPending, true);
  input.feedbacks[0] = { teacherId: "teacher", status: "ON_TIME", isProxyDraft: true };
  assert.equal(lessonWorkStatus(input, "teacher", now).feedbackState, "PROXY_DRAFT");
});

test("legacy late flag on a proven backfill is displayed against the evidenced deadline without rewriting it", () => {
  const input = lesson();
  input.feedbacks = [{ teacherId: "teacher", status: "LATE", submittedAt: now }];
  const before = structuredClone(input);
  assert.equal(lessonWorkStatus(input, "teacher", now, "ZH").feedbackLabel, "反馈已提交");
  assert.deepEqual(input, before);
});

test("group lesson counts, monthly packages, waivers and missing deduction evidence remain distinct", () => {
  const input = lesson();
  input.attendances[0].deductedMinutes = 0;
  input.attendances[0].deductedCount = 1;
  assert.equal(lessonWorkStatus(input, "teacher", now, "ZH").deductionLabel, "已扣课：1次");
  input.attendances[0].deductedCount = 0;
  assert.equal(lessonWorkStatus(input, "teacher", now).deductionNeedsReview, true);
  input.attendances[0].package.type = "MONTHLY";
  assert.equal(lessonWorkStatus(input, "teacher", now, "ZH").deductionLabel, "无需扣课");
  input.attendances[0].package.type = "HOURS";
  input.attendances[0].waiveDeduction = true;
  assert.equal(lessonWorkStatus(input, "teacher", now, "ZH").deductionLabel, "无需扣课");
  assert.equal(lessonWorkStatus(input, "teacher", now).feedbackPending, true);
});
