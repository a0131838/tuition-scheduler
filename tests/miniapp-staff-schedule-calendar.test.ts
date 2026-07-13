import assert from "node:assert/strict";
import test from "node:test";
import { buildCalendarConflictMap, subtractBusyTime } from "../lib/miniapp-staff-schedule-calendar";

function at(hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 6, 13, hour, minute));
}

test("calendar conflicts identify teacher, room, and student overlaps", () => {
  const result = buildCalendarConflictMap([
    {
      id: "session-a",
      startAt: at(9),
      endAt: at(10),
      teacherId: "teacher-1",
      roomId: "room-1",
      studentIds: ["student-1"],
    },
    {
      id: "session-b",
      startAt: at(9, 30),
      endAt: at(10, 30),
      teacherId: "teacher-1",
      roomId: "room-2",
      studentIds: ["student-2"],
    },
    {
      id: "session-c",
      startAt: at(9, 45),
      endAt: at(10, 15),
      teacherId: "teacher-3",
      roomId: "room-1",
      studentIds: ["student-1"],
    },
  ]);

  assert.deepEqual(Array.from(result.get("session-a") ?? []).sort(), ["学生时间重叠", "教室时间重叠", "老师时间重叠"].sort());
  assert.deepEqual(Array.from(result.get("session-b") ?? []), ["老师时间重叠"]);
  assert.deepEqual(Array.from(result.get("session-c") ?? []).sort(), ["学生时间重叠", "教室时间重叠"].sort());
});

test("calendar conflicts ignore adjacent sessions", () => {
  const result = buildCalendarConflictMap([
    { id: "a", startAt: at(9), endAt: at(10), teacherId: "t", roomId: "r", studentIds: ["s"] },
    { id: "b", startAt: at(10), endAt: at(11), teacherId: "t", roomId: "r", studentIds: ["s"] },
  ]);
  assert.equal(result.size, 0);
});

test("teacher free slots subtract merged busy ranges", () => {
  const result = subtractBusyTime(
    [{ startMin: 9 * 60, endMin: 13 * 60 }],
    [
      { startMin: 10 * 60, endMin: 11 * 60 },
      { startMin: 10 * 60 + 30, endMin: 12 * 60 },
    ],
  );
  assert.deepEqual(result, [
    { startMin: 9 * 60, endMin: 10 * 60 },
    { startMin: 12 * 60, endMin: 13 * 60 },
  ]);
});

test("teacher free slots omit fragments shorter than fifteen minutes", () => {
  const result = subtractBusyTime(
    [{ startMin: 9 * 60, endMin: 10 * 60 }],
    [{ startMin: 9 * 60 + 10, endMin: 10 * 60 }],
  );
  assert.deepEqual(result, []);
});
