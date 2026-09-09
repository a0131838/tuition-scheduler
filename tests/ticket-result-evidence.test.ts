import assert from "node:assert/strict";
import test from "node:test";
import { checkResultEvidence, explicitLessonCount, needsMakeupFollowup } from "../lib/ticket-result-evidence";
import { ticketCommandScopeError } from "../lib/ticket-command-scope";

const lesson = { id: "s1", startAt: new Date("2026-09-06T05:00:00Z"), endAt: new Date("2026-09-06T06:30:00Z"), teacherId: "t1", courseLabel: "大学 / 计算机", cancelled: false, charge: false };
test("explicit single request never expands into four cancellations", () => {
  const actions = [{ actionType: "CANCEL_SESSION", status: "READY", sourceSessionId: "s1" }];
  assert.equal(ticketCommandScopeError(actions, [{ commandType: "CANCEL_SESSION", sessionId: "s1" }]), null);
  assert.ok(ticketCommandScopeError(actions, ["s1", "s2", "s3", "s4"].map((sessionId) => ({ commandType: "CANCEL_SESSION", sessionId }))));
  assert.ok(ticketCommandScopeError(actions, [{ commandType: "CANCEL_SESSION", targetId: "other-student-session" }]));
  assert.ok(ticketCommandScopeError([{ ...actions[0], status: "CANCELLED" }], [{ commandType: "CANCEL_SESSION", sessionId: "s1" }]));
});
test("quantity parsing ignores dates and distinguishes two lessons from package hours", () => {
  assert.equal(explicitLessonCount("9月6日13.00以后安排2节共90分钟的计算机课"), 2);
  assert.equal(explicitLessonCount("两节课"), 2);
  assert.equal(explicitLessonCount("把第2节课改时间"), 1);
  assert.equal(explicitLessonCount("10个课时5次"), 5);
  assert.equal(explicitLessonCount("9月18日前一共20课时"), 1);
});
test("past attended lessons can prove an existing schedule without changing attendance", () => {
  const result = checkResultEvidence({ actionType: "CREATE_SESSION", requestedStartAt: lesson.startAt, courseLabel: "大学 / 计算机" }, [lesson]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.complete, true);
});
test("two-lesson request remains incomplete after linking just one", () => {
  const result = checkResultEvidence({ actionType: "CREATE_SESSION", notes: "安排两节课" }, [lesson]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.complete, false);
  assert.ok(checkResultEvidence({ actionType: "CREATE_SESSION", notes: "安排1节课" }, [lesson, { ...lesson, id: "s2" }]).errors.length);
});
test("90 total versus two 90-minute lessons requires confirmed change", () => {
  const action = { actionType: "CREATE_SESSION", notes: "安排2节共90分钟的计算机课" };
  const lessons = [lesson, { ...lesson, id: "s2" }];
  assert.ok(checkResultEvidence(action, lessons).errors.length);
  assert.deepEqual(checkResultEvidence(action, lessons, true).errors, []);
  assert.equal(checkResultEvidence(action, lessons, true).totalMinutes, 180);
});
test("wrong date/teacher/subject cannot be silently used to close a ticket", () => {
  const result = checkResultEvidence({ actionType: "CREATE_SESSION", requestedStartAt: new Date("2026-10-13T11:00:00Z"), requestedTeacherId: "t2", courseLabel: "面试" }, [lesson]);
  assert.equal(result.differences.length, 3);
  assert.ok(result.errors.length);
});
test("cancellation must actually exist and cannot be overridden by a note", () => {
  const action = { actionType: "CANCEL_SESSION", sourceSessionId: "s1", chargePolicy: "NO_CHARGE" };
  assert.ok(checkResultEvidence(action, [lesson], true).errors.length);
  assert.deepEqual(checkResultEvidence(action, [{ ...lesson, cancelled: true }]).errors, []);
  assert.ok(checkResultEvidence(action, [{ ...lesson, cancelled: true, charge: true }], true).errors.length);
  assert.ok(checkResultEvidence(action, [{ ...lesson, id: "s2", cancelled: true }]).errors.length);
});
test("cancelled lessons cannot prove new scheduling, rescheduling or replacement", () => {
  for (const actionType of ["CREATE_SESSION", "RESCHEDULE_SESSION", "REPLACE_TEACHER"]) {
    assert.ok(checkResultEvidence({ actionType, sourceSessionId: "s1", requestedStartAt: lesson.startAt, requestedTeacherId: "t1" }, [{ ...lesson, cancelled: true }], true).errors.length);
  }
});
test("cancel and makeup cannot close as a single cancellation", () => {
  assert.equal(needsMakeupFollowup({ actionType: "CANCEL_SESSION", notes: "9月6日取消调整到9月13日" }), true);
  assert.equal(needsMakeupFollowup({ actionType: "CANCEL_SESSION", replacementRequired: true }), true);
  assert.equal(needsMakeupFollowup({ actionType: "CANCEL_SESSION", notes: "不需要补课" }), false);
});
