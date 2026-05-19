import assert from "node:assert/strict";
import test from "node:test";
import { resolveOnlineSettlementTrancheMinutes } from "../lib/partner-settlement";

test("online partner settlement waits for active incomplete packages", () => {
  assert.deepEqual(
    resolveOnlineSettlementTrancheMinutes({
      packageStatus: "ACTIVE",
      purchasedMinutes: 900,
      consumedMinutes: 810,
      remainingMinutes: 90,
    }),
    { settledMinutes: 0, forfeitedMinutes: 0, isPartialCloseout: false }
  );
});

test("online partner settlement allows expired partial closeout by purchased minutes", () => {
  assert.deepEqual(
    resolveOnlineSettlementTrancheMinutes({
      packageStatus: "EXPIRED",
      purchasedMinutes: 900,
      consumedMinutes: 810,
      remainingMinutes: 90,
    }),
    { settledMinutes: 900, forfeitedMinutes: 90, isPartialCloseout: true }
  );
});

test("online partner settlement keeps fully consumed package behavior unchanged", () => {
  assert.deepEqual(
    resolveOnlineSettlementTrancheMinutes({
      packageStatus: "ACTIVE",
      purchasedMinutes: 900,
      consumedMinutes: 900,
      remainingMinutes: 0,
    }),
    { settledMinutes: 900, forfeitedMinutes: 0, isPartialCloseout: false }
  );
});
