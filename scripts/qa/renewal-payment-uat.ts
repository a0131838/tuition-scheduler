import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { updateRenewalTask } from "../../lib/renewal-management";
import { getRenewalPaymentEvidence } from "../../lib/renewal-payment-evidence";
import { createStaffMiniappSession } from "../../lib/miniapp-staff";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/sgt_workspace_completion_test");
  const settings = ["parent_billing_v1", "parent_receipt_approval_v1", "partner_billing_v1", "partner_receipt_approval_v1", "approval_finance_emails_v1"];
  const originals = await prisma.appSetting.findMany({ where: { key: { in: settings } } });
  const set = async (key: string, value: unknown) => prisma.appSetting.upsert({ where: { key }, create: { key, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: "zhaohongwei0880@gmail.com" } });
  const suffix = Date.now();
  const student = await prisma.student.create({ data: { name: `Renewal payment UAT ${suffix}` } });
  const foreign = await prisma.student.create({ data: { name: `Other payment UAT ${suffix}` } });
  const course = await prisma.course.create({ data: { name: `Payment UAT ${suffix}` } });
  const pkg = await prisma.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: "HOURS", validFrom: new Date("2026-01-01"), totalMinutes: 6000, remainingMinutes: 6000 } });
  const task = await prisma.renewalTask.create({ data: { studentId: student.id, packageId: pkg.id, status: "PAYMENT_PENDING", riskLevel: "YELLOW", remainingMinutes: 60, createdAt: new Date("2026-09-01") } });
  const invoice = { id: `uat-invoice-${suffix}`, invoiceNo: "UAT-PAYMENT", packageId: pkg.id, studentId: student.id, totalAmount: 100, createdAt: "2026-09-02T00:00:00Z", issueDate: "2026-09-02" };
  const receipt = { id: `uat-receipt-${suffix}`, receiptNo: "UAT-PAYMENT-RC", packageId: pkg.id, studentId: student.id, invoiceId: invoice.id, amountReceived: 100, createdAt: "2026-09-02T00:00:00Z" };
  const approved = { receiptId: receipt.id, financeApprovedBy: ["finance@uat.invalid"] };
  const attempt = (status = "PAYMENT_CONFIRMED", invoiceId = invoice.id) => updateRenewalTask({ id: task.id, actor, status, invoiceId });
  const balancesBefore = await prisma.coursePackage.findUnique({ where: { id: pkg.id } });
  const txnBefore = await prisma.packageTxn.count({ where: { packageId: pkg.id } });
  try {
    await prisma.appSetting.upsert({ where: { key: "approval_finance_emails_v1" }, create: { key: "approval_finance_emails_v1", value: "finance@uat.invalid" }, update: { value: "finance@uat.invalid" } });
    await set("parent_billing_v1", { invoices: [invoice], receipts: [] });
    await set("parent_receipt_approval_v1", []);
    await assert.rejects(attempt(), /尚未核验足额/);
    await assert.rejects(attempt("PACKAGE_ACTIVE"), /尚未核验足额/);
    assert.equal(await prisma.auditLog.count({ where: { entityId: task.id } }), 0);
    await set("parent_billing_v1", { invoices: [invoice], receipts: [receipt] });
    await assert.rejects(attempt(), /尚未核验足额/);
    await set("parent_receipt_approval_v1", [{ ...approved, managerRejectReason: "Review" }]);
    await assert.rejects(attempt(), /尚未核验足额/);
    await set("parent_receipt_approval_v1", [approved]);
    await set("parent_billing_v1", { invoices: [invoice], receipts: [{ ...receipt, amountReceived: 99.99 }] });
    await assert.rejects(attempt(), /尚未核验足额/);
    await set("parent_billing_v1", { invoices: [invoice], receipts: [{ ...receipt, studentId: foreign.id }] });
    await assert.rejects(attempt(), /尚未核验足额/);
    await set("parent_billing_v1", { invoices: [{ ...invoice, studentId: foreign.id }], receipts: [receipt] });
    await assert.rejects(attempt(), /本次续费发票/);
    for (const createdAt of ["2026-08-01T00:00:00Z", "", undefined]) {
      await set("parent_billing_v1", { invoices: [{ ...invoice, createdAt }], receipts: [receipt] });
      await assert.rejects(attempt(), /本次续费/);
    }
    await set("parent_billing_v1", { invoices: [invoice, invoice], receipts: [receipt] });
    await assert.rejects(attempt(), /本次续费发票/);
    await set("parent_billing_v1", { invoices: [invoice], receipts: [receipt, receipt] });
    await assert.rejects(attempt(), /尚未核验足额/);
    await set("parent_billing_v1", { invoices: [invoice], receipts: [receipt] });
    await assert.rejects(updateRenewalTask({ id: task.id, actor: { ...actor, operationsAdmin: true }, status: "PAYMENT_CONFIRMED", invoiceId: invoice.id }), /财务/);
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION uat_renewal_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."actorName" = 'UAT AUDIT FAILURE' THEN RAISE EXCEPTION 'UAT forced audit failure'; END IF; RETURN NEW; END $$`);
    await prisma.$executeRawUnsafe(`CREATE TRIGGER uat_renewal_audit_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION uat_renewal_audit_failure()`);
    try {
      await assert.rejects(updateRenewalTask({ id: task.id, actor: { ...actor, name: "UAT AUDIT FAILURE" }, status: "PAYMENT_CONFIRMED", invoiceId: invoice.id }), /UAT forced audit failure/);
      assert.equal((await prisma.renewalTask.findUniqueOrThrow({ where: { id: task.id } })).status, "PAYMENT_PENDING");
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER uat_renewal_audit_failure ON "AuditLog"`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION uat_renewal_audit_failure()`);
    }
    const changed = await Promise.allSettled([attempt(), attempt()]);
    assert.ok(changed.some(r => r.status === "fulfilled"));
    assert.equal(await prisma.auditLog.count({ where: { entityId: task.id, meta: { path: ["paymentEvidence", "id"], equals: invoice.id } } }), 1);
    const paid = await prisma.renewalTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.ok(paid.paymentConfirmedAt); assert.equal(paid.status, "PAYMENT_CONFIRMED");
    const activation = await attempt("PACKAGE_ACTIVE"); assert.ok(activation.completedAt);
    await set("parent_receipt_approval_v1", []);
    await updateRenewalTask({ id: task.id, actor, note: "Historical note only" });
    await assert.rejects(updateRenewalTask({ id: task.id, actor, status: "PACKAGE_ACTIVE", invoiceId: "unrelated" }), /本次续费发票/);
    const second = await prisma.renewalTask.create({ data: { studentId: student.id, packageId: pkg.id, status: "PAYMENT_PENDING", riskLevel: "YELLOW", remainingMinutes: 60, createdAt: new Date("2026-09-01") } });
    await set("parent_receipt_approval_v1", [approved]);
    await assert.rejects(updateRenewalTask({ id: second.id, actor, status: "PAYMENT_CONFIRMED", invoiceId: invoice.id }), /重复使用/);
    // Later task-link edits do not erase verified evidence from the audit history.
    await prisma.renewalTask.update({ where: { id: task.id }, data: { invoiceId: null, paymentConfirmedAt: null } });
    await assert.rejects(updateRenewalTask({ id: second.id, actor, status: "PAYMENT_CONFIRMED", invoiceId: invoice.id }), /重复使用/);
    assert.deepEqual(await prisma.coursePackage.findUnique({ where: { id: pkg.id } }), balancesBefore);
    assert.equal(await prisma.packageTxn.count({ where: { packageId: pkg.id } }), txnBefore);

    const oldPkg = await prisma.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: "HOURS", validFrom: new Date("2026-01-01") } });
    const oldTask = await prisma.renewalTask.create({ data: { studentId: student.id, packageId: oldPkg.id, status: "PAYMENT_PENDING", riskLevel: "YELLOW", remainingMinutes: 60, createdAt: new Date("2026-09-10") } });
    const oldInvoice = { ...invoice, id: `older-${suffix}`, packageId: oldPkg.id };
    const oldReceipt = { ...receipt, id: `older-rc-${suffix}`, packageId: oldPkg.id, invoiceId: oldInvoice.id };
    await set("parent_billing_v1", { invoices: [oldInvoice], receipts: [oldReceipt] });
    await set("parent_receipt_approval_v1", [{ ...approved, receiptId: oldReceipt.id }]);
    await assert.rejects(updateRenewalTask({ id: oldTask.id, actor, status: "PAYMENT_CONFIRMED", invoiceId: oldInvoice.id }), /核对依据/);
    await updateRenewalTask({ id: oldTask.id, actor, status: "PAYMENT_CONFIRMED", invoiceId: oldInvoice.id, paymentReviewNote: "UAT reviewed current renewal contract and invoice" });
    // The later activation can reuse this task's audited review, while rechecking cash.
    await updateRenewalTask({ id: oldTask.id, actor, status: "PACKAGE_ACTIVE" });
    await set("parent_billing_v1", { invoices: [invoice], receipts: [receipt] });
    await set("parent_receipt_approval_v1", [approved]);

    // Existing monthly settlement remains postpaid and never claims cash on activation.
    const pp = await prisma.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: "HOURS", validFrom: new Date("2026-01-01"), settlementMode: "OFFLINE_MONTHLY", totalMinutes: 600 } });
    const pt = await prisma.renewalTask.create({ data: { studentId: student.id, packageId: pp.id, status: "PAYMENT_PENDING", riskLevel: "YELLOW", remainingMinutes: 60, createdAt: new Date("2026-09-01") } });
    const active = await updateRenewalTask({ id: pt.id, actor, status: "PACKAGE_ACTIVE" });
    assert.equal(active.paymentConfirmedAt, null);
    await assert.rejects(updateRenewalTask({ id: pt.id, actor, status: "PAYMENT_CONFIRMED" }), /本次续费发票/);
    const settlement = await prisma.partnerSettlement.create({ data: { studentId: student.id, packageId: pp.id, mode: "OFFLINE_MONTHLY", monthKey: `uat-${suffix}` } });
    const pi = { id: `partner-invoice-${suffix}`, partnerId: null, mode: "OFFLINE_MONTHLY", invoiceNo: "UAT-PARTNER", totalAmount: 200, settlementIds: [settlement.id], lines: [{ id: "line", type: "SETTLEMENT", description: "UAT settlement", settlementId: settlement.id, totalAmount: 200 }], createdAt: invoice.createdAt };
    const pr = { id: `partner-receipt-${suffix}`, partnerId: null, mode: "OFFLINE_MONTHLY", invoiceId: pi.id, receiptNo: "UAT-PARTNER-RC", amountReceived: 200 };
    await set("partner_billing_v1", { invoices: [pi], receipts: [pr] });
    await set("partner_receipt_approval_v1", [{ receiptId: pr.id, financeApprovedBy: ["finance@uat.invalid"] }]);
    const evidence = await getRenewalPaymentEvidence(pt);
    assert.equal(evidence.postpaid, true); assert.equal(evidence.candidates[0]?.state, "PAID");
    await prisma.partnerSettlement.update({ where: { id: settlement.id }, data: { revertedAt: new Date() } });
    await assert.rejects(updateRenewalTask({ id: pt.id, actor, status: "PAYMENT_CONFIRMED", invoiceId: pi.id }), /本次续费发票/);
    await prisma.partnerSettlement.update({ where: { id: settlement.id }, data: { revertedAt: null } });
    const partnerPaid = await updateRenewalTask({ id: pt.id, actor, status: "PAYMENT_CONFIRMED", invoiceId: pi.id });
    assert.ok(partnerPaid.paymentConfirmedAt);

    if (process.env.UAT_HTTP === "1") {
      const session = await createStaffMiniappSession(actor.id);
      const response = await fetch(`http://127.0.0.1:3149/api/miniapp/staff/renewals/${second.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAYMENT_CONFIRMED", invoiceId: invoice.id }) });
      assert.equal(response.status, 400, await response.text());
    }
    console.log(JSON.stringify({ passed: true, paymentTask: task.id, postpaidTask: pt.id, noPackageOrLedgerWrites: true }));
  } finally {
    for (const key of settings) {
      const original = originals.find(r => r.key === key);
      if (original) await prisma.appSetting.upsert({ where: { key }, create: { key, value: original.value }, update: { value: original.value } });
      else await prisma.appSetting.deleteMany({ where: { key } });
    }
  }
}
main().finally(() => prisma.$disconnect());
