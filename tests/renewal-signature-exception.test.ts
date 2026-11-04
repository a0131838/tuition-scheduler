import assert from "node:assert/strict";
import test from "node:test";
import { PackageType, StudentContractFlowType } from "@prisma/client";
import { hasDedicatedCashPaymentRecord, isCashReceipt, renewalExceptionSnapshot } from "../lib/renewal-signature-exception";
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
