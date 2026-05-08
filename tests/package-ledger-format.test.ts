import assert from "node:assert/strict";
import { test } from "node:test";

import { formatPackageLedgerMinutes } from "@/lib/package-ledger-format";

test("package ledger minute formatter handles negative deductions by absolute hours", () => {
  assert.equal(formatPackageLedgerMinutes(-90), "-1h 30m");
  assert.equal(formatPackageLedgerMinutes(-150), "-2h 30m");
  assert.equal(formatPackageLedgerMinutes(-60), "-1h");
  assert.equal(formatPackageLedgerMinutes(-30), "-30m");
});

test("package ledger minute formatter keeps positive balances unchanged", () => {
  assert.equal(formatPackageLedgerMinutes(0), "0m");
  assert.equal(formatPackageLedgerMinutes(90), "1h 30m");
  assert.equal(formatPackageLedgerMinutes(1200), "20h");
});
