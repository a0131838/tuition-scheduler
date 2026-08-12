import test from "node:test";
import assert from "node:assert/strict";
import { getSessionCompletionState } from "../lib/teacher-payroll";

const base = {
  studentId: "student-1",
  teacherId: null,
  class: { teacherId: "teacher-1", capacity: 1, oneOnOneStudentId: "student-1", enrollments: [{ studentId: "student-1" }] },
};

test("charged cancellation is payroll-ready without fake lesson feedback", () => {
  assert.deepEqual(getSessionCompletionState({
    ...base,
    attendances: [{ studentId: "student-1", status: "EXCUSED", excusedCharge: true, deductedMinutes: 60, deductedCount: 0 }],
    feedbacks: [],
  }, "teacher-1"), { completed: true, pendingReason: null });
});

test("non-charged cancellation is excluded from completed payroll", () => {
  assert.equal(getSessionCompletionState({
    ...base,
    attendances: [{ studentId: "student-1", status: "EXCUSED", excusedCharge: false, deductedMinutes: 0, deductedCount: 0 }],
    feedbacks: [],
  }, "teacher-1").completed, false);
});
