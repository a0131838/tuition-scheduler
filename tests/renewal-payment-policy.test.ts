import assert from "node:assert/strict";
import test from "node:test";
import { renewalPaymentSummary, requiresRenewalPaymentVerification } from "../lib/renewal-payment-policy";
test("only approved cash counts; partial/pending/rejected cannot confirm full payment", () => {
  assert.equal(renewalPaymentSummary(100, 0, []).state, "UNPAID");
  assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount: 100, approval: "PENDING" }]).state, "APPROVAL_PENDING");
  assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount: 100, approval: "REJECTED" }]).state, "REJECTED");
  assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount: 99.99, approval: "COMPLETED" }]).state, "PARTIAL");
  assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount: 60, approval: "COMPLETED" }, { id: "b", amount: 40, approval: "COMPLETED" }]).state, "PAID");
});
test("issued credit reduces amount due but credit alone is not payment", () => {
  assert.equal(renewalPaymentSummary(100, 100, []).state, "UNPAID");
  assert.equal(renewalPaymentSummary(100, 40, [{ id: "a", amount: 60, approval: "COMPLETED" }]).state, "PAID");
});
test("invalid or duplicate receipt values cannot inflate payment", () => {
  for (const amount of [NaN, Infinity, -1, 0]) assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount, approval: "COMPLETED" }]).state, "INVALID");
  assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount: 60, approval: "COMPLETED" }, { id: "a", amount: 60, approval: "COMPLETED" }]).state, "INVALID");
  assert.equal(renewalPaymentSummary(100, 101, []).state, "INVALID");
});
test("cent arithmetic is stable and rejected extra receipt does not erase already approved cash", () => {
  assert.equal(renewalPaymentSummary(0.3, 0, [{ id: "a", amount: 0.1, approval: "COMPLETED" }, { id: "b", amount: 0.2, approval: "COMPLETED" }]).state, "PAID");
  assert.equal(renewalPaymentSummary(100, 0, [{ id: "a", amount: 100, approval: "COMPLETED" }, { id: "b", amount: 1, approval: "REJECTED" }]).state, "PAID");
});
test("direct activation cannot bypass payment, postpaid activation does not assert payment, historical note edits remain possible", () => {
  const base = { previousStatus: "PAYMENT_PENDING", status: "PACKAGE_ACTIVE", evidenceChanged: false, postpaid: false };
  assert.equal(requiresRenewalPaymentVerification(base), true);
  assert.equal(requiresRenewalPaymentVerification({ ...base, postpaid: true }), false);
  assert.equal(requiresRenewalPaymentVerification({ ...base, postpaid: true, status: "PAYMENT_CONFIRMED" }), true);
  assert.equal(requiresRenewalPaymentVerification({ ...base, previousStatus: "PACKAGE_ACTIVE" }), false);
  assert.equal(requiresRenewalPaymentVerification({ ...base, previousStatus: "PACKAGE_ACTIVE", evidenceChanged: true }), true);
});
