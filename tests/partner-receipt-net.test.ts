import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  buildPartnerReceiptAdjustmentNote,
  calculatePartnerReceiptNet,
} from "@/lib/partner-receipt-net";

test("issued credit note reduces all receipt values to the adjusted net", () => {
  const calculated = calculatePartnerReceiptNet(
    { amount: 18540, gstAmount: 0, totalAmount: 18540 },
    [
      {
        status: "ISSUED",
        creditNoteNo: "RGT-CN-202607-0001",
        amount: 270,
        gstAmount: 0,
        totalAmount: 270,
      },
    ],
  );

  assert.deepEqual(calculated, {
    originalAmount: 18540,
    originalGstAmount: 0,
    originalTotalAmount: 18540,
    creditAmount: 270,
    creditGstAmount: 0,
    creditTotalAmount: 270,
    adjustedAmount: 18270,
    adjustedGstAmount: 0,
    adjustedTotalAmount: 18270,
    creditNoteNos: ["RGT-CN-202607-0001"],
  });
  assert.equal(
    buildPartnerReceiptAdjustmentNote("RGT-202606-0019", calculated),
    "Original invoice RGT-202606-0019 SGD 18540.00; less RGT-CN-202607-0001 SGD 270.00; net amount received SGD 18270.00.",
  );
});

test("draft and void credit notes do not reduce a receipt", () => {
  const calculated = calculatePartnerReceiptNet(
    { amount: 1000, gstAmount: 90, totalAmount: 1090 },
    [
      { status: "DRAFT", creditNoteNo: "DRAFT-1", amount: 100, gstAmount: 9, totalAmount: 109 },
      { status: "VOID", creditNoteNo: "VOID-1", amount: 200, gstAmount: 18, totalAmount: 218 },
    ],
  );

  assert.equal(calculated.adjustedAmount, 1000);
  assert.equal(calculated.adjustedGstAmount, 90);
  assert.equal(calculated.adjustedTotalAmount, 1090);
  assert.deepEqual(calculated.creditNoteNos, []);
  assert.equal(buildPartnerReceiptAdjustmentNote("INV-1", calculated), "");
});

test("GST credit note keeps subtotal, GST and total internally consistent", () => {
  const calculated = calculatePartnerReceiptNet(
    { amount: 1000, gstAmount: 90, totalAmount: 1090 },
    [
      { status: "ISSUED", creditNoteNo: "CN-1", amount: 100, gstAmount: 9, totalAmount: 109 },
    ],
  );

  assert.equal(calculated.adjustedAmount, 900);
  assert.equal(calculated.adjustedGstAmount, 81);
  assert.equal(calculated.adjustedTotalAmount, 981);
  assert.equal(calculated.adjustedAmount + calculated.adjustedGstAmount, calculated.adjustedTotalAmount);
});

test("credit amounts are clamped so malformed history cannot create a negative receipt", () => {
  const calculated = calculatePartnerReceiptNet(
    { amount: 100, gstAmount: 0, totalAmount: 100 },
    [
      { status: "ISSUED", creditNoteNo: "CN-OVER", amount: 150, gstAmount: 0, totalAmount: 150 },
    ],
  );

  assert.equal(calculated.adjustedAmount, 0);
  assert.equal(calculated.adjustedGstAmount, 0);
  assert.equal(calculated.adjustedTotalAmount, 0);
});

test("partner receipt creation uses server-calculated net values", () => {
  const source = readFileSync("app/admin/reports/partner-settlement/billing/page.tsx", "utf8");
  const action = source.slice(
    source.indexOf("async function createReceiptAction"),
    source.indexOf("async function deleteInvoiceAction"),
  );
  const fields = readFileSync(
    "app/admin/reports/partner-settlement/billing/PartnerReceiptFields.tsx",
    "utf8",
  );

  assert.match(action, /listPartnerCreditNotes\(\[invoiceId\]\)/);
  assert.match(action, /amount: receiptNet\.adjustedAmount/);
  assert.match(action, /gstAmount: receiptNet\.adjustedGstAmount/);
  assert.match(action, /totalAmount: receiptNet\.adjustedTotalAmount/);
  assert.match(action, /amountReceived: receiptNet\.adjustedTotalAmount/);
  assert.doesNotMatch(action, /parseNum\(formData\.get\("(?:amount|gstAmount|totalAmount|amountReceived)"/);
  assert.match(fields, /onChange=\{\(event\) => selectInvoice\(event\.target\.value\)\}/);
  assert.match(fields, /name="amountReceived"[\s\S]*?readOnly/);
});
