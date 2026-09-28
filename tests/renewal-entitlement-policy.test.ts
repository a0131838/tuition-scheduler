import assert from "node:assert/strict";
import test from "node:test";
import { renewalEntitlementUnit, renewalEvidenceReference, contractIdFromPurchaseNote, validMonthlyExtension } from "../lib/renewal-entitlement-policy";
test("hour, count and period rights never share a unit", () => {
  assert.equal(renewalEntitlementUnit({ type: "HOURS", note: null }), "MINUTES");
  assert.equal(renewalEntitlementUnit({ type: "HOURS", note: "[GROUP_PACK]" }), "COUNT");
  assert.equal(renewalEntitlementUnit({ type: "HOURS", note: "[GROUP_PACK_MINUTES]" }), "MINUTES");
  assert.equal(renewalEntitlementUnit({ type: "MONTHLY", note: null }), "PERIOD");
});
test("explicit clearing differs from omitted legacy references", () => {
  assert.equal(renewalEvidenceReference(undefined, "old"), "old");
  for (const v of [null, "", " "]) assert.equal(renewalEvidenceReference(v, "old"), null);
  assert.throws(() => renewalEvidenceReference({}, "old"));
});
test("only one exact contract top-up marker is valid", () => {
  assert.equal(contractIdFromPurchaseNote("memo | student-contract-renewal-topup:abc | paid"), "abc");
  assert.equal(contractIdFromPurchaseNote("unrelated student-contract-renewal-topup:abc"), null);
  assert.equal(contractIdFromPurchaseNote("student-contract-renewal-topup:a | student-contract-renewal-topup:b"), "INVALID");
});
test("monthly extension requires an actual increase and the current dates", () => {
  const target = { validFrom: new Date("2026-01-01"), validTo: new Date("2027-01-01") };
  const after = { validFrom: target.validFrom.toISOString(), validTo: target.validTo.toISOString() };
  assert.equal(validMonthlyExtension({ before: { validTo: "2026-12-01" }, after }, target), true);
  for (const before of [{ validTo: null }, { validTo: "2028-01-01" }, { validTo: "invalid" }]) assert.equal(validMonthlyExtension({ before, after }, target), false);
  assert.equal(validMonthlyExtension({ before: { validTo: "2026-12-01" }, after }, { ...target, validTo: new Date("2027-02-01") }), false);
});
