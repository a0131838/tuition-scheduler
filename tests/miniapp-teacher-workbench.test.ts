import assert from "node:assert/strict";
import test from "node:test";
import {
  miniappTeacherDurationText,
  miniappTeacherExpenseStatusText,
  miniappTeacherMonthRange,
  validateMiniappTeacherAvailabilityDate,
} from "../lib/miniapp-teacher-workbench";

test("teacher workbench uses the requested month and rolls December correctly", () => {
  const range = miniappTeacherMonthRange("2026-12", new Date("2026-07-13T00:00:00Z"));
  assert.equal(range.month, "2026-12");
  assert.equal(range.start.toISOString(), "2026-11-30T16:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-12-31T16:00:00.000Z");
});

test("teacher workbench falls back to the current business month", () => {
  const range = miniappTeacherMonthRange("invalid", new Date("2026-07-12T18:00:00Z"));
  assert.equal(range.month, "2026-07");
});

test("teacher availability is limited to today through the next 62 days", () => {
  const now = new Date("2026-07-13T04:00:00Z");
  assert.equal(validateMiniappTeacherAvailabilityDate("2026-07-13", now).ok, true);
  assert.equal(validateMiniappTeacherAvailabilityDate("2026-09-13", now).ok, true);
  assert.equal(validateMiniappTeacherAvailabilityDate("2026-09-14", now).ok, false);
  assert.equal(validateMiniappTeacherAvailabilityDate("2026-07-12", now).ok, false);
});

test("teacher workbench formats duration and expense status for mobile", () => {
  assert.equal(miniappTeacherDurationText(150), "2小时30分钟");
  assert.equal(miniappTeacherDurationText(60), "1小时");
  assert.equal(miniappTeacherExpenseStatusText("REJECTED"), "已驳回，需补充");
});
