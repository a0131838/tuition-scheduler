import { verifyRenewalEntitlement } from '../lib/renewal-entitlement-evidence';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prisma as db } from '../lib/prisma';
import { buildStudentContractSnapshot } from '../lib/student-contract-template';
import { createRenewalOrder, updateRenewalOrder, acceptRenewalOrder } from '../lib/renewal-order';
import { getRenewalActions } from '../lib/renewal-action-queue';
import { getSchedulablePackageDecision } from '../lib/scheduling-package';
import { requestRenewalSignatureException, reviewRenewalSignatureException } from '../lib/renewal-signature-exception';
import { applyContractRenewalTopUp } from '../lib/student-contract';
const isolated = (() => { try {
    const u = new URL(process.env.DATABASE_URL || '');
    return u.hostname === '127.0.0.1' && u.port === '55439' && u.pathname === '/renewal_workflow_20261106_v2';
}
catch {
    return false;
} })();
test('isolated renewal lifecycle: role separation, parent confirmation, bounded credit, paid conversion and Todo routing', { skip: !isolated }, async () => {
    const finance = { email: 'renewal-finance@test.invalid', name: 'Finance TEST', role: 'FINANCE' }, manager = { email: 'renewal-manager@test.invalid', name: 'Manager TEST', role: 'ADMIN' }, sales = { email: 'renewal-sales@test.invalid', name: 'Sales TEST', role: 'SALES' }, academic = { email: 'renewal-academic@test.invalid', name: 'Academic TEST', role: 'ADMIN' };
    try {
        await db.appSetting.upsert({ where: { key: 'approval_manager_emails_v1' }, create: { key: 'approval_manager_emails_v1', value: manager.email }, update: { value: manager.email } });
        await db.appSetting.upsert({ where: { key: 'approval_finance_emails_v1' }, create: { key: 'approval_finance_emails_v1', value: finance.email }, update: { value: finance.email } });
        const student = await db.student.create({ data: { name: 'Renewal Learner TEST' } }), course = await db.course.create({ data: { name: 'English TEST' } }), template = await db.contractTemplate.create({ data: { slug: 'renewal-integration-' + Date.now(), name: 'Test', version: 2, bodyHtml: 'Test' } });
        const now = new Date(), from = new Date(now.getTime() - 86400000), to = new Date(now.getTime() + 60 * 86400000), due = new Date(now.getTime() + 5 * 86400000);
        const pkg = await db.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: 'HOURS', status: 'ACTIVE', validFrom: from, totalMinutes: 6000, remainingMinutes: 30, financeGateStatus: 'SCHEDULABLE' } });
        const snap = buildStudentContractSnapshot({ studentId: student.id, studentName: student.name, packageId: pkg.id, businessInfo: { courseName: course.name, packageType: 'HOURS', totalMinutes: 3000, feeAmount: 5500, billTo: 'Parent TEST', agreementDateIso: '2026-11-06' }, parentInfo: { parentFullNameEn: 'Parent TEST', phone: '123', email: 'parent@test.invalid', relationshipToStudent: 'Parent', isLegalGuardian: true } }).snapshot;
        const base = await db.studentContract.create({ data: { studentId: student.id, packageId: pkg.id, templateId: template.id, status: 'SIGNED', signedAt: from, intakeToken: 'base-' + Date.now(), contractSnapshotJson: snap as any } });
        const contract = await db.studentContract.create({ data: { studentId: student.id, packageId: pkg.id, templateId: template.id, status: 'READY_TO_SIGN', flowType: 'RENEWAL', intakeToken: 'current-' + Date.now(), contractSnapshotJson: snap as any } });
        const task = await db.renewalTask.create({data:{studentId:student.id,packageId:pkg.id,riskLevel:'RED',remainingMinutes:30}});
        const create = { contractId: contract.id, baseContractId: base.id, academicNote: 'Academic recommends 50 hours for next learning stage.', serviceFrom: from, serviceTo: to, paymentDueAt: due, actor: academic };
        await assert.rejects(createRenewalOrder({ ...create, actor: finance }), /assigned staff role/);
        await db.studentContract.update({ where: { id: base.id }, data: { contractSnapshotJson: { ...snap, templateVersion: 1 } as any } });
        await assert.rejects(createRenewalOrder(create), /signed version 2/);
        await db.studentContract.update({ where: { id: base.id }, data: { contractSnapshotJson: snap as any } });
        const order = await createRenewalOrder(create);
        assert.equal((await db.renewalTask.findUniqueOrThrow({where:{id:task.id}})).contractId,contract.id);
        await assert.rejects(createRenewalOrder(create), /open renewal/);
        await assert.rejects(updateRenewalOrder(order.id, 'APPROVE', { note: 'Ordinary tuition reviewed against policy TEST' }, manager), /Sales confirmation/);
        await updateRenewalOrder(order.id, 'SALES', { note: 'Parent confirmed 50 hours and SGD5500 and service dates.' }, sales);
        assert.ok((await getRenewalActions(manager)).some(a => a.key === `renewal-order-${order.id}`));
        assert.equal((await getRenewalActions(finance)).some(a => a.key === `renewal-order-${order.id}`), false);
        await updateRenewalOrder(order.id, 'APPROVE', { note: 'Ordinary tuition eligibility and same terms reviewed, policy TEST.' }, manager);
        await assert.rejects(acceptRenewalOrder(order.parentToken, 'Someone Else', null), /original contracting/);
        await acceptRenewalOrder(order.parentToken, 'Parent TEST', '127.0.0.1');
        await acceptRenewalOrder(order.parentToken, 'Parent TEST', null);
        const invoiceId = 'order-invoice-' + order.id, receiptId = 'order-receipt-' + order.id;
        const billing = { invoices: [{ id: invoiceId, packageId: pkg.id, studentId: student.id, invoiceNo: 'TEST-RENEWAL-0001', issueDate: now.toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10), amount: 5500, gstAmount: 0, totalAmount: 5500, billTo: 'Parent TEST', quantity: 1, createdAt: now.toISOString() }], paymentRecords: [], receipts: [], deletedInvoices: [], invoiceSeqByMonth: {} } as any;
        const saveBilling = () => db.appSetting.upsert({ where: { key: 'parent_billing_v1' }, create: { key: 'parent_billing_v1', value: JSON.stringify(billing) }, update: { value: JSON.stringify(billing) } });
        await saveBilling();
        await updateRenewalOrder(order.id, 'INVOICE', { invoiceId }, finance);
        await assert.rejects(updateRenewalOrder(order.id, 'ACTIVATE', {}, finance), /Full approved payment/);
        await assert.rejects(updateRenewalOrder(order.id, 'CREDIT_APPROVE', { minutes: '120', limit: '100', due: due.toISOString(), note: 'Limited credit for parent follow-up.', owner: 'Finance TEST' }, manager), /Credit must fit/);
        await updateRenewalOrder(order.id, 'CREDIT_APPROVE', { minutes: '120', limit: '220', due: due.toISOString(), note: 'Limited credit for parent follow-up.', owner: 'Finance TEST' }, manager);
        await updateRenewalOrder(order.id, 'CREDIT_RELEASE', {}, finance);
        const released = await db.renewalOrder.findUniqueOrThrow({ where: { id: order.id } });
        const bridgeId = released.creditPackageId!;
        assert.equal((await db.coursePackage.findUniqueOrThrow({ where: { id: bridgeId } })).paid, false);
        assert.equal((await getSchedulablePackageDecision(db, { studentId: student.id, courseId: course.id, at: now, requiredHoursMinutes: 120 })).ok, true);
        assert.equal((await getSchedulablePackageDecision(db, { studentId: student.id, courseId: course.id, at: now, requiredHoursMinutes: 121 })).ok, false);
        assert.equal((await getSchedulablePackageDecision(db, { studentId: student.id, courseId: course.id, at: new Date(due.getTime() + 1000), requiredHoursMinutes: 60 })).ok, false);
        await assert.rejects(updateRenewalOrder(order.id, 'CREDIT_RELEASE', {}, finance), /Independent management/);
        await assert.rejects(db.$transaction(tx => applyContractRenewalTopUp({ row: { ...contract, package: { type: 'HOURS' } }, snapshot: snap, effectiveAt: now, basis: 'SIGNATURE' }, tx)), /Complete or cancel/);
        await db.coursePackage.update({ where: { id: bridgeId }, data: { remainingMinutes: 60 } });
        await db.packageTxn.create({ data: { packageId: bridgeId, kind: 'DEDUCT', deltaMinutes: -60, note: 'Synthetic isolated credit consumption' } });
        billing.receipts.push({ id: receiptId, packageId: pkg.id, studentId: student.id, invoiceId, receiptNo: 'TEST-RENEWAL-RC', amountReceived: 5500, amount: 5500, gstAmount: 0, totalAmount: 5500, paidBy: 'Paynow', createdAt: now.toISOString() });
        await saveBilling();
        await db.appSetting.upsert({ where: { key: 'parent_receipt_approval_v1' }, create: { key: 'parent_receipt_approval_v1', value: JSON.stringify([{ receiptId, financeApprovedBy: [], managerApprovedBy: [] }]) }, update: { value: JSON.stringify([{ receiptId, financeApprovedBy: [], managerApprovedBy: [] }]) } });
        await assert.rejects(updateRenewalOrder(order.id, 'ACTIVATE', {}, finance), /Full approved payment/);
        await db.appSetting.update({ where: { key: 'parent_receipt_approval_v1' }, data: { value: JSON.stringify([{ receiptId, financeApprovedBy: [finance.email], managerApprovedBy: [] }]) } });
        const results = await Promise.allSettled([updateRenewalOrder(order.id, 'ACTIVATE', {}, finance), updateRenewalOrder(order.id, 'ACTIVATE', {}, finance)]);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal((await db.coursePackage.findUniqueOrThrow({ where: { id: pkg.id } })).remainingMinutes, 2910);
        assert.equal((await db.coursePackage.findUniqueOrThrow({ where: { id: bridgeId } })).remainingMinutes, 60);
        const purchases = await db.packageTxn.aggregate({ where: { packageId: { in: [pkg.id, bridgeId] }, kind: 'PURCHASE' }, _sum: { deltaAmount: true } });
        assert.equal(purchases._sum.deltaAmount, 5500);
        const effective = (await db.packageTxn.aggregate({ where: { packageId: { in: [pkg.id, bridgeId] } }, _sum: { deltaMinutes: true } }))._sum.deltaMinutes;
        assert.equal(effective, 2940);
        assert.equal((await db.studentContract.findUniqueOrThrow({ where: { id: contract.id } })).signedAt, null);
        const completedTask=await db.renewalTask.findUniqueOrThrow({where:{id:task.id}});
        assert.equal(completedTask.status,'PACKAGE_ACTIVE');assert.ok(completedTask.completedAt);
        const entitlement=await db.$transaction(tx=>verifyRenewalEntitlement(completedTask,{contractId:contract.id,invoiceId},tx));assert.equal(entitlement.quantity,3000);
        await db.appSetting.update({where:{key:'parent_receipt_approval_v1'},data:{value:JSON.stringify([{receiptId,financeApprovedBy:[],managerApprovedBy:[]}])}});
        assert.ok((await getRenewalActions(finance)).some(a=>a.key===`renewal-reconcile-${order.id}`));
        await db.appSetting.update({where:{key:'parent_receipt_approval_v1'},data:{value:JSON.stringify([{receiptId,financeApprovedBy:[finance.email],managerApprovedBy:[]}])}});

        assert.equal((await getRenewalActions(finance)).some(a => a.key === `renewal-order-${order.id}`), false);
        // Later full signature reuses marker, never re-adds hours.
        assert.equal((await db.$transaction(tx => applyContractRenewalTopUp({ row: { ...contract, package: { type: 'HOURS' } }, snapshot: snap, effectiveAt: now, basis: 'SIGNATURE' }, tx))).applied, false);
        // Existing paid-cash exception is visible to exactly the management account, then Finance.
        const legacyPkg = await db.coursePackage.create({ data: { studentId: student.id, courseId: course.id, type: 'HOURS', validFrom: from, totalMinutes: 100, remainingMinutes: 30 } });
        const legacy = await db.studentContract.create({ data: { studentId: student.id, packageId: legacyPkg.id, templateId: template.id, status: 'READY_TO_SIGN', flowType: 'RENEWAL', intakeToken: 'legacy-' + Date.now(), contractSnapshotJson: { ...snap, package: { ...snap.package, id: legacyPkg.id } } as any } });
        const ex = await db.renewalSignatureException.create({ data: { contractId: legacy.id, invoiceId: 'legacy-test-invoice', snapshotHash: 'test', feeCents: 550000, topUpMinutes: 3000, requestReason: 'Synthetic paid renewal request for Todo visibility.', requestedBy: finance.email } });
        assert.ok((await getRenewalActions(manager)).some(a => a.key === `renewal-exception-${ex.id}`));
        assert.equal((await getRenewalActions({ ...manager, role: 'TEACHER' })).length, 0);
        assert.equal((await getRenewalActions(finance)).some(a => a.key === `renewal-exception-${ex.id}`), false);
        await db.renewalSignatureException.update({ where: { id: ex.id }, data: { status: 'APPROVED', managerApprovedBy: manager.email, managerApprovedAt: now } });
        assert.ok((await getRenewalActions(finance)).some(a => a.key === `renewal-exception-${ex.id}`));
        assert.equal((await getRenewalActions(manager)).some(a => a.key === `renewal-exception-${ex.id}`), false);
        await db.renewalSignatureException.update({ where: { id: ex.id }, data: { status: 'ACTIVATED', activatedBy: finance.email, verifiedReceiptIds: ['test-receipt'], verifiedAmountCents: 550000, activatedAt: now, signatureFollowUpDueAt: new Date(now.getTime() - 1000) } });
        assert.equal((await getRenewalActions(finance)).find(a => a.key === `renewal-exception-${ex.id}`)?.overdue, true);
        await db.studentContract.update({ where: { id: legacy.id }, data: { signedAt: now } });
        assert.equal((await getRenewalActions(finance)).some(a => a.key === `renewal-exception-${ex.id}`), false);
        // Browser-only synthetic accounts and records. No credentials are printed.
        const users: Record<string, {
            token: string;
            id: string;
        }> = {};
        for (const [role, actor] of Object.entries({ manager, finance, sales, academic })) {
            const user = await db.user.upsert({ where: { email: actor.email }, create: { email: actor.email, name: actor.name, role: actor.role as any, passwordHash: 'not-a-login', passwordSalt: 'isolated-test', language: 'BILINGUAL' }, update: {} });
            const token = 'renewal-test-' + cryptoRandom();
            await db.authSession.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) } });
            users[role] = { token, id: user.id };
        }
        fs.writeFileSync('/tmp/sgt-renewal-fixture.json', JSON.stringify({ users, orderId: order.id, baseId: base.id, contractId: contract.id, pkgId: pkg.id, legacyId: legacy.id, studentId: student.id, courseId: course.id, templateId: template.id, snap }));
        console.log('Verified role gates, source versions, parent identity, payment status, credit caps/expiry, concurrent activation, monetary/entitlement totals, signature idempotency and Todo lifecycle.');
    }
    finally {
        await db.$disconnect();
    }
});
function cryptoRandom() { return Math.random().toString(36).slice(2) + Date.now(); }
