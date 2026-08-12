import assert from "node:assert/strict";
import test from "node:test";
import { inspectTeacherSchedulingAvailability } from "../lib/teacher-scheduling-availability";

function dbWith(options: {
  dateSlots?: Array<{ startMin: number; endMin: number }>;
  weeklySlots?: Array<{ startMin: number; endMin: number }>;
}) {
  return {
    teacherAvailabilityDate: {
      async findMany() {
        return options.dateSlots ?? [];
      },
    },
    teacherAvailability: {
      async findMany() {
        return options.weeklySlots ?? [];
      },
    },
  } as never;
}

test("dated availability overrides the normal weekly schedule", async () => {
  const result = await inspectTeacherSchedulingAvailability(
    dbWith({
      dateSlots: [{ startMin: 17 * 60, endMin: 19 * 60 }],
      weeklySlots: [{ startMin: 9 * 60, endMin: 21 * 60 }],
    }),
    "teacher-1",
    new Date(2026, 7, 12, 10, 0),
    new Date(2026, 7, 12, 11, 0)
  );

  assert.equal(result.source, "date");
  assert.match(String(result.error), /当天特殊可用时间/);
});

test("weekly availability is used when the date has no override", async () => {
  const result = await inspectTeacherSchedulingAvailability(
    dbWith({ weeklySlots: [{ startMin: 9 * 60, endMin: 21 * 60 }] }),
    "teacher-1",
    new Date(2026, 7, 12, 17, 40),
    new Date(2026, 7, 12, 19, 10)
  );

  assert.equal(result.error, null);
  assert.equal(result.source, "weekly");
});

test("missing availability gives an employee-facing Chinese next step", async () => {
  const result = await inspectTeacherSchedulingAvailability(
    dbWith({}),
    "teacher-1",
    new Date(2026, 7, 12, 17, 40),
    new Date(2026, 7, 12, 19, 10)
  );

  assert.match(String(result.error), /没有录入可用时间/);
  assert.match(String(result.error), /联系老师确认/);
});
