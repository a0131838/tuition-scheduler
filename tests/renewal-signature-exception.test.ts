import assert from "node:assert/strict";
import test from "node:test";
import { PackageType, StudentContractFlowType } from "@prisma/client";
import { hasDedicatedCashPaymentRecord, isCashReceipt, renewalExceptionSnapshot } from "../lib/renewal-signature-exception";
import { assessRenewalInvoicePayment } from "../lib/renewal-payment-overview";
import type { ParentInvoiceItem, ParentPaymentRecordItem, ParentReceiptItem } from "../lib/student-parent-billing";
import { applyContractRenewalTopUp } from "../lib/student-contract";

test("exception binds manager approval to an immutable fee-and-hours snapshot", () => {
  const original = { agreementHtml: "contract", package: { feeAmount: 5500, totalMinutes: 3000 } };
  const first = renewalExceptionSnapshot(original);
  assert.equal(first.feeCents, 550000);
  assert.equal(first.topUpMinutes, 3000);
  assert.equal(first.snapshotHash, renewalExceptionSnapshot({ ...original }).snapshotHash);
  assert.notEqual(first.snapshotHash, renewalExceptionSnapshot({ ...original, package: { feeAmount: 5500, totalMinutes: 3600 } }).snapshotHash);
  assert.throws(() => renewalExceptionSnapshot({ agreementHtml: "contract", package: { feeAmount: 0, totalMinutes: 3000 } }));
});

test("cash exception requires a recent dedicated cash record covering all linked receipts", () => {
  const base = {
    receipt: { paymentRecordId: "payment-1", invoiceId: "current-invoice", amountReceived: 5500 },
    paymentRecords: [{ id: "payment-1", packageId: "package-1", studentId: "student-1", paymentDate: "2026-11-02", paymentMethod: "Cash", paymentAmount: 5500, uploadedAt: "2026-11-02T02:00:00.000Z" }],
    allReceipts: [{ paymentRecordId: "payment-1", invoiceId: "current-invoice", amountReceived: 5500 }],
    packageId: "package-1", studentId: "student-1", contractCreatedAt: new Date("2026-11-02T00:00:00.000Z"),
  };
  assert.equal(isCashReceipt(" cash "), true);
  assert.equal(hasDedicatedCashPaymentRecord(base), true);
  assert.equal(hasDedicatedCashPaymentRecord({ ...base, paymentRecords: [{ ...base.paymentRecords[0], uploadedAt: "2026-09-28T00:00:00.000Z" }] }), false);
  assert.equal(hasDedicatedCashPaymentRecord({ ...base, paymentRecords: [{ ...base.paymentRecords[0], paymentDate: "2026-09-28" }] }), false);
  assert.equal(hasDedicatedCashPaymentRecord({ ...base, paymentRecords: [{ ...base.paymentRecords[0], paymentMethod: "Paynow" }] }), false);
  assert.equal(hasDedicatedCashPaymentRecord({ ...base, allReceipts: [...base.allReceipts, { paymentRecordId: "payment-1", invoiceId: "old-invoice", amountReceived: 1 }] }), false);
  assert.equal(hasDedicatedCashPaymentRecord({ ...base, allReceipts: [...base.allReceipts, { paymentRecordId: "payment-1", invoiceId: "current-invoice", amountReceived: 1 }] }), false);
});

test("later parent signing reuses the same contract marker and cannot add exception hours twice", async () => {
  const txns: Array<{ id: string; kind: string; note: string; deltaMinutes: number }> = [];
  let remainingMinutes = 30;
  let totalMinutes = 6000;
  const tx = {
    renewalOrder: { findUnique: async () => null },
    packageTxn: {
      findFirst: async ({ where }: { where: { note: { contains: string } } }) => txns.find(item => item.note.includes(where.note.contains)) || null,
      create: async ({ data }: { data: { kind: string; note: string; deltaMinutes: number } }) => { txns.push({ ...data, id: `txn-${txns.length + 1}` }); },
    },
    coursePackage: {
      findUnique: async () => ({ id: "package-1", remainingMinutes, totalMinutes }),
      update: async ({ data }: { data: { remainingMinutes: { increment: number }; totalMinutes: { increment: number } } }) => {
        remainingMinutes += data.remainingMinutes.increment;
        totalMinutes += data.totalMinutes.increment;
      },
    },
  } as any;
  const row = { id: "contract-1", packageId: "package-1", flowType: StudentContractFlowType.RENEWAL, package: { type: PackageType.HOURS } };
  const snapshot = { package: { feeAmount: 5500, totalMinutes: 3000 } } as any;
  const exception = await applyContractRenewalTopUp({ row, snapshot, effectiveAt: new Date(), basis: "FINANCE_EXCEPTION" }, tx);
  const signing = await applyContractRenewalTopUp({ row, snapshot, effectiveAt: new Date(), basis: "SIGNATURE" }, tx);
  assert.equal(exception.applied, true);
  assert.equal(signing.applied, false);
  assert.equal(txns.length, 1);
  assert.equal(remainingMinutes, 3030);
  assert.equal(totalMinutes, 9000);
  assert.match(txns[0].note, /student-contract-renewal-topup:contract-1/);
});

test("renewal payment display distinguishes paid PayNow from unfinished cash evidence", () => {
  const scope = { packageId: "package-1", studentId: "student-1" };
  const contract = { ...scope, createdAt: new Date("2026-11-11T00:00:00Z") };
  const invoice = { ...scope, id: "invoice-1", totalAmount: 4400 } as ParentInvoiceItem;
  const payment = { ...scope, id: "payment-1", paymentMethod: "Cash", paymentAmount: 4400,
    paymentDate: "2026-11-11", uploadedAt: "2026-11-11T00:01:00Z" } as ParentPaymentRecordItem;
  const receipt = { ...scope, id: "receipt-1", invoiceId: invoice.id, paymentRecordId: payment.id,
    paidBy: "Cash", amountReceived: 4400 } as ParentReceiptItem;
  const billing = { invoices: [invoice], paymentRecords: [payment], receipts: [receipt] };
  assert.equal(assessRenewalInvoicePayment(invoice, billing, contract, () => "PENDING").cashStatus, "RECEIPT_APPROVAL_PENDING");
  assert.equal(assessRenewalInvoicePayment(invoice, { ...billing, paymentRecords: [] }, contract, () => "COMPLETED").cashStatus, "CHECK_CASH_RECORD");
  assert.equal(assessRenewalInvoicePayment(invoice, billing, contract, () => "COMPLETED").cashStatus, "READY");
  const payNow = assessRenewalInvoicePayment(invoice, {
    ...billing, paymentRecords: [{ ...payment, paymentMethod: "Paynow" }], receipts: [{ ...receipt, paidBy: "Paynow" }],
  }, contract, () => "COMPLETED");
  assert.equal(payNow.cashStatus, "NON_CASH");
  assert.deepEqual(payNow.approvedMethods, ["PayNow"]);
  assert.equal(payNow.approvedCents, payNow.totalCents);
});
