import assert from "node:assert/strict";
import test from "node:test";
import { hasNonVoidedAgreementLink } from "../lib/invoice-deletion-safety";

test("active or signed agreement links block invoice deletion", () => {
  assert.equal(hasNonVoidedAgreementLink([{ status: "SIGNED" }]), true);
  assert.equal(hasNonVoidedAgreementLink([{ status: "INVOICE_CREATED" }]), true);
  assert.equal(hasNonVoidedAgreementLink([{ status: "VOID" }, { status: "SIGNED" }]), true);
});

test("only voided agreement links allow an unreceipted invoice draft to be deleted", () => {
  assert.equal(hasNonVoidedAgreementLink([]), false);
  assert.equal(hasNonVoidedAgreementLink([{ status: "VOID" }]), false);
  assert.equal(hasNonVoidedAgreementLink([{ status: "void" }, { status: "VOID" }]), false);
});
