import assert from "node:assert/strict";
import test from "node:test";
import { buildTopUpMinutesUpdate } from "../lib/package-top-up";

test("top-up uses atomic increment when minutes already exist", () => {
  const update = buildTopUpMinutesUpdate({ remainingMinutes: 90, totalMinutes: 180 }, 45);

  assert.deepEqual(update, {
    remainingMinutes: { increment: 45 },
    totalMinutes: { increment: 45 },
  });
});

test("top-up initializes missing totals from current snapshot", () => {
  const update = buildTopUpMinutesUpdate({ remainingMinutes: 30, totalMinutes: null }, 45);

  assert.deepEqual(update, {
    remainingMinutes: { increment: 45 },
    totalMinutes: 75,
  });
});
