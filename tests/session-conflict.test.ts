import assert from "node:assert/strict";
import test from "node:test";
import {
  isExactSessionTimeslot,
  pickStudentSessionConflict,
  sessionIncludesStudent,
} from "../lib/session-conflict";

const activeStudentId = "student-1";

test("sessionIncludesStudent sees one-on-one, enrollment, and attendance links", () => {
  assert.equal(sessionIncludesStudent({ studentId: activeStudentId }, activeStudentId), true);
  assert.equal(
    sessionIncludesStudent({ class: { oneOnOneStudentId: activeStudentId } }, activeStudentId),
    true
  );
  assert.equal(
    sessionIncludesStudent({ class: { enrollments: [{ studentId: activeStudentId }] } }, activeStudentId),
    true
  );
  assert.equal(
    sessionIncludesStudent({ attendances: [{ studentId: activeStudentId, status: "PRESENT" }] }, activeStudentId),
    true
  );
  assert.equal(sessionIncludesStudent({ studentId: "other" }, activeStudentId), false);
});

test("pickStudentSessionConflict skips fully excused self sessions", () => {
  const ignored = {
    studentId: activeStudentId,
    startAt: new Date("2026-04-27T09:30:00.000Z"),
    endAt: new Date("2026-04-27T11:00:00.000Z"),
    class: { capacity: 1, oneOnOneStudentId: activeStudentId },
    attendances: [
      {
        studentId: activeStudentId,
        status: "EXCUSED",
        excusedCharge: false,
        deductedMinutes: 0,
        deductedCount: 0,
      },
    ],
  };
  const blocking = {
    studentId: activeStudentId,
    startAt: new Date("2026-04-27T17:30:00.000Z"),
    endAt: new Date("2026-04-27T19:00:00.000Z"),
    class: { capacity: 1, oneOnOneStudentId: activeStudentId },
    attendances: [{ studentId: activeStudentId, status: "PRESENT" }],
  };

  assert.equal(pickStudentSessionConflict([ignored, blocking], activeStudentId), blocking);
});

test("isExactSessionTimeslot only matches the exact range", () => {
  const session = {
    startAt: new Date("2026-04-27T17:30:00.000Z"),
    endAt: new Date("2026-04-27T19:00:00.000Z"),
  };

  assert.equal(
    isExactSessionTimeslot(session, new Date("2026-04-27T17:30:00.000Z"), new Date("2026-04-27T19:00:00.000Z")),
    true
  );
  assert.equal(
    isExactSessionTimeslot(session, new Date("2026-04-27T17:45:00.000Z"), new Date("2026-04-27T19:00:00.000Z")),
    false
  );
});
