import { createStaffMiniappSession } from "../../lib/miniapp-staff";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { updateRenewalTask } from "../../lib/renewal-management";
import { getRenewalEntitlementEvidence, verifyRenewalEntitlement } from "../../lib/renewal-entitlement-evidence";
import { recordPackageValidityChange } from "../../lib/package-validity-audit";
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439"); assert.equal(url.pathname, "/sgt_workspace_completion_test");
  const actor = await prisma.user.findUniqueOrThrow({ where: { email: "zhaohongwei0880@gmail.com" } });
  const student = await prisma.student.create({ data: { name: `Entitlement UAT ${Date.now()}` } });
  const course = await prisma.course.create({ data: { name: `Entitlement UAT ${Date.now()}` } });
  const makePkg = (extra: object = {}) => prisma.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: "HOURS", settlementMode: "OFFLINE_MONTHLY", validFrom: new Date("2026-01-01"), totalMinutes: 600, remainingMinutes: 300, ...extra } });
  const taskFor = (packageId: string) => prisma.renewalTask.create({ data: { studentId: student.id, packageId, status: "PAYMENT_PENDING", riskLevel: "YELLOW", remainingMinutes: 30 } });
  const pkg = await makePkg(); const task = await taskFor(pkg.id);
  const activate = (extra: object = {}) => updateRenewalTask({ id: task.id, actor, status: "PACKAGE_ACTIVE", ...extra });
  await assert.rejects(activate(), /选择实际购入/);
  const purchase = await prisma.packageTxn.create({ data: { packageId: pkg.id, kind: "PURCHASE", deltaMinutes: 600 } });
  await assert.rejects(activate({ entitlementEvidenceIds: [purchase.id] }), /核对依据/);
  const basis = { entitlementEvidenceIds: [purchase.id], entitlementReviewNote: "Verified actual renewal purchase and student scope" };
  await assert.rejects(activate({ ...basis, actor: { ...actor, operationsAdmin: true } }), /财务/);
  await assert.rejects(activate({ ...basis, entitlementEvidenceIds: [purchase.id, purchase.id] }), /选择实际购入/);
  await prisma.coursePackage.update({ where: { id: pkg.id }, data: { status: "EXPIRED" } });
  await assert.rejects(activate(basis), /未生效/);
  await prisma.coursePackage.update({ where: { id: pkg.id }, data: { status: "ACTIVE" } });
  const correction = await prisma.packageTxn.create({ data: { packageId: pkg.id, kind: "ADJUST", deltaMinutes: -60 } });
  await assert.rejects(activate(basis), /冲正/);
  await prisma.packageTxn.delete({ where: { id: correction.id } });
  const before = await prisma.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } });
  const ledgerBefore = await prisma.packageTxn.findMany({ where: { packageId: pkg.id } });
  // Force the audit insert to fail; completion must roll back with it.
  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION uat_entitlement_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."actorName" = 'ENTITLEMENT AUDIT FAILURE' THEN RAISE EXCEPTION 'forced entitlement audit failure'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER uat_entitlement_failure BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION uat_entitlement_failure()`);
  try {
    await assert.rejects(activate({ ...basis, actor: { ...actor, name: "ENTITLEMENT AUDIT FAILURE" } }), /forced entitlement audit failure/);
    assert.equal((await prisma.renewalTask.findUniqueOrThrow({ where: { id: task.id } })).status, "PAYMENT_PENDING");
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER uat_entitlement_failure ON "AuditLog"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION uat_entitlement_failure()`);
  }
  const otherSource = await makePkg(); const other = await taskFor(otherSource.id);
  const competing = await Promise.allSettled([activate(basis), updateRenewalTask({ id: other.id, actor, status: "PACKAGE_ACTIVE", activatedPackageId: pkg.id, ...basis })]);
  assert.equal(competing.filter(r => r.status === "fulfilled").length, 1);
  const winner = competing[0].status === "fulfilled" ? task : other;
  const loser = winner.id === task.id ? other : task;
  await assert.rejects(updateRenewalTask({ id: loser.id, actor, status: "PACKAGE_ACTIVE", activatedPackageId: pkg.id, ...basis }), /已使用/);
  const active = await prisma.renewalTask.findUniqueOrThrow({ where: { id: winner.id } }); assert.equal(active.paymentConfirmedAt, null);
  await updateRenewalTask({ id: winner.id, actor, note: "Only historical note changed" });
  assert.deepEqual(await prisma.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } }), before);
  assert.deepEqual(await prisma.packageTxn.findMany({ where: { packageId: pkg.id } }), ledgerBefore);

  const countPkg = await makePkg({ note: "[GROUP_PACK]" }); const countTask = await taskFor(countPkg.id);
  const countPurchase = await prisma.packageTxn.create({ data: { packageId: countPkg.id, kind: "PURCHASE", deltaMinutes: 10 } });
  await updateRenewalTask({ id: countTask.id, actor, status: "PACKAGE_ACTIVE", entitlementEvidenceIds: [countPurchase.id], entitlementReviewNote: basis.entitlementReviewNote });
  const countAudit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: countTask.id, action: "UPDATE_RENEWAL_TASK" } });
  assert.equal((countAudit.meta as any).entitlementEvidence.unit, "COUNT"); assert.equal((countAudit.meta as any).entitlementEvidence.quantity, 10);
  await assert.rejects(getRenewalEntitlementEvidence(task, { activatedPackageId: countPkg.id }), /单位不一致/);
  const foreign = await prisma.student.create({ data: { name: "Foreign entitlement UAT" } });
  const foreignPkg = await makePkg({ studentId: foreign.id });
  await assert.rejects(getRenewalEntitlementEvidence(task, { activatedPackageId: foreignPkg.id }), /归属/);

  const contractPkg = await makePkg(); const contractTask = await taskFor(contractPkg.id);
  const template = await prisma.contractTemplate.findFirstOrThrow();
  const contract = await prisma.studentContract.create({ data: { studentId: student.id, packageId: contractPkg.id, templateId: template.id, intakeToken: `entitlement-${Date.now()}`, flowType: "RENEWAL", status: "SIGNED", signedAt: new Date(), invoiceId: "exact-invoice", contractSnapshotJson: { package: { totalMinutes: 600 } } } });
  await assert.rejects(updateRenewalTask({ id: contractTask.id, actor, status: "PACKAGE_ACTIVE", contractId: contract.id }), /选择实际购入/);
  await prisma.packageTxn.create({ data: { packageId: contractPkg.id, kind: "PURCHASE", deltaMinutes: 600, note: `student-contract-renewal-topup:${contract.id}` } });
  const verify = (invoiceId: string) => prisma.$transaction(tx => verifyRenewalEntitlement(contractTask, { contractId: contract.id, invoiceId }, tx));
  await assert.rejects(verify("wrong-invoice"), /合同不一致/);
  await prisma.studentContract.update({ where: { id: contract.id }, data: { status: "VOID", voidedAt: new Date() } });
  assert.equal((await getRenewalEntitlementEvidence(contractTask)).candidates[0].blocker, "CONTRACT");
  await prisma.studentContract.update({ where: { id: contract.id }, data: { status: "SIGNED", voidedAt: null, contractSnapshotJson: { package: { totalMinutes: 1200 } } } });
  await assert.rejects(verify("exact-invoice"), /数量/);
  await prisma.studentContract.update({ where: { id: contract.id }, data: { contractSnapshotJson: { package: { totalMinutes: 600 } } } });
  await updateRenewalTask({ id: contractTask.id, actor, status: "PACKAGE_ACTIVE", contractId: contract.id, invoiceId: "exact-invoice" });

  const monthly = await makePkg({ type: "MONTHLY", validTo: new Date("2027-01-01") }); const monthlyTask = await taskFor(monthly.id);
  await prisma.packageTxn.create({ data: { packageId: monthly.id, kind: "PURCHASE", deltaMinutes: 0 } });
  await assert.rejects(updateRenewalTask({ id: monthlyTask.id, actor, status: "PACKAGE_ACTIVE" }), /选择实际购入/);
  const after = { validFrom: monthly.validFrom, validTo: new Date("2027-02-01") };
  await assert.rejects(prisma.$transaction(async tx => { await tx.coursePackage.update({ where: { id: monthly.id }, data: after }); await recordPackageValidityChange(tx, { packageId: monthly.id, studentId: student.id, courseId: course.id, actor, before: monthly, after }); throw new Error("rollback extension"); }), /rollback extension/);
  assert.equal((await getRenewalEntitlementEvidence(monthlyTask)).candidates.length, 0);
  await prisma.$transaction(async tx => { await tx.coursePackage.update({ where: { id: monthly.id }, data: after }); await recordPackageValidityChange(tx, { packageId: monthly.id, studentId: student.id, courseId: course.id, actor, before: monthly, after }); });
  const extension = (await getRenewalEntitlementEvidence(monthlyTask)).candidates[0];
  await updateRenewalTask({ id: monthlyTask.id, actor, status: "PACKAGE_ACTIVE", entitlementEvidenceIds: [extension.id], entitlementReviewNote: basis.entitlementReviewNote });
  // Shortening and restoring the same monthly end date must not create fresh rights.
  await prisma.$transaction(tx => recordPackageValidityChange(tx, { packageId: monthly.id, studentId: student.id, courseId: course.id, actor, before: monthly, after }));
  const repeatTask = { ...monthlyTask, id: "different-cycle-for-preview" };
  assert.ok((await getRenewalEntitlementEvidence(repeatTask)).candidates.every(c => c.blocker === "USED"));
  const monthlyNew = await makePkg({ type: "MONTHLY", validTo: new Date("2027-03-01") });
  const monthlyNewPurchase = await prisma.packageTxn.create({ data: { packageId: monthlyNew.id, kind: "PURCHASE", deltaMinutes: 0 } });
  const mt2 = await taskFor(monthly.id);
  await updateRenewalTask({ id: mt2.id, actor, status: "PACKAGE_ACTIVE", activatedPackageId: monthlyNew.id, entitlementEvidenceIds: [monthlyNewPurchase.id], entitlementReviewNote: basis.entitlementReviewNote });
  if (process.env.UAT_HTTP === "1") {
    const httpPkg = await makePkg(); const httpTask = await taskFor(httpPkg.id);
    const session = await createStaffMiniappSession(actor.id);
    const request = (body: object) => fetch(`http://127.0.0.1:3149/api/miniapp/staff/renewals/${httpTask.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const blocked = await request({ status: "PACKAGE_ACTIVE" }); assert.equal(blocked.status, 400); assert.match(await blocked.text(), /选择实际购入/);
    const httpPurchase = await prisma.packageTxn.create({ data: { packageId: httpPkg.id, kind: "PURCHASE", deltaMinutes: 600 } });
    const verified = await request({ status: "PACKAGE_ACTIVE", entitlementEvidenceIds: [httpPurchase.id], entitlementReviewNote: basis.entitlementReviewNote });
    assert.equal(verified.status, 200, await verified.text());
    const monthlyStudent = await prisma.student.create({ data: { name: "Monthly extension HTTP UAT" } });
    const monthlyHttp = await makePkg({ studentId: monthlyStudent.id, type: "MONTHLY", validTo: new Date("2026-12-01") });
    const token = randomUUID();
    await prisma.authSession.create({ data: { userId: actor.id, token, expiresAt: new Date(Date.now() + 60000) } });
    try {
      const response = await fetch(`http://127.0.0.1:3149/api/admin/packages/${monthlyHttp.id}`, { method: "PATCH", headers: { Cookie: `ts_admin_session=${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ validFrom: "2026-01-01", validTo: "2027-02-01", status: "ACTIVE", settlementMode: "OFFLINE_MONTHLY" }) });
      assert.equal(response.status, 200, await response.text());
      const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: monthlyHttp.id, action: "UPDATE_PACKAGE_VALIDITY" } });
      assert.equal((audit.meta as any).before.validTo, monthlyHttp.validTo!.toISOString());
      assert.equal((audit.meta as any).after.validTo, (await prisma.coursePackage.findUniqueOrThrow({ where: { id: monthlyHttp.id } })).validTo!.toISOString());
    } finally { await prisma.authSession.deleteMany({ where: { token } }); }

  }
  console.log(JSON.stringify({ passed: true, noEntitlementWritesDuringVerification: true, concurrencyAndAtomicAudit: true, countAndMonthlyVerified: true, browserTask: loser.id, packageId: pkg.id }));
}
main().finally(() => prisma.$disconnect());
