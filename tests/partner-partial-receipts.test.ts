import assert from "node:assert/strict";
import test from "node:test";
import {
  parseReceiptAmount,
  nextPartnerReceiptNumber,
  allocatePartnerReceipt,
  PARTNER_RECEIVING_ENTITY,
} from "../lib/partner-receipt-calculation";
import { partnerReceiptBalance } from "../lib/partner-receipt-balance";
const net = {
  adjustedAmount: 5580,
  adjustedGstAmount: 0,
  adjustedTotalAmount: 5580,
};
const receipt = (id: string, amount: number) => ({
  id,
  invoiceId: "i",
  receiptNo: id,
  amountReceived: amount,
  amount,
  gstAmount: 0,
});
const cfg = { financeApproverEmails: ["finance@test.invalid"] };
test("Beijing 3690 plus Singapore 1890: approved, pending, outstanding and available remain distinct", () => {
  const first = receipt("a", 3690),
    second = receipt("b", 1890);
  assert.equal(allocatePartnerReceipt(net, [], 3690).totalAmount, 3690);
  let approvals = new Map();
  assert.deepEqual(partnerReceiptBalance(5580, [first], approvals, cfg), {
    approvedAmount: 0,
    pendingAmount: 3690,
    rejectedAmount: 0,
    remainingAmount: 5580,
    availableAmount: 1890,
    overAllocatedAmount: 0,
  });
  approvals.set("a", { financeApprovedBy: ["finance@test.invalid"] });
  assert.equal(
    partnerReceiptBalance(5580, [first], approvals, cfg).remainingAmount,
    1890,
  );
  assert.equal(allocatePartnerReceipt(net, [first], 1890).amount, 1890);
  assert.throws(() => allocatePartnerReceipt(net, [first], 1890.01), /exceeds/);
  assert.equal(
    partnerReceiptBalance(5580, [first, second], approvals, cfg)
      .availableAmount,
    0,
  );
  approvals.set("b", { financeApprovedBy: ["finance@test.invalid"] });
  assert.equal(
    partnerReceiptBalance(5580, [first, second], approvals, cfg)
      .remainingAmount,
    0,
  );
  approvals.set("b", { financeRejectReason: "Wrong proof" });
  assert.equal(
    partnerReceiptBalance(5580, [first, second], approvals, cfg)
      .availableAmount,
    1890,
  );
  assert.equal(PARTNER_RECEIVING_ENTITY, "GT Educational Institute Pte. Ltd.");
});
test("received amounts are positive, finite, cent precise and cannot exceed capacity", () => {
  for (const v of ["", 0, -1, "NaN", "Infinity", "1e3", "0.001", "5.580.00"])
    assert.throws(() => parseReceiptAmount(v));
  assert.equal(parseReceiptAmount("3690.00"), 3690);
  assert.equal(parseReceiptAmount("0.01"), 0.01);
  assert.throws(
    () => allocatePartnerReceipt(net, [receipt("a", 5580)], 0.01),
    /exceeds/,
  );
});
test("receipt numbering preserves legacy RC and never reuses deleted sequence counters", () => {
  assert.equal(nextPartnerReceiptNumber("INV", []).receiptNo, "INV-RC-01");
  assert.equal(
    nextPartnerReceiptNumber("INV", [{ receiptNo: "INV-RC" }]).receiptNo,
    "INV-RC-02",
  );
  assert.equal(
    nextPartnerReceiptNumber("INV", [{ receiptNo: "INV-RC-02" }], 5).receiptNo,
    "INV-RC-06",
  );
});
test("partial tax allocation reconciles cents on the final instalment", () => {
  const taxable = {
    adjustedAmount: 1,
    adjustedGstAmount: 0.09,
    adjustedTotalAmount: 1.09,
  };
  let rows: ReturnType<typeof receipt>[] = [];
  for (let i = 0; i < 108; i++) {
    const split = allocatePartnerReceipt(taxable, rows, 0.01);
    rows.push({ ...receipt(String(i), 0.01), ...split });
  }
  const last = allocatePartnerReceipt(taxable, rows, 0.01);
  rows.push({ ...receipt("last", 0.01), ...last });
  assert.equal(Math.round(rows.reduce((n, r) => n + r.amount, 0) * 100), 100);
  assert.equal(Math.round(rows.reduce((n, r) => n + r.gstAmount, 0) * 100), 9);
});
