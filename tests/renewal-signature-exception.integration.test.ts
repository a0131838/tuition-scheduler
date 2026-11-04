import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { activateRenewalSignatureException, requestRenewalSignatureException, reviewRenewalSignatureException } from "../lib/renewal-signature-exception";
import { finalizeStudentContractSignature } from "../lib/student-contract";

const databaseUrl = process.env.DATABASE_URL || "";
const isIsolated = databaseUrl.includes("127.0.0.1:") && databaseUrl.endsWith("/renewal_exception");

test("finance exception activates only after current approved cash, and later signing adds no hours", { skip: !isIsolated }, async () => {
  const db = new PrismaClient();
  try {
    const finance = { id: "finance-test", email: "finance-test@example.com", role: "FINANCE", name: "Finance Test" };
    const manager = { id: "manager-test", email: "manager-test@example.com", role: "ADMIN", name: "Manager Test" };
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const [student, course, template] = await Promise.all([
      db.student.create({ data: { name: "Isolated Test Student" } }),
      db.course.create({ data: { name: "Isolated Test Course" } }),
      db.contractTemplate.create({ data: { name: "Test", slug: `exception-test-${Date.now()}`, version: 1, bodyHtml: "Test agreement" } }),
    ]);
    const pkg = await db.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: "HOURS", status: "ACTIVE", validFrom: now, totalMinutes: 6000, remainingMinutes: 30, financeGateStatus: "SCHEDULABLE" } });
    const snapshot = { agreementHtml: "Test agreement", package: { id: pkg.id, feeAmount: 5500, totalMinutes: 3000 } };
    const contract = await db.studentContract.create({ data: {
      studentId: student.id, packageId: pkg.id, templateId: template.id, flowType: "RENEWAL", contractMode: "TUITION_AGREEMENT", status: "READY_TO_SIGN",
      intakeToken: `intake-${Date.now()}`, signToken: `sign-${Date.now()}`, signExpiresAt: new Date(now.getTime() + 86400000), contractSnapshotJson: snapshot,
    } });
    const invoiceId = `invoice-${contract.id}`;
    const oldInvoiceId = `old-invoice-${contract.id}`;
    const paymentId = `payment-${contract.id}`;
    const receiptId = `receipt-${contract.id}`;
    const billing = {
      invoices: [{ id: invoiceId, packageId: pkg.id, studentId: student.id, invoiceNo: "TEST-202611-0001", issueDate: today, dueDate: today, totalAmount: 5500, amount: 5500, gstAmount: 0, createdAt: new Date().toISOString() }],
      paymentRecords: [{ id: paymentId, packageId: pkg.id, studentId: student.id, paymentDate: today, paymentMethod: "Cash", paymentAmount: 5500, uploadedAt: new Date().toISOString(), relativePath: "isolated-test/cash-proof" }],
      receipts: [{ id: receiptId, packageId: pkg.id, studentId: student.id, invoiceId, paymentRecordId: paymentId, receiptNo: "TEST-202611-0001-RC", receiptDate: today, paidBy: "Cash", amountReceived: 5000, createdAt: new Date().toISOString() }],
      deletedInvoices: [], invoiceSeqByMonth: {},
    };
    billing.invoices.push({ id: oldInvoiceId, packageId: pkg.id, studentId: student.id, invoiceNo: "TEST-202611-OLD", issueDate: today, dueDate: today, totalAmount: 5500, amount: 5500, gstAmount: 0, createdAt: new Date().toISOString() });
    await db.studentContract.create({ data: {
      studentId: student.id, packageId: pkg.id, templateId: template.id, flowType: "RENEWAL", contractMode: "TUITION_AGREEMENT", status: "INVOICE_CREATED",
      intakeToken: `old-intake-${Date.now()}`, signedAt: now, invoiceId: oldInvoiceId, invoiceNo: "TEST-202611-OLD",
    } });
    await db.appSetting.createMany({ data: [
      { key: "approval_manager_emails_v1", value: manager.email },
      { key: "approval_finance_emails_v1", value: finance.email },
      { key: "parent_billing_v1", value: JSON.stringify(billing) },
      { key: "parent_receipt_approval_v1", value: JSON.stringify([{ receiptId, managerApprovedBy: [], financeApprovedBy: [finance.email], managerRejectedAt: null, managerRejectedBy: null, managerRejectReason: null, financeRejectedAt: null, financeRejectedBy: null, financeRejectReason: null }]) },
    ] });
    await assert.rejects(requestRenewalSignatureException({ contractId: contract.id, invoiceId, reason: "Current cash paid, parent signature pending.", actor: manager }));
    await assert.rejects(requestRenewalSignatureException({ contractId: contract.id, invoiceId: oldInvoiceId, reason: "Do not reuse a prior signed renewal invoice.", actor: finance }), /already belongs/);
    await assert.rejects(requestRenewalSignatureException({ contractId: contract.id, invoiceId, reason: "Current cash paid, parent signature pending.", actor: finance }), /Full cash payment/);
    billing.receipts[0].amountReceived = 5500;
    await db.appSetting.update({ where: { key: "parent_billing_v1" }, data: { value: JSON.stringify(billing) } });
    await requestRenewalSignatureException({ contractId: contract.id, invoiceId, reason: "Current cash paid, parent signature pending.", actor: finance });
    await reviewRenewalSignatureException({ contractId: contract.id, approve: true, note: "Approved for this exact contract and invoice.", actor: manager });
    await db.studentContract.update({ where: { id: contract.id }, data: { contractSnapshotJson: { ...snapshot, package: { ...snapshot.package, totalMinutes: 3600 } } } });
    await assert.rejects(activateRenewalSignatureException({ contractId: contract.id, reason: "Contract terms changed after management approval.", actor: finance }), /changed after approval/);
    await db.studentContract.update({ where: { id: contract.id }, data: { contractSnapshotJson: snapshot } });
    billing.receipts[0].amountReceived = 5000;
    await db.appSetting.update({ where: { key: "parent_billing_v1" }, data: { value: JSON.stringify(billing) } });
    await assert.rejects(activateRenewalSignatureException({ contractId: contract.id, reason: "Full cash verified, parent signing will be followed up.", actor: finance }), /Full cash payment/);
    assert.equal((await db.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } })).remainingMinutes, 30);
    billing.receipts[0].amountReceived = 5500;
    await db.appSetting.update({ where: { key: "parent_billing_v1" }, data: { value: JSON.stringify(billing) } });
    const active = await activateRenewalSignatureException({ contractId: contract.id, reason: "Full cash verified, parent signing will be followed up.", actor: finance });
    assert.equal(active.status, "ACTIVATED");
    assert.equal(active.verifiedAmountCents, 550000);
    assert.equal((await db.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } })).remainingMinutes, 3030);
    assert.equal((await db.studentContract.findUniqueOrThrow({ where: { id: contract.id } })).signedAt, null);
    await assert.rejects(activateRenewalSignatureException({ contractId: contract.id, reason: "Duplicate activation must be rejected after approval.", actor: finance }));
    const beforeSign = await db.studentContract.findUniqueOrThrow({ where: { id: contract.id } });
    await db.$transaction(tx => finalizeStudentContractSignature(tx, { token: beforeSign.signToken!, signerName: "Test Parent" }, {
      contractId: contract.id, expectedUpdatedAt: beforeSign.updatedAt.toISOString(), signedAt: new Date(),
      signatureImagePath: "isolated-test/signature", signedPdfPath: "isolated-test/contract.pdf",
    }));
    const signed = await db.studentContract.findUniqueOrThrow({ where: { id: contract.id } });
    assert.equal(signed.status, "INVOICE_CREATED");
    assert.ok(signed.signedAt);
    assert.equal(signed.invoiceId, invoiceId);
    assert.equal((await db.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } })).remainingMinutes, 3030);
    assert.equal(await db.packageTxn.count({ where: { packageId: pkg.id, kind: "PURCHASE" } }), 1);
  } finally {
    await db.$disconnect();
  }
});
