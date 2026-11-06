import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getApprovalRoleConfig, isRoleApprover } from './approval-flow';
import { listParentBillingForPackage } from './student-parent-billing';
import { getParentReceiptApprovalMap } from './parent-receipt-approval';
import { getReceiptApprovalStatus } from './receipt-approval-policy';
import { saveStudentContractInvoiceChoiceInTransaction } from './student-contract-invoice-choice';
import { buildTopUpMinutesUpdate } from './package-top-up';
import { packageModeFromNote } from './package-mode';
import { renewalHash, sameRenewalTerms, validateCredit } from './renewal-order-policy';
type Db = Prisma.TransactionClient;
export type RenewalOrderActor = {
    email: string;
    role: string;
    name?: string | null;
    isObserver?: boolean;
    operationsAdmin?: boolean;
};
const text = (s: unknown, min = 10) => { const v = String(s || '').trim(); if (v.length < min || v.length > 2000)
    throw Error(`Enter ${min}–2000 characters / 请填写${min}至2000字`); return v; };
const email = (a: RenewalOrderActor) => a.email.trim().toLowerCase();
async function authority(db: Db, a: RenewalOrderActor, lane: 'COORDINATOR' | 'SALES' | 'FINANCE' | 'MANAGER') {
    if (a.isObserver)
        throw Error('Read-only account / 只读账号');
    const roles = await getApprovalRoleConfig(db);
    const manager = a.role !== 'TEACHER' && isRoleApprover(email(a), roles.managerApproverEmails);
    const allowed = lane === 'MANAGER' ? manager : lane === 'FINANCE' ? a.role === 'FINANCE' && isRoleApprover(email(a), roles.financeApproverEmails)
        : lane === 'SALES' ? manager || a.role === 'SALES' : manager || a.role === 'ADMIN' || a.role === 'CS' || a.operationsAdmin;
    if (!allowed)
        throw Error('This action requires its assigned staff role / 此操作需要对应岗位权限');
}
async function audit(db: Db, a: RenewalOrderActor, id: string, action: string, meta: object) {
    await db.auditLog.create({ data: { actorEmail: email(a), actorName: a.name || null, actorRole: a.role, module: 'RENEWAL_ORDER', entityType: 'RenewalOrder', entityId: id, action, meta: meta as Prisma.InputJsonValue } });
}
async function contract(db: Db, id: string) {
    await db.$queryRaw `SELECT id FROM "StudentContract" WHERE id=${id} FOR UPDATE`;
    const c = await db.studentContract.findUniqueOrThrow({ where: { id }, include: { package: { include: { sharedStudents: true, sharedCourses: true, course: { include: { eduTrustProfile: true } } } }, renewalSignatureException: true } });
    if (c.contractMode !== 'TUITION_AGREEMENT' || c.flowType !== 'RENEWAL' || c.status !== 'READY_TO_SIGN' || c.signedAt || c.voidedAt || c.package.type !== 'HOURS' || c.package.status !== 'ACTIVE' || c.package.settlementMode || packageModeFromNote(c.package.note) !== 'HOURS_MINUTES' || c.package.sharedStudents.length || c.package.sharedCourses.length || c.package.note?.includes('[RENEWAL_CREDIT') || c.package.course.eduTrustProfile?.isEduTrustCourse || (c.package.course.eduTrustProfile?.courseLine && c.package.course.eduTrustProfile.courseLine !== 'NOT_FOR_EDUTRUST'))
        throw Error('Use the existing contract flow for this package / 此课包请使用原合同流程');
    if (c.renewalSignatureException && c.renewalSignatureException.status !== 'REJECTED')
        throw Error('This renewal already uses the paid-signature exception / 本次已进入已付款补签例外流程');
    return c;
}
async function locked(db: Db, id: string) {
    // Lock order first; all new workflow writes follow the same lock order.
    await db.$queryRaw `SELECT id FROM "RenewalOrder" WHERE id=${id} FOR UPDATE`;
    const o = await db.renewalOrder.findUniqueOrThrow({ where: { id }, include: { contract: true } });
    if (o.cancelledAt || o.activatedAt)
        throw Error('Order closed; review the saved record / 续费单已结束，请查看记录');
    const c = await contract(db, o.contractId);
    const base = await db.studentContract.findUnique({ where: { id: o.baseContractId } });
    if (!base?.signedAt || !['SIGNED', 'INVOICE_CREATED'].includes(base.status) || base.voidedAt || base.studentId !== c.studentId || base.packageId !== c.packageId || base.contractMode !== 'TUITION_AGREEMENT' || renewalHash(base.contractSnapshotJson) !== o.baseHash || renewalHash(c.contractSnapshotJson) !== o.sourceHash || !sameRenewalTerms(base.contractSnapshotJson, c.contractSnapshotJson))
        throw Error('Agreement changed or master agreement is ineligible / 合同已变化或原协议不支持同条件续费，请重新核对');
    return { o, c, base };
}
async function invoiceEvidence(db: Db, o: {
    id: string;
    contractId: string;
    invoiceId: string | null;
    feeCents: number;
    createdAt: Date;
}, c: {
    studentId: string;
    packageId: string;
}) {
    const billing = await listParentBillingForPackage(c.packageId, db);
    const matched = billing.invoices.filter(i => i.id === o.invoiceId && i.studentId === c.studentId && i.packageId === c.packageId);
    const inv = matched.length === 1 ? matched[0] : null;
    if (!inv || Math.round(inv.totalAmount * 100) !== o.feeCents || Math.round((inv.amount + inv.gstAmount) * 100) !== o.feeCents || !Number.isFinite(Date.parse(inv.createdAt)) || Date.parse(inv.createdAt) < o.createdAt.getTime() - 7 * 86400000)
        throw Error('Choose the current renewal invoice with the exact amount / 请选择本期金额一致的发票');
    const [other, exception, task] = await Promise.all([
        db.studentContract.findFirst({ where: { invoiceId: inv.id, id: { not: o.contractId }, status: { not: 'VOID' } } }),
        db.renewalSignatureException.findFirst({ where: { invoiceId: inv.id, status: { not: 'REJECTED' } } }),
        db.renewalTask.findFirst({ where: { invoiceId: inv.id, paymentConfirmedAt: { not: null }, OR: [{ contractId: null }, { contractId: { not: o.contractId } }] } }),
    ]);
    if (other || exception || task)
        throw Error('Invoice used by another renewal / 发票已用于其他续费');
    const approvalGate=await db.packageInvoiceApproval.findFirst({where:{packageId:c.packageId,invoiceId:inv.id},orderBy:{submittedAt:'desc'}});
    if(approvalGate?.status==='REJECTED')throw Error('Invoice approval was rejected; resolve it before continuing / 发票审批已退回，请先处理');
    const receipts = billing.receipts.filter(r => r.invoiceId === inv.id && r.studentId === c.studentId);
    if(new Set(receipts.map(r=>r.id)).size!==receipts.length || receipts.some(r=>!Number.isFinite(r.amountReceived)||r.amountReceived<=0))throw Error('Receipt identity or amount needs review / 收据编号或金额须核对');
    const [roles, approval] = await Promise.all([getApprovalRoleConfig(db), getParentReceiptApprovalMap(receipts.map(r => r.id), db)]);
    const approved = receipts.filter(r => getReceiptApprovalStatus(approval.get(r.id), roles) === 'COMPLETED');
    const total = approved.reduce((s, r) => s + Math.round(r.amountReceived * 100), 0);
    if (receipts.some(r => getReceiptApprovalStatus(approval.get(r.id), roles) === 'REJECTED') || total > o.feeCents)
        throw Error('Receipt amount or rejection needs reconciliation / 收据金额或退回状态须先核对');
    return { inv, approved, total };
}
const tx = <T>(fn: (db: Db) => Promise<T>) => prisma.$transaction(fn, { isolationLevel: 'Serializable', timeout: 20000 }).catch((e: unknown) => { if (e instanceof Prisma.PrismaClientKnownRequestError && (['P2034', 'P2025', 'P2002'].includes(e.code) || (e.code === 'P2010' && ['40001', '40P01'].includes(String(e.meta?.code)))))
    throw Error('Record changed; reopen before proceeding / 记录已变化，请重新打开核对'); throw e; });
