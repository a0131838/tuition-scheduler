import assert from "node:assert/strict";
import test from "node:test";
import { inspectTeacherSchedulingAvailability } from "../lib/teacher-scheduling-availability";
import { effectiveDateAvailability, type AvailabilityRange } from "../lib/teacher-availability-ranges";
import { parseAvailabilityBlockInput } from "../lib/teacher-availability-blocks";

function dbWith(options: { approvedLeave?: boolean; dateSlots?: AvailabilityRange[]; weeklySlots?: AvailabilityRange[]; blocks?: AvailabilityRange[] }) {
  const dates = async (query: any) => {
    assert.equal(query.where.teacherId, "teacher-1");
    assert.equal(query.where.date.gte.toISOString(), "2026-10-18T16:00:00.000Z");
    assert.equal(query.where.date.lte.toISOString(), "2026-10-19T15:59:59.999Z");
  };
  return {
    hrLeaveRequest: { async findFirst(query: any) {
      assert.equal(query.where.status, "APPROVED");
      assert.equal(query.where.employee.teacherId, "teacher-1");
      return options.approvedLeave ? { leaveType: "ANNUAL" } : null;
    } },
    teacherAvailabilityDate: { async findMany(query: any) { await dates(query); return options.dateSlots ?? []; } },
    teacherAvailabilityBlock: { async findMany(query: any) { await dates(query); return options.blocks ?? []; } },
    teacherAvailability: { async findMany(query: any) { assert.equal(query.where.weekday, 1); return options.weeklySlots ?? []; } },
  } as never;
}
const at = (time: string) => new Date(`2026-10-19T${time}:00+08:00`);
const inspect = (opts: Parameters<typeof dbWith>[0], from = "11:00", to = "12:30") =>
  inspectTeacherSchedulingAvailability(dbWith(opts), "teacher-1", at(from), at(to));

test("dated availability overrides a wider weekly template", async () => {
  const result = await inspect({ dateSlots: [{ startMin: 1020, endMin: 1140 }], weeklySlots: [{ startMin: 480, endMin: 1200 }] });
  assert.equal(result.source, "date"); assert.match(String(result.error), /当天特殊可用时间/);
});
test("weekly template without a confirmed date never gives normal scheduling permission", async () => {
  const result = await inspect({ weeklySlots: [{ startMin: 480, endMin: 1200 }] });
  assert.equal(result.source, "weekly"); assert.match(String(result.error), /当天尚未确认/);
  assert.match(String(result.error), /Weekly template only/);
});
test("missing date availability gives a concrete next step", async () => {
  assert.match(String((await inspect({})).error), /联系老师确认/);
});
test("confirmed date availability allows the entire lesson", async () => {
  assert.equal((await inspect({ dateSlots: [{ startMin: 600, endMin: 780 }] })).error, null);
});
test("full-day unavailability takes priority over confirmed and weekly slots", async () => {
  const result = await inspect({ dateSlots: [{ startMin: 0, endMin: 1440 }], weeklySlots: [{ startMin: 0, endMin: 1440 }], blocks: [{ startMin: 0, endMin: 1440 }] });
  assert.match(String(result.error), /明确不可用/);
});
test("partial block rejects overlap but preserves an adjacent usable slot", async () => {
  const options = { dateSlots: [{ startMin: 600, endMin: 900 }], blocks: [{ startMin: 720, endMin: 780 }] };
  assert.match(String((await inspect(options)).error), /明确不可用/);
  assert.equal((await inspect(options, "10:00", "12:00")).error, null);
  assert.equal((await inspect(options, "13:00", "15:00")).error, null);
});
test("approved leave blocks even a confirmed date", async () => {
  assert.match(String((await inspect({ approvedLeave: true, dateSlots: [{ startMin: 0, endMin: 1440 }] })).error), /已批准假期/);
});
test("adjacent confirmed slots support a continuous lesson; gaps do not", async () => {
  assert.equal((await inspect({ dateSlots: [{ startMin: 600, endMin: 720 }, { startMin: 720, endMin: 780 }] })).error, null);
  assert.match(String((await inspect({ dateSlots: [{ startMin: 600, endMin: 720 }, { startMin: 725, endMin: 780 }] })).error), /Outside confirmed/);
});
test("Singapore weekday and date boundaries do not depend on host timezone", async () => {
  const previous = process.env.TZ;
  try { for (const zone of ["UTC", "America/Los_Angeles", "Asia/Singapore"]) {
    process.env.TZ = zone;
    assert.equal((await inspect({ dateSlots: [{ startMin: 600, endMin: 780 }] })).error, null);
  } } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test("invalid or cross-day lessons are rejected without querying data", async () => {
  for (const [from, to] of [[new Date("invalid"), at("12:30")], [at("12:30"), at("11:00")], [at("23:30"), new Date("2026-10-20T00:30:00+08:00")]]) {
    assert.match(String((await inspectTeacherSchedulingAvailability({} as never, "t", from, to)).error), /Singapore day/);
  }
});
test("effective ranges preserve source inputs and handle overlapping restrictions", () => {
  const slots = [{ startMin: 600, endMin: 720 }, { startMin: 720, endMin: 900 }];
  const before = structuredClone(slots);
  assert.deepEqual(effectiveDateAvailability(slots, [{ startMin: 660, endMin: 750 }, { startMin: 730, endMin: 780 }]), [{ startMin: 600, endMin: 660 }, { startMin: 780, endMin: 900 }]);
  assert.deepEqual(slots, before);
});
test("block input validates exact dates and full-day or partial ranges", () => {
  assert.deepEqual(parseAvailabilityBlockInput({ date: "2026-10-19", fullDay: true }), { date: new Date("2026-10-18T16:00:00Z"), startMin: 0, endMin: 1440, note: null });
  for (const body of [{ date: "2026-02-30", fullDay: true }, { date: "2026-10-19", startMin: 780, endMin: 720 }, { date: "2026-10-19", startMin: -1, endMin: 600 }]) assert.throws(() => parseAvailabilityBlockInput(body));
});
