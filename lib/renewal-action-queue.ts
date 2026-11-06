import { renewalOrderNeedsReconciliation } from './renewal-order';
import { prisma } from './prisma';
import { getApprovalRoleConfig, isRoleApprover } from './approval-flow';
export type RenewalAction = {
    key: string;
    lane: 'MANAGER' | 'FINANCE';
    title: string;
    status: string;
    amount: number;
    createdAt: Date;
    href: string;
    overdue: boolean;
};
export async function getRenewalActions(actor: {
    email: string;
    role: string;
}, now = new Date()): Promise<RenewalAction[]> {
    const cfg = await getApprovalRoleConfig();
    const manager = actor.role !== 'TEACHER' && isRoleApprover(actor.email, cfg.managerApproverEmails);
    const finance = actor.role === 'FINANCE' && isRoleApprover(actor.email, cfg.financeApproverEmails);
    if (!manager && !finance)
        return [];
    const rows = await prisma.renewalSignatureException.findMany({
        where: { status: { in: ['REQUESTED', 'APPROVED', 'ACTIVATED', 'REJECTED'] }, contract: { signedAt: null, voidedAt: null, status: 'READY_TO_SIGN' } },
        include: { contract: { select: { packageId: true, student: { select: { name: true } } } } }, orderBy: { requestedAt: 'asc' },
    });
    const actions: RenewalAction[] = [];
    for (const row of rows) {
        const review = row.status === 'REQUESTED' && manager && row.requestedBy !== actor.email.toLowerCase();
        if (!review && !(finance && row.status !== 'REQUESTED'))
            continue;
        const date = row.status === 'ACTIVATED' ? row.signatureFollowUpDueAt || row.activatedAt! : row.status === 'APPROVED' ? row.managerApprovedAt! : row.requestedAt;
        actions.push({
            key: `renewal-exception-${row.id}`, lane: review ? 'MANAGER' : 'FINANCE', title: `${row.contract.student.name} · ${row.topUpMinutes / 60}h`,
            status: review ? 'Review paid renewal / 审核已付款续费' : row.status === 'APPROVED' ? 'Activate renewal / 激活续费' : row.status === 'REJECTED' ? 'Review returned request / 核对退回申请' : 'Follow up parent signature / 跟进家长补签',
            amount: row.feeCents / 100, createdAt: date, overdue: row.status === 'ACTIVATED' ? date < now : now.getTime() - date.getTime() >= 86400000,
            href: `/admin/packages/${row.contract.packageId}/contract/renewal-exception?contractId=${row.contractId}`
        });
    }
    const orders = await prisma.renewalOrder.findMany({ where: { cancelledAt: null }, include: { contract: { select: { student: { select: { name: true } } } } }, orderBy: { createdAt: 'asc' } });
    for (const o of orders) {
        if (o.activatedAt) {
            if (finance && await renewalOrderNeedsReconciliation(o.id))
                actions.push({ key: `renewal-reconcile-${o.id}`, lane: 'FINANCE', title: o.contract.student.name, status: 'Payment evidence changed: reconcile now / 收款凭据变化，请立即对账', amount: o.feeCents / 100, createdAt: o.activatedAt, overdue: true, href: `/admin/renewals/orders?id=${o.id}` });
            continue;
        }
        const review = manager && !!o.salesBy && !o.managerAt;
        const work = finance && !!o.managerAt;
        if (!review && !work)
            continue;
        const due = o.creditPackageId ? o.creditDueAt : o.parentAcceptedAt ? o.paymentDueAt : o.parentExpiresAt;
        actions.push({ key: `renewal-order-${o.id}`, lane: review ? 'MANAGER' : 'FINANCE', title: `${o.contract.student.name} · ${o.topUpMinutes / 60}h`, status: review ? 'Review renewal order / 审核续费确认单' : !o.parentAcceptedAt ? 'Follow up parent confirmation / 跟进家长确认' : !o.invoiceId ? 'Link renewal invoice / 关联续费发票' : o.creditPackageId ? 'Collect payment for temporary credit / 临时续课催款' : 'Verify payment and activate / 核款并激活', amount: o.feeCents / 100, createdAt: o.createdAt, overdue: due ? due < now : false, href: `/admin/renewals/orders?id=${o.id}` });
    }
    return actions;
}
