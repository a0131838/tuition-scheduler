import assert from "node:assert/strict";
import test from "node:test";
import { toTutorCostCutoffRange } from "../lib/teacher-payroll";

test("tutor cost cutoff range includes 15th through month end in Singapore time", () => {
  const range = toTutorCostCutoffRange("2026-04");

  assert.equal(range?.start.toISOString(), "2026-04-14T16:00:00.000Z");
  assert.equal(range?.end.toISOString(), "2026-04-30T16:00:00.000Z");
});

test("tutor cost cutoff range handles December rollover", () => {
  const range = toTutorCostCutoffRange("2026-12");

  assert.equal(range?.start.toISOString(), "2026-12-14T16:00:00.000Z");
  assert.equal(range?.end.toISOString(), "2026-12-31T16:00:00.000Z");
});
