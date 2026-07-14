import assert from "node:assert/strict";
import test from "node:test";
import { summarizePartnerCreditNotes, validatePartnerCreditLines } from "../lib/partner-credit-notes";

const invoice = {
  totalAmount: 18_540,
  lines: [
    { id: "march", description: "March services", totalAmount: 11_520 },
    { id: "april", description: "April services", totalAmount: 4_500 },
    { id: "may", description: "May services", totalAmount: 2_520 },
  ],
} as any;

test("partner credit note supports the New Oriental SGD 270 partial correction", () => {
  const result = validatePartnerCreditLines({
    invoice,
    requestedLines: [{ sourceInvoiceLineId: "april", totalAmount: 270, gstAmount: 0 }],
  });

  assert.equal(result.amount, 270);
  assert.equal(result.gstAmount, 0);
  assert.equal(result.totalAmount, 270);
  assert.deepEqual(result.lines, [
    {
      sourceInvoiceLineId: "april",
      description: "April services",
      quantity: 1,
      amount: 270,
      gstAmount: 0,
      totalAmount: 270,
    },
  ]);
});

test("partner credit note prevents line-level over-credit after an earlier draft or issued note", () => {
  assert.throws(
    () => validatePartnerCreditLines({
      invoice,
      requestedLines: [{ sourceInvoiceLineId: "april", totalAmount: 4_231, gstAmount: 0 }],
      existingUsage: [{ sourceInvoiceLineId: "april", totalAmount: 270 }],
    }),
    /exceeds the remaining SGD 4230\.00/,
  );
});

test("partner credit note rejects invalid GST and unknown invoice lines", () => {
  assert.throws(
    () => validatePartnerCreditLines({
      invoice,
      requestedLines: [{ sourceInvoiceLineId: "april", totalAmount: 100, gstAmount: 101 }],
    }),
    /GST credit must be between zero and the credited total/,
  );
  assert.throws(
    () => validatePartnerCreditLines({
      invoice,
      requestedLines: [{ sourceInvoiceLineId: "missing", totalAmount: 100, gstAmount: 0 }],
    }),
    /selected invoice line no longer exists/,
  );
});

test("partner invoice net summary includes only issued non-void credit notes", () => {
  const summary = summarizePartnerCreditNotes([
    { sourceInvoiceId: "invoice-1", status: "ISSUED", totalAmount: 270 },
    { sourceInvoiceId: "invoice-1", status: "DRAFT", totalAmount: 50 },
    { sourceInvoiceId: "invoice-1", status: "VOID", totalAmount: 30 },
    { sourceInvoiceId: "invoice-2", status: "ISSUED", totalAmount: 100 },
  ]);

  assert.equal(summary.get("invoice-1"), 270);
  assert.equal(summary.get("invoice-2"), 100);
});
