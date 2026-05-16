import assert from "node:assert/strict";
import test from "node:test";
import { StudentContractFlowType } from "@prisma/client";
import {
  shouldAutoLinkOnlyInvoiceForSignedContract,
  shouldBlockAmbiguousInvoicesForSignedContract,
} from "../lib/student-contract";

test("first-purchase signing keeps invoice ambiguity guard", () => {
  assert.equal(
    shouldAutoLinkOnlyInvoiceForSignedContract({
      flowType: StudentContractFlowType.NEW_PURCHASE,
      invoiceCount: 1,
    }),
    true,
  );
  assert.equal(
    shouldBlockAmbiguousInvoicesForSignedContract({
      flowType: StudentContractFlowType.NEW_PURCHASE,
      invoiceCount: 2,
    }),
    true,
  );
});

test("renewal signing ignores historical package invoices", () => {
  assert.equal(
    shouldAutoLinkOnlyInvoiceForSignedContract({
      flowType: StudentContractFlowType.RENEWAL,
      invoiceCount: 1,
    }),
    false,
  );
  assert.equal(
    shouldBlockAmbiguousInvoicesForSignedContract({
      flowType: StudentContractFlowType.RENEWAL,
      invoiceCount: 5,
    }),
    false,
  );
});
