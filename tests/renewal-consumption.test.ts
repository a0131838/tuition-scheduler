import assert from "node:assert/strict";
import test from "node:test";
import { renewalRecentConsumption } from "../lib/renewal-consumption";
const from = new Date("2026-09-01"), now = new Date("2026-09-29");
const sessionStarts = new Map([["recent", new Date("2026-09-15")], ["older", new Date("2026-08-15")], ["other", new Date("2026-09-16")]]);
const txn = (sessionId: string | null, kind: string, deltaMinutes: number, createdAt = new Date("2026-09-20")) => ({ sessionId, kind, deltaMinutes, createdAt });
const check = (transactions: ReturnType<typeof txn>[]) => renewalRecentConsumption({ transactions, from, now, sessionStarts });
test("full and partial returns pair only with their exact lesson", () => {
  assert.deepEqual(check([txn("recent", "DEDUCT", -60), txn("recent", "ROLLBACK", 60), txn("other", "DEDUCT", -120)]), {totalUnits:120,weeklyUnits:30,needsReview:false});
  assert.equal(check([txn("recent", "DEDUCT", -120), txn("recent", "ROLLBACK", 60)]).totalUnits,60);
});
test("a recent refund of an old lesson cannot offset current lessons", () => {
  assert.equal(check([txn("older", "DEDUCT", -60,new Date("2026-08-15")),txn("older","ROLLBACK",60),txn("recent","DEDUCT",-120)]).totalUnits,120);
});
test("lesson dates, not late posting dates, determine the usage window", () => {
  assert.equal(check([txn("older","DEDUCT",-60)]).totalUnits,0);
  assert.equal(check([txn("recent","DEDUCT",-60,new Date("2026-08-31"))]).totalUnits,60);
});
test("rights adjustments and purchases never count as lessons", () => {
  assert.deepEqual(check([txn(null,"ADJUST",-3000),txn(null,"PURCHASE",6000)]), {totalUnits:0,weeklyUnits:0,needsReview:false});
});
test("missing lesson, malformed sign, over-refund and lesson adjustment remain pending", () => {
  for (const rows of [[txn(null,"DEDUCT",-60)],[txn("deleted","DEDUCT",-60)],[txn("recent","DEDUCT",60)],[txn("recent","ROLLBACK",60)],[txn("recent","DEDUCT",-60),txn("recent","ADJUST",60)]]) assert.equal(check(rows).needsReview,true);
  assert.equal(check([txn("deleted","DEDUCT",-60),txn("deleted","ROLLBACK",60)]).needsReview,false);
});
test("future postings are excluded and shared-package deductions add without allocating students", () => {
  assert.equal(check([txn("recent","DEDUCT",-60),txn("recent","DEDUCT",-60),txn("recent","ROLLBACK",120,new Date("2026-10-01"))]).totalUnits,120);
});
