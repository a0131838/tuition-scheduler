import assert from "node:assert/strict";
import test from "node:test";
import { runRejectQuickScheduleBatch, runSkipQuickScheduleBatch } from "../lib/quick-schedule-execution";

test("reject quick schedule batch stops at first conflict and returns no created rows", async () => {
  const visited: number[] = [];
  const result = await runRejectQuickScheduleBatch({
    total: 4,
    makeRow: async (index) => {
      visited.push(index);
      if (index === 2) return { reason: "Session already exists", created: null as never };
      return { created: `row-${index}` };
    },
  });

  assert.deepEqual(visited, [0, 1, 2]);
  assert.deepEqual(result, { ok: false, reason: "Session already exists" });
});

test("skip quick schedule batch preserves later successes after a conflict", async () => {
  const result = await runSkipQuickScheduleBatch({
    total: 4,
    makeRow: async (index) => {
      if (index === 1) return { ok: false as const, reason: "Teacher conflict" };
      return { ok: true as const, created: `row-${index}` };
    },
  });

  assert.deepEqual(result.createdRows, ["row-0", "row-2", "row-3"]);
  assert.deepEqual(result.skippedReasons, ["Teacher conflict"]);
});
