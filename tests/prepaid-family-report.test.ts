import test from "node:test";
import assert from "node:assert/strict";
import {
  remainingLots,
  settledMinutes,
  unearnedCents,
  reportDate,
  type Movement,
} from "../lib/prepaid-family-calculation";
import { prepaidBalanceCsv } from "../lib/prepaid-balance-csv";
import { summarizePrepaid, type PrepaidRow } from "../lib/prepaid-family-report";

const tx = (
  id: string,
  kind: string,
  deltaMinutes: number,
  sessionId: string | null = null,
  note: string | null = null,
): Movement => ({
  id,
  kind,
  deltaMinutes,
  sessionId,
  note,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  deltaAmount: null,
});
test("as-of dates allow leap days, reject rollover and future dates and preserve month-end links", () => {
  assert.equal(reportDate("2024-02-29", undefined, "2026-11-25"), "2024-02-29");
  for (const bad of ["2026-02-29", "2026-02-30", "2026-11-26", "2026-10", ""])
    assert.equal(reportDate(bad, undefined, "2026-11-25"), null);
  assert.equal(reportDate(undefined, "2026-10", "2026-11-25"), "2026-10-31");
});
test("early renewals keep their own rate and rollbacks restore usage without issuing new credits", () => {
  const a = remainingLots([
    tx("old", "PURCHASE", 120),
    tx("class", "DEDUCT", -90, "s"),
    tx("renewal", "PURCHASE", 600),
    tx("cancel", "ROLLBACK", 90, "s"),
  ]);
  assert.deepEqual(
    a.lots.map((l) => l.left),
    [120, 600],
  );
  assert.equal(a.minutes, 720);
  assert.equal(a.issues.size, 0);
  assert.equal(unearnedCents(100000, 100000, 100000, 600, 300), 50000);
});
test("partial receipts first cover taught tuition; exclude GST; a zero is computable", () => {
  assert.equal(unearnedCents(10000, 10900, 5450, 120, 90), 2500);
  assert.equal(unearnedCents(10000, 10900, 2725, 120, 60), 0);
});
test("gift notes on purchases, adjustments and orphan reversals are held for review", () => {
  const a = remainingLots([
    tx("a", "PURCHASE", 600, null, "Buy 40 Gift 4 h"),
    tx("b", "ADJUST", 60),
    tx("c", "ROLLBACK", 60, "s"),
  ]);
  assert.deepEqual([...a.issues].sort(), ["adjustment", "gift", "usage"]);
});
test("dated settlement carries subsequent lessons exactly once including delayed settlement postings", () => {
  const s = [
    {
      effectiveDate: "2026-10-02",
      reference: "statement",
      throughTxn: "anchor",
      remainingMinutes: 3885,
      includedPostingIds: ["paid", "gift"],
    },
  ];
  const txns = [
    tx("anchor", "ROLLBACK", 90),
    tx("after", "DEDUCT", -1890, "a"),
    tx("paid", "PURCHASE", 6000),
    tx("gift", "GIFT", 360),
  ];
  assert.equal(settledMinutes(txns, s, "2026-10-01").minutes, null);
  assert.equal(settledMinutes(txns.slice(0, 2), s, "2026-10-12").minutes, 1995);
  assert.equal(settledMinutes(txns, s, "2026-10-31").minutes, 1995);
  assert.equal(settledMinutes([...txns, tx("future", "PURCHASE", 600)], s, "2026-11-10").minutes, null);
  assert.equal(settledMinutes(txns.slice(1), s, "2026-10-31").minutes, null);
});
test("pending money stays blank, arrears stay separate and partial sums are comparable only on verified rows", () => {
  const r: PrepaidRow = {
    id: "p1",
    familyId: "f",
    family: "=Family",
    course: "A",
    minutes: 90,
    legacyCents: 120,
    legacyMinutes: 90,
    prepaidCents: 500,
    issues: [],
    evidence: [],
  };
  const pend: PrepaidRow = { ...r, id: "p2", minutes: -30, prepaidCents: null, issues: ["receipt"] };
  const sum = summarizePrepaid([r, pend]);
  assert.equal(sum.verified, 500);
  assert.equal(sum.legacy, 240);
  assert.equal(sum.comparableLegacy, 120);
  assert.equal(sum.minutes, 90);
  assert.equal(sum.arrears, 30);
  const csv = prepaidBalanceCsv("2026-10-31", [r, pend]);
  assert.match(csv, /"'=Family"/);
  assert.match(csv, /"1.20","","","待核对/);
});
