import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  attendanceLocksCancellation,
  cancellationAttendanceLabel,
  cancellationNotesForDisplay,
  cancellationSourceDateWindow,
  cancellationSourceStatus,
  isManualCancellationTarget,
} from "../lib/ticket-cancellation-intake";

const now = new Date("2026-08-16T08:00:00.000Z");

test("cancellation source lookup accepts the last 7 days through the next 90 days", () => {
  assert.equal(cancellationSourceDateWindow("2026-08-09", now)?.dateText, "2026-08-09");
  assert.equal(cancellationSourceDateWindow("2026-11-14", now)?.dateText, "2026-11-14");
  assert.equal(cancellationSourceDateWindow("2026-08-08", now), null);
  assert.equal(cancellationSourceDateWindow("2026-11-15", now), null);
});

test("started and attendance-locked lessons remain visible but cannot auto execute", () => {
  assert.deepEqual(
    cancellationSourceStatus({ startAt: new Date("2026-08-16T09:00:00.000Z"), endAt: new Date("2026-08-16T10:00:00.000Z") }, now),
    { status: "UPCOMING", label: "未开始，可处理", canAutoExecute: true }
  );
  assert.equal(cancellationSourceStatus({ startAt: new Date("2026-08-16T07:30:00.000Z"), endAt: new Date("2026-08-16T09:00:00.000Z") }, now).status, "IN_PROGRESS");
  assert.equal(cancellationSourceStatus({ startAt: new Date("2026-08-16T05:00:00.000Z"), endAt: new Date("2026-08-16T06:00:00.000Z") }, now).status, "ENDED");
  assert.equal(cancellationSourceStatus({ startAt: new Date("2026-08-16T09:00:00.000Z"), endAt: new Date("2026-08-16T10:00:00.000Z"), attendanceLocked: true }, now).status, "ATTENDANCE_LOCKED");
});

test("manual cancellation is accepted only with an exact date-time and course label", () => {
  assert.equal(isManualCancellationTarget({ actionType: "CANCEL_SESSION", requestedStartAt: "2026-08-16T13:00:00+08:00", courseLabel: "A-Level 生物" }, now), true);
  assert.equal(isManualCancellationTarget({ actionType: "CANCEL_SESSION", requestedStartAt: null, courseLabel: "A-Level 生物" }, now), false);
  assert.equal(isManualCancellationTarget({ actionType: "CANCEL_SESSION", requestedStartAt: "2026-08-16T13:00:00+08:00", courseLabel: "" }, now), false);
  assert.equal(isManualCancellationTarget({ actionType: "RESCHEDULE_SESSION", requestedStartAt: "2026-08-16T13:00:00+08:00", courseLabel: "A-Level 生物" }, now), false);
  assert.equal(isManualCancellationTarget({ actionType: "CANCEL_SESSION", requestedStartAt: "2026-11-15T13:00:00+08:00", courseLabel: "A-Level 生物" }, now), false);
});

test("web and miniapp intake expose date lookup, manual fallback and review-only copy", () => {
  const web = readFileSync("app/tickets/intake/GuidedIntakeForm.tsx", "utf8");
  const miniapp = readFileSync("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.wxml", "utf8");
  const miniappScript = readFileSync("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.js", "utf8");
  const webRoute = readFileSync("app/api/tickets/intake/[token]/route.ts", "utf8");
  const miniappRoute = readFileSync("app/api/miniapp/staff/parent-requests/route.ts", "utf8");

  for (const source of [web, miniapp]) {
    assert.match(source, /最近 7 天至未来 90 天/);
    assert.match(source, /手动记录/);
    assert.match(source, /不会自动取消课程/);
    assert.match(source, /请假方/);
    assert.match(source, /收到通知/);
  }
  assert.match(miniappScript, /sourceSessions/);
  assert.match(miniapp, /待教务匹配原课程，禁止自动执行/);
  assert.match(webRoute, /isManualCancellationTarget/);
  assert.match(miniappRoute, /isManualCancellationTarget/);
  assert.match(webRoute, /status: reviewReason \? "NEED_INFO"/);
  assert.match(miniappRoute, /status: reviewReason \? "NEED_INFO"/);
});


test("uncharged leave is described accurately without enabling automatic cancellation", () => {
  const attendance = { status: "EXCUSED", deductedMinutes: 0, deductedCount: 0, packageId: null, excusedCharge: false };
  const state = cancellationSourceStatus({ startAt: new Date("2026-08-16T09:00:00Z"), endAt: new Date("2026-08-16T10:00:00Z"), attendanceLocked: attendanceLocksCancellation(attendance), attendance }, now);
  assert.equal(state.label, "已登记请假，未扣课");
  assert.equal(state.status, "ATTENDANCE_LOCKED");
  assert.equal(state.canAutoExecute, false);
});

test("deductions take precedence over leave and configured charges are not called actual deductions", () => {
  for (const deduction of [{ deductedMinutes: 90, deductedCount: 0 }, { deductedMinutes: 0, deductedCount: 1 }]) {
    assert.equal(cancellationAttendanceLabel({ status: "EXCUSED", excusedCharge: false, ...deduction }), "已有扣课记录，需管理员处理");
  }
  assert.equal(cancellationAttendanceLabel({ status: "EXCUSED", deductedMinutes: 0, deductedCount: 0, excusedCharge: true }), "已设置请假收费，需管理员核实扣课结果");
  assert.doesNotMatch(cancellationAttendanceLabel({ status: "EXCUSED" }), /未扣课/);
});

test("presentation details leave all attendance cancellation guards unchanged", () => {
  for (const attendance of [null, { status: "UNMARKED", deductedMinutes: 0, deductedCount: 0, packageId: null, excusedCharge: false }, { status: "UNMARKED", packageId: "pkg" }, { status: "PRESENT" }, { status: "EXCUSED", deductedMinutes: 0, deductedCount: 0 }, { status: "EXCUSED", deductedMinutes: 90, deductedCount: 0 }]) {
    const input = { startAt: new Date("2026-08-16T09:00:00Z"), endAt: new Date("2026-08-16T10:00:00Z"), attendanceLocked: attendanceLocksCancellation(attendance) };
    const before = cancellationSourceStatus(input, now);
    const after = cancellationSourceStatus({ ...input, attendance }, now);
    assert.equal(after.status, before.status);
    assert.equal(after.canAutoExecute, before.canAutoExecute);
  }
});

test("historical system notes are explicitly historical while staff content is preserved", () => {
  const notes = "请假方：学生/家长\n通知时间：2026-09-16 12:32\n去学校提交论文\n系统状态：已有点名或扣课，需管理员处理";
  const display = cancellationNotesForDisplay(notes);
  assert.equal(display, notes.replace("系统状态：", "提交时状态（非实时）："));
  assert.equal(cancellationNotesForDisplay(display), display);
});
