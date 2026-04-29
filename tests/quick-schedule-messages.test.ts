import test from "node:test";
import assert from "node:assert/strict";
import { formatStudentQuickScheduleConflictReason } from "../lib/quick-schedule-messages";

test("student quick schedule conflict explains it is not selected-room occupancy", () => {
  const message = formatStudentQuickScheduleConflictReason({
    existingSessionLabel: "Course | Kylie | Orchard Plaza / Room 1 | 2026-05-14 18:00-19:30",
    exactTimeslot: false,
  });

  assert.match(message, /学生时间冲突/);
  assert.match(message, /not selected-room conflict/);
  assert.match(message, /Room 1/);
});

test("exact quick schedule conflict keeps duplicate-session wording", () => {
  const message = formatStudentQuickScheduleConflictReason({
    existingSessionLabel: "Course | Kylie | Orchard Plaza / Room 1 | 2026-05-14 18:00-19:30",
    exactTimeslot: true,
  });

  assert.match(message, /Session already exists/);
});
