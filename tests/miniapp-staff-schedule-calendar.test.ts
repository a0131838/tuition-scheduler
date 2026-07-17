import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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

test("calendar workbench embeds the existing scheduling queue without adding a write path", () => {
  const root = path.join(process.cwd(), "miniapp", "boss-academic-parent", "pages", "staff-schedule");
  const script = fs.readFileSync(path.join(root, "staff-schedule.js"), "utf8");
  const template = fs.readFileSync(path.join(root, "staff-schedule.wxml"), "utf8");

  assert.match(script, /\/api\/miniapp\/staff\/scheduling-coordination\?/);
  assert.match(script, /staff-coordination-detail/);
  assert.match(script, /"排课协调", "排课要求", "新排课", "补课加课"/);
  assert.doesNotMatch(script, /method:\s*"(?:POST|PATCH|DELETE)"/);
  assert.match(template, /待排课工单/);
  assert.match(template, /学生、课程或工单号/);
  assert.match(script, /待关联原课程/);
  assert.match(template, /工单不是课程；只有最终确认排课后才会进入正式课表/);
});