export async function createRenewalOrder(input: {
    contractId: string;
    baseContractId: string;
    academicNote: string;
    serviceFrom: Date;
    serviceTo: Date;
    paymentDueAt: Date;
    actor: RenewalOrderActor;
}) {
    return tx(async (db) => {
        await authority(db, input.actor, 'COORDINATOR');
        const c = await contract(db, input.contractId);
        await db.$queryRaw `SELECT id FROM "CoursePackage" WHERE id=${c.packageId} FOR UPDATE`;
        if (await db.renewalOrder.findFirst({ where: { activatedAt: null, cancelledAt: null, contract: { packageId: c.packageId } } }))
            throw Error('Another open renewal order exists for this package / 本课包已有未完成续费单');
        const base = await db.studentContract.findUniqueOrThrow({ where: { id: input.baseContractId } });
        if (!base.signedAt || !['SIGNED', 'INVOICE_CREATED'].includes(base.status) || base.voidedAt || base.packageId !== c.packageId || base.contractMode !== 'TUITION_AGREEMENT' || !sameRenewalTerms(base.contractSnapshotJson, c.contractSnapshotJson))
            throw Error('A signed version 2 ordinary agreement with identical terms is required. Use full signing for older or changed agreements / 需已签署且条件一致的新版普通协议；旧版或条件变更请走完整签约');
        const snapshot = c.contractSnapshotJson as any;
        const minutes = Number(snapshot.package?.totalMinutes), feeCents = Math.round(Number(snapshot.package?.feeAmount) * 100);
        if (!Number.isSafeInteger(minutes) || minutes <= 0 || !Number.isSafeInteger(feeCents) || feeCents <= 0 || ![input.serviceFrom, input.serviceTo, input.paymentDueAt].every(d => Number.isFinite(d.getTime())) || input.serviceTo <= input.serviceFrom || input.serviceTo < new Date() || input.paymentDueAt > input.serviceTo)
            throw Error('Check hours, amount and service dates / 请核对课时、金额及服务日期');
        if (feeCents % 100 !== 0)
            throw Error('Use the full contract flow for fractional SGD package fees / 含非整数新币课包金额请走完整合同流程');
        const existing = await db.renewalOrder.findUnique({ where: { contractId: c.id } });
        if (existing)
            throw Error('A renewal order already exists; open its record / 续费单已存在，请打开原记录');
        const o = await db.renewalOrder.create({ data: { contractId: c.id, baseContractId: base.id, sourceHash: renewalHash(c.contractSnapshotJson), baseHash: renewalHash(base.contractSnapshotJson), topUpMinutes: minutes, feeCents, academicNote: text(input.academicNote), academicBy: email(input.actor), serviceFrom: input.serviceFrom, serviceTo: input.serviceTo, paymentDueAt: input.paymentDueAt, parentToken: crypto.randomBytes(32).toString('hex'), parentExpiresAt: new Date(Date.now() + 14 * 86400000) } });
        await db.renewalTask.updateMany({ where: { packageId: c.packageId, completedAt: null, OR: [{ contractId: null }, { contractId: c.id }] }, data: { contractId: c.id, status: 'CONTRACT_BILLING' } });
        await audit(db, input.actor, o.id, 'CREATE', { contractId: c.id, baseContractId: base.id, minutes, feeCents });
        return o;
    });
}
export async function updateRenewalOrder(id: string, action: string, data: Record<string, string>, actor: RenewalOrderActor) {
    return tx(async (db) => {
        if (action === 'CANCEL') {
            await authority(db, actor, 'MANAGER');
            await db.$queryRaw `SELECT id FROM "RenewalOrder" WHERE id=${id} FOR UPDATE`;
            const order = await db.renewalOrder.findUniqueOrThrow({ where: { id } });
            if (order.activatedAt || order.creditPackageId)
                throw Error('Reconcile active or released credit before cancellation / 已激活或已放额度，请先对账');
            const reason = text(data.note);
            const saved = await db.renewalOrder.update({ where: { id }, data: { cancelledAt: new Date() } });
            await audit(db, actor, id, 'CANCEL', { reason, invoiceId: order.invoiceId });
            return saved;
        }
        const { o, c } = await locked(db, id);
        if (action === 'REFRESH_LINK') {
            await authority(db, actor, 'SALES');
            if (o.parentAcceptedAt)
                throw Error('Parent already confirmed / 家长已确认');
            await db.renewalOrder.update({ where: { id }, data: { parentToken: crypto.randomBytes(32).toString('hex'), parentExpiresAt: new Date(Date.now() + 14 * 86400000) } });
        }
        else if (action === 'SALES') {
            await authority(db, actor, 'SALES');
            if (o.managerAt)
                throw Error('Already approved / 已审批');
            await db.renewalOrder.update({ where: { id }, data: { salesNote: text(data.note), salesBy: email(actor) } });
        }
        else if (action === 'APPROVE') {
            await authority(db, actor, 'MANAGER');
            if (o.managerAt)
                throw Error('Already approved / 已审批');
            if (!o.salesBy)
                throw Error('Sales confirmation required / 请先由销售确认');
            await db.renewalOrder.update({ where: { id }, data: { qualificationRef: text(data.note), managerBy: email(actor), managerAt: new Date() } });
        }
        else if (action === 'INVOICE') {
            await authority(db, actor, 'FINANCE');
            if (!o.managerAt)
                throw Error('Management approval required / 须管理批准');
            if (o.invoiceId || o.creditPackageId)
                throw Error('Invoice is locked; do not reuse or replace / 发票已锁定，不可重复关联');
            const next = { ...o, invoiceId: data.invoiceId };
            await invoiceEvidence(db, next, c);
            await saveStudentContractInvoiceChoiceInTransaction(db, { contractId: c.id, packageId: c.packageId, mode: 'LINK_EXISTING', invoiceId: data.invoiceId, confirmationNote: `Renewal order ${id}`, selectedBy: actor.email, actorRole: actor.role });
            await db.renewalOrder.update({ where: { id }, data: { invoiceId: data.invoiceId } });
        }
        else if (action === 'CREDIT_APPROVE') {
            await authority(db, actor, 'MANAGER');
            if (!o.managerAt || !o.parentAcceptedAt || !o.invoiceId || o.creditPackageId)
                throw Error('Confirm parent acceptance and invoice first / 请先完成家长确认及发票关联');
            const minutes = Number(data.minutes), limitCents = Math.round(Number(data.limit) * 100), due = new Date(data.due);
            if (due < o.serviceFrom)
                throw Error('Credit expiry precedes the service start / 临时额度到期不能早于服务开始');
            validateCredit({ minutes, limitCents, due, totalMinutes: o.topUpMinutes, feeCents: o.feeCents, serviceTo: o.serviceTo });
            await db.renewalOrder.update({ where: { id }, data: { creditMinutes: minutes, creditLimitCents: limitCents, creditDueAt: due, creditReason: text(data.note), collectionOwner: text(data.owner, 2), creditApprovedBy: email(actor), creditApprovedAt: new Date() } });
        }
        else if (action === 'CREDIT_RELEASE') {
            await authority(db, actor, 'FINANCE');
            if (!o.parentAcceptedAt || !o.managerAt || !o.creditApprovedBy || o.creditApprovedBy === email(actor) || o.creditPackageId || !o.creditMinutes || !o.creditLimitCents || !o.creditDueAt)
                throw Error('Independent management credit approval required / 需独立管理授信批准');
            validateCredit({ minutes: o.creditMinutes, limitCents: o.creditLimitCents, due: o.creditDueAt, totalMinutes: o.topUpMinutes, feeCents: o.feeCents, serviceTo: o.serviceTo });
            const evidence = await invoiceEvidence(db, o, c);
            if (evidence.total === o.feeCents)
                throw Error('Fully paid: activate the paid renewal / 已足额核款，请直接激活正式续费');
            const pkg = await db.coursePackage.create({ data: { studentId: c.studentId, courseId: c.package.courseId, type: 'HOURS', status: 'ACTIVE', validFrom: o.serviceFrom, validTo: o.creditDueAt, totalMinutes: o.creditMinutes, remainingMinutes: o.creditMinutes, paid: false, financeGateStatus: 'SCHEDULABLE', financeGateReason: `Temporary credit, payment outstanding. Renewal ${id}; owner ${o.collectionOwner}`, note: `[RENEWAL_CREDIT:${id}] Temporary unpaid continuation / 未付款临时续课` } });
            await db.packageTxn.create({ data: { packageId: pkg.id, kind: 'PURCHASE', deltaMinutes: o.creditMinutes, deltaAmount: 0, note: `Unpaid credit advance; included in renewal ${id}, not payment / 临时授信，非收款` } });
            await db.renewalOrder.update({ where: { id }, data: { creditPackageId: pkg.id, creditReleasedBy: email(actor) } });
        }
        else if (action === 'ACTIVATE') {
            await authority(db, actor, 'FINANCE');
            if (!o.managerAt || !o.parentAcceptedAt || o.managerBy === email(actor))
                throw Error('Parent acceptance and separate management approval required / 须家长确认及独立管理批准');
            const ev = await invoiceEvidence(db, o, c);
            if (ev.total !== o.feeCents)
                throw Error('Full approved payment required / 须足额已审批收款');
            await db.$queryRaw `SELECT id FROM "CoursePackage" WHERE id=${c.packageId} FOR UPDATE`;
            const pkg = await db.coursePackage.findUniqueOrThrow({ where: { id: c.packageId } });
            let allocated = 0;
            if (o.creditPackageId) {
                await db.$queryRaw `SELECT id FROM "CoursePackage" WHERE id=${o.creditPackageId} FOR UPDATE`;
                const bridge = await db.coursePackage.findUniqueOrThrow({ where: { id: o.creditPackageId } });
                if (bridge.studentId !== c.studentId || bridge.courseId !== c.package.courseId || bridge.type !== 'HOURS' || bridge.settlementMode || !bridge.note?.startsWith(`[RENEWAL_CREDIT:${id}]`) || bridge.totalMinutes !== o.creditMinutes || (bridge.remainingMinutes ?? 0) < 0 || (bridge.remainingMinutes ?? 0) > (o.creditMinutes ?? 0) || bridge.totalMinutes !== o.creditMinutes)
                    throw Error('Credit ledger requires reconciliation / 临时课包须对账');
                allocated = o.creditMinutes!;
                await db.coursePackage.update({ where: { id: bridge.id }, data: { validTo: o.serviceTo, paid: true, paidAt: new Date(), paidAmount: Math.round((o.feeCents / 100) * allocated / o.topUpMinutes), paidNote: `Allocation of paid renewal ${id}`, note: `[RENEWAL_CREDIT_PAID:${id}] Paid portion of renewal / 正式续费已付款分配课时`, financeGateReason: `Paid renewal ${ev.inv.invoiceNo}; included in total ${o.topUpMinutes / 60}h` } });
            }
            const allocatedAmount = Math.round((o.feeCents / 100) * allocated / o.topUpMinutes);
            const add = o.topUpMinutes - allocated;
            const marker = `student-contract-renewal-topup:${c.id}`;
            if (await db.packageTxn.findFirst({ where: { packageId: c.packageId, note: { contains: marker }, kind: 'PURCHASE' } }))
                throw Error('Hours already posted / 课时已入账');
            await db.coursePackage.update({ where: { id: pkg.id }, data: { ...buildTopUpMinutesUpdate(pkg, add), validTo: pkg.validTo && pkg.validTo > o.serviceTo ? pkg.validTo : o.serviceTo, financeGateStatus: 'SCHEDULABLE', financeGateReason: `Paid confirmed renewal ${ev.inv.invoiceNo}`, financeGateUpdatedAt: new Date(), financeGateUpdatedBy: email(actor) } });
            await db.packageTxn.create({ data: { packageId: pkg.id, kind: 'PURCHASE', deltaMinutes: add, deltaAmount: Math.round(o.feeCents / 100) - allocatedAmount, note: `${marker} | Renewal order ${id}; ${allocated} minutes allocated to continuation package` } });
            if (o.creditPackageId)
                await db.packageTxn.create({ data: { packageId: o.creditPackageId, kind: 'PURCHASE', deltaMinutes: 0, deltaAmount: allocatedAmount, note: `Payment allocation, not additional hours; renewal ${id}` } });
            const approval = await db.packageInvoiceApproval.findFirst({ where: { packageId: pkg.id, invoiceId: ev.inv.id }, orderBy: { submittedAt: 'desc' } });
            if (approval?.status === 'REJECTED')
                throw Error('Invoice rejected; resolve first / 发票已退回，须先处理');
            if (approval)
                await db.packageInvoiceApproval.update({ where: { id: approval.id }, data: { status: 'APPROVED', managerApprovedBy: o.managerBy, managerApprovedAt: o.managerAt } });
            else
                await db.packageInvoiceApproval.create({ data: { packageId: pkg.id, invoiceId: ev.inv.id, status: 'APPROVED', submittedBy: o.salesBy!, managerApprovedBy: o.managerBy, managerApprovedAt: o.managerAt } });
            await db.studentContract.update({ where: { id: c.id }, data: { status: 'RENEWAL_CONFIRMED', invoiceId: ev.inv.id, invoiceNo: ev.inv.invoiceNo, invoiceCreatedAt: new Date(ev.inv.createdAt) } });
            await db.renewalOrder.update({ where: { id }, data: { activatedAt: new Date(), activatedBy: email(actor), verifiedReceiptIds: ev.approved.map(r => r.id), verifiedAmountCents: ev.total } });
            const tasks = await db.renewalTask.findMany({ where: { packageId: pkg.id, completedAt: null, contractId: c.id } });
            const posted = await db.packageTxn.findFirstOrThrow({ where: { packageId: pkg.id, kind: 'PURCHASE', note: { contains: marker } } });
            for (const task of tasks) {
                await db.renewalTask.update({ where: { id: task.id }, data: { status: 'PACKAGE_ACTIVE', invoiceId: ev.inv.id, paymentConfirmedAt: new Date(), activatedPackageId: pkg.id, completedAt: new Date(), completedByName: actor.name || actor.email, snoozedUntil: new Date(Date.now() + 30 * 86400000) } });
                await db.auditLog.create({ data: { actorEmail: email(actor), actorRole: actor.role, module: 'RENEWAL', action: 'UPDATE_RENEWAL_TASK', entityType: 'RenewalTask', entityId: task.id, meta: { previousStatus: task.status, status: 'PACKAGE_ACTIVE', sourcePackageId: pkg.id, renewalOrderId: id, paymentEvidence: { id: ev.inv.id, approvedReceiptIds: ev.approved.map(r => r.id) }, entitlementEvidence: { packageId: pkg.id, evidenceIds: [posted.id], quantity: o.topUpMinutes, creditPackageId: o.creditPackageId, allocatedCreditMinutes: allocated, unit: 'MINUTES' } } } });
            }
        }
        else
            throw Error('Unknown action');
        const saved = await db.renewalOrder.findUniqueOrThrow({ where: { id } });
        await audit(db, actor, id, action, { note: data.note || null, invoiceId: saved.invoiceId, managerBy: saved.managerBy, creditMinutes: saved.creditMinutes, creditLimitCents: saved.creditLimitCents, creditDueAt: saved.creditDueAt?.toISOString() || null, creditReason: saved.creditReason, collectionOwner: saved.collectionOwner, creditApprovedBy: saved.creditApprovedBy, creditPackageId: saved.creditPackageId, verifiedReceiptIds: saved.verifiedReceiptIds, verifiedAmountCents: saved.verifiedAmountCents, activatedAt: saved.activatedAt?.toISOString() || null });
        return saved;
    });
}
export async function acceptRenewalOrder(token: string, name: string, ip: string | null) {
    return tx(async (db) => {
        const found = await db.renewalOrder.findUnique({ where: { parentToken: token }, select: { id: true } });
        if (!found)
            throw Error('Confirmation link unavailable / 确认链接不可用');
        const { o, base } = await locked(db, found.id);
        if (!o.managerAt || o.parentExpiresAt < new Date())
            throw Error('Link expired or not ready / 链接已过期或尚未准备完成');
        if (o.parentAcceptedAt)
            return;
        const expected = (base.contractSnapshotJson as any)?.parent?.parentFullNameEn;
        if (!expected || name.trim().toLowerCase() !== String(expected).trim().toLowerCase())
            throw Error('Enter the original contracting parent’s full name / 请填写原签约家长的完整姓名');
        await db.renewalOrder.update({ where: { id: o.id }, data: { parentName: name.trim(), parentAcceptedAt: new Date(), parentIp: ip?.slice(0, 100) || null } });
        await audit(db, { email: 'parent-confirmation@sgtmanage.local', role: 'PARENT', name: name.trim() }, o.id, 'PARENT_ACCEPT', { sourceHash: o.sourceHash, baseHash: o.baseHash, serviceFrom: o.serviceFrom.toISOString(), serviceTo: o.serviceTo.toISOString(), feeCents: o.feeCents, topUpMinutes: o.topUpMinutes });
    });
}
/** Read-only check against the exact receipt references frozen at activation. */
export async function renewalOrderNeedsReconciliation(id: string) {
    const o = await prisma.renewalOrder.findUnique({ where: { id }, include: { contract: true } });
    if (!o?.activatedAt)
        return false;
    try {
        const proof = await invoiceEvidence(prisma, o, o.contract);
        return proof.total !== o.feeCents || JSON.stringify([...proof.approved.map(r => r.id)].sort()) !== JSON.stringify([...(Array.isArray(o.verifiedReceiptIds) ? o.verifiedReceiptIds : [])].sort());
    }
    catch {
        return true;
    }
}
