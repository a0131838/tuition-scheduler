import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { packageInvoiceApprovalMatchesInvoice } from "../lib/package-finance-gate";

test("an approval is reusable only for the invoice it was created for", () => {
  assert.equal(packageInvoiceApprovalMatchesInvoice(null, "invoice-new"), false);
  assert.equal(packageInvoiceApprovalMatchesInvoice({ invoiceId: "invoice-old" }, "invoice-new"), false);
  assert.equal(packageInvoiceApprovalMatchesInvoice({ invoiceId: "invoice-new" }, "invoice-new"), true);
});

test("contract signing replaces a stale pending approval with one for the signed invoice", async () => {
  const source = await readFile(new URL("../lib/student-contract.ts", import.meta.url), "utf8");
  assert.match(source, /packageInvoiceApprovalMatchesInvoice\(currentApproval, input\.invoiceId\)/);
  assert.match(source, /removeStalePendingPackageInvoiceApprovals\(\{/);
  assert.match(source, /currentApproval = await createPackageInvoiceApproval\(\{/);
});

test("deleting an invoice also removes its pending approval", async () => {
  const source = await readFile(new URL("../lib/student-parent-billing.ts", import.meta.url), "utf8");
  assert.match(source, /packageInvoiceApproval\.deleteMany\(\{/);
  assert.match(source, /invoiceId: input\.invoiceId\.trim\(\),\s+status: "PENDING_MANAGER"/);
});
