import { isManagerUser, requireAdmin } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { ExpenseClaimStatus } from '@prisma/client';
import ExpenseClaimForm from '@/app/_components/ExpenseClaimForm';
import {
  canApproveExpense,
  archiveExpenseClaim,
  canEditExpenseApprovalConfig,
  canFinanceOperateExpense,
  getExpenseApprovalConfig,
  getExpenseClaimReminderQueues,
  formatExpensePaymentMethod,
  EXPENSE_CURRENCY_CODES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_TYPE_OPTIONS,
  formatExpenseMoney,
  getExpenseTypeOption,
  listExpenseClaims,
  markExpenseClaimPaid,
  monthKey,
  rejectExpenseClaim,
  approveExpenseClaim,
  saveExpenseApprovalConfig,
  summarizeExpenseClaims,
} from '@/lib/expense-claims';
import { revalidatePath } from 'next/cache';
import { formatDateOnly, formatMonthKey, formatUTCDateOnly } from '@/lib/date-only';
import path from 'path';
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from '../_components/workbenchStyles';

function isPreviewableImage(name: string | null | undefined) {
  const ext = path.extname(String(name ?? '')).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

const REJECT_REASON_OPTIONS = [
  { value: 'Missing attachment', zh: '缺少附件' },
  { value: 'Attachment unclear', zh: '附件不清晰' },
  { value: 'Amount unclear', zh: '金额不清楚' },
  { value: 'Need more details', zh: '信息不完整' },
  { value: 'Duplicate claim', zh: '疑似重复报销' },
  { value: 'Wrong expense type', zh: '报销类型不正确' },
];

function buildFilterQuery(input: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    const normalized = String(value ?? '').trim();
    if (normalized) params.set(key, normalized);
  }
  return params.toString();
}

function shiftMonth(base: Date, delta: number) {
  return formatMonthKey(new Date(base.getFullYear(), base.getMonth() + delta, 1));
}

function formatClaimStatusLabel(lang: Lang, status: ExpenseClaimStatus) {
  switch (status) {
    case ExpenseClaimStatus.SUBMITTED:
      return t(lang, 'Waiting for approval', '待审批');
    case ExpenseClaimStatus.APPROVED:
      return t(lang, 'Approved, waiting payment', '已批准，待付款');
    case ExpenseClaimStatus.REJECTED:
      return t(lang, 'Rejected, needs update', '已驳回，待补充');
    case ExpenseClaimStatus.PAID:
      return t(lang, 'Paid', '已付款');
    case ExpenseClaimStatus.WITHDRAWN:
      return t(lang, 'Withdrawn', '已撤回');
    default:
      return status;
  }
}

function focusClaimHref(baseQuery: string, claimId: string) {
  const params = new URLSearchParams(baseQuery);
  params.set('claimId', claimId);
  return `/admin/expense-claims?${params.toString()}`;
}

function buildFinanceGroupKey(submitterUserId: string, currencyCode: string) {
  return `${submitterUserId}::${currencyCode}`;
}

export default async function AdminExpenseClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin();
  const lang = await getLang();
  const params = (await searchParams) ?? {};
  const msg = typeof params.msg === 'string' ? params.msg : '';
  const err = typeof params.err === 'string' ? params.err : '';
  const statusFilter = typeof params.status === 'string' ? params.status : 'ALL';
  const monthFilter = typeof params.month === 'string' ? params.month : '';
  const paymentBatchMonthFilter = typeof params.paymentBatchMonth === 'string' ? params.paymentBatchMonth : '';
  const expenseTypeFilter = typeof params.expenseType === 'string' ? params.expenseType : '';
  const currencyFilter = typeof params.currency === 'string' ? params.currency : '';
  const submitterQuery = typeof params.q === 'string' ? params.q : '';
  const selectedClaimIdParam = typeof params.claimId === 'string' ? params.claimId : '';
  const selectedFinanceGroupKeyParam = typeof params.financeGroup === 'string' ? params.financeGroup : '';
  const approvedUnpaidOnly = typeof params.approvedUnpaidOnly === 'string' ? params.approvedUnpaidOnly === '1' : false;
  const archivedOnly = typeof params.archived === 'string' ? params.archived === '1' : false;
  const canApprove = await canApproveExpense(user);
  const canFinance = canFinanceOperateExpense(user);
  const isManager = await isManagerUser(user);
  const canEditApprovalConfig = canEditExpenseApprovalConfig(user.email);
  const approvalCfg = await getExpenseApprovalConfig();
  const filterQuery = buildFilterQuery({
    status: statusFilter !== 'ALL' ? statusFilter : '',
    month: monthFilter,
    paymentBatchMonth: paymentBatchMonthFilter,
    expenseType: expenseTypeFilter,
    currency: currencyFilter,
    q: submitterQuery,
    approvedUnpaidOnly: approvedUnpaidOnly ? '1' : '',
    archived: archivedOnly ? '1' : '',
  });
  const currentMonth = formatMonthKey(new Date());
  const previousMonth = shiftMonth(new Date(), -1);
  const quickExpenseThisMonthHref = `/admin/expense-claims?${buildFilterQuery({
    status: statusFilter !== 'ALL' ? statusFilter : '',
    month: currentMonth,
    paymentBatchMonth: '',
    expenseType: expenseTypeFilter,
    currency: currencyFilter,
    q: submitterQuery,
    approvedUnpaidOnly: approvedUnpaidOnly ? '1' : '',
    archived: archivedOnly ? '1' : '',
  })}`;
  const quickExpenseLastMonthHref = `/admin/expense-claims?${buildFilterQuery({
    status: statusFilter !== 'ALL' ? statusFilter : '',
    month: previousMonth,
    paymentBatchMonth: '',
    expenseType: expenseTypeFilter,
    currency: currencyFilter,
    q: submitterQuery,
    approvedUnpaidOnly: approvedUnpaidOnly ? '1' : '',
    archived: archivedOnly ? '1' : '',
  })}`;
  const quickApprovedUnpaidHref = `/admin/expense-claims?${buildFilterQuery({
    status: '',
    month: '',
    paymentBatchMonth: '',
    expenseType: '',
    currency: '',
    q: '',
    approvedUnpaidOnly: '1',
    archived: '',
  })}`;
  const quickSubmittedHref = `/admin/expense-claims?${buildFilterQuery({
    status: ExpenseClaimStatus.SUBMITTED,
    month: '',
    paymentBatchMonth: '',
    expenseType: '',
    currency: '',
    q: '',
    approvedUnpaidOnly: '',
    archived: '',
  })}`;
  const quickClearHref = '/admin/expense-claims';
  const hasAdvancedFilters =
    statusFilter !== 'ALL' ||
    Boolean(monthFilter) ||
    Boolean(paymentBatchMonthFilter) ||
    Boolean(expenseTypeFilter) ||
    Boolean(currencyFilter) ||
    Boolean(submitterQuery) ||
    approvedUnpaidOnly ||
    archivedOnly;

  async function approveAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Not allowed' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const nextClaimId = String(formData.get('nextClaimId') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Missing claim id' })}`);
    await approveExpenseClaim({ claimId, approver: actor });
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), claimId: nextClaimId, msg: nextClaimId ? 'Expense claim approved. Moved to next claim.' : 'Expense claim approved' })}`);
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Not allowed' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const nextClaimId = String(formData.get('nextClaimId') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();
    if (!claimId || !reason) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Reject reason is required' })}`);
    await rejectExpenseClaim({ claimId, reason, approver: actor });
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), claimId: nextClaimId, msg: nextClaimId ? 'Expense claim rejected. Moved to next claim.' : 'Expense claim rejected' })}`);
  }

  async function markPaidAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canFinanceOperateExpense(actor)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Only finance can mark paid' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const nextClaimId = String(formData.get('nextClaimId') ?? '').trim();
    const paymentBatchMonth = String(formData.get('paymentBatchMonth') ?? '').trim();
    const financeRemarks = String(formData.get('financeRemarks') ?? '').trim();
    const paymentMethod = String(formData.get('paymentMethod') ?? '').trim();
    const paymentReference = String(formData.get('paymentReference') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Missing claim id' })}`);
    await markExpenseClaimPaid({
      claimId,
      paymentBatchMonth: paymentBatchMonth || null,
      financeRemarks: financeRemarks || null,
      paymentMethod,
      paymentReference: paymentReference || null,
      paidBy: actor,
    });
    redirect(`/admin/expense-claims?${buildFilterQuery({
      ...Object.fromEntries(new URLSearchParams(filterQuery)),
      approvedUnpaidOnly: '1',
      claimId: nextClaimId,
      msg: nextClaimId ? 'Expense claim marked paid. Moved to next payout item.' : 'Expense claim marked paid',
    })}`);
  }

  async function markPaidBatchAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canFinanceOperateExpense(actor)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Only finance can mark paid' })}`);
    }
    const claimIds = formData.getAll('claimIds').map((value) => String(value ?? '').trim()).filter(Boolean);
    const financeGroup = String(formData.get('financeGroup') ?? '').trim();
    const paymentBatchMonth = String(formData.get('paymentBatchMonth') ?? '').trim();
    const financeRemarks = String(formData.get('financeRemarks') ?? '').trim();
    const paymentMethod = String(formData.get('paymentMethod') ?? '').trim();
    const paymentReference = String(formData.get('paymentReference') ?? '').trim();
    if (!claimIds.length) {
      redirect(`/admin/expense-claims?${buildFilterQuery({
        ...Object.fromEntries(new URLSearchParams(filterQuery)),
        approvedUnpaidOnly: '1',
        financeGroup,
        err: 'Select at least one approved unpaid claim',
      })}`);
    }
    for (const claimId of claimIds) {
      await markExpenseClaimPaid({
        claimId,
        paymentBatchMonth: paymentBatchMonth || null,
        financeRemarks: financeRemarks || null,
        paymentMethod,
        paymentReference: paymentReference || null,
        paidBy: actor,
      });
    }
    redirect(`/admin/expense-claims?${buildFilterQuery({
      ...Object.fromEntries(new URLSearchParams(filterQuery)),
      approvedUnpaidOnly: '1',
      financeGroup,
      msg: `${claimIds.length} expense claim(s) marked paid`,
    })}`);
  }

  async function saveApprovalConfigAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canEditExpenseApprovalConfig(actor.email)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Not allowed to edit expense approver config' })}`);
    }
    const approverEmailsRaw = String(formData.get('approverEmails') ?? '');
    await saveExpenseApprovalConfig({ approverEmailsRaw });
    revalidatePath('/admin/expense-claims');
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), msg: 'Expense approver config updated' })}`);
  }

  async function archiveAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    const claimId = String(formData.get('claimId') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Missing claim id' })}`);
    await archiveExpenseClaim({ claimId, actor });
    revalidatePath('/admin/expense-claims');
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), msg: 'Expense claim archived' })}`);
  }

  const claims = await listExpenseClaims({
    status: (statusFilter as ExpenseClaimStatus | 'ALL') || 'ALL',
    month: monthFilter || null,
    paymentBatchMonth: paymentBatchMonthFilter || null,
    expenseTypeCode: expenseTypeFilter || null,
    currencyCode: currencyFilter || null,
    submitterQuery: submitterQuery || null,
    approvedUnpaidOnly,
    archived: archivedOnly,
  });
  const summary = summarizeExpenseClaims(claims);
  const reminders = await getExpenseClaimReminderQueues();
  const exportHref = `/api/exports/expense-claims${filterQuery ? `?${filterQuery}` : ''}`;
  const reviewQueue = claims.filter((claim) => claim.status === ExpenseClaimStatus.SUBMITTED);
  const selectedReviewClaim = reviewQueue.find((claim) => claim.id === selectedClaimIdParam) ?? reviewQueue[0] ?? null;
  const selectedReviewIndex = selectedReviewClaim ? reviewQueue.findIndex((claim) => claim.id === selectedReviewClaim.id) : -1;
  const nextReviewClaimId = selectedReviewIndex >= 0 && selectedReviewIndex + 1 < reviewQueue.length ? reviewQueue[selectedReviewIndex + 1]?.id ?? '' : '';
  const financeQueue = claims.filter((claim) => claim.status === ExpenseClaimStatus.APPROVED);
  const financeGroups = Array.from(
    financeQueue.reduce((map, claim) => {
      const key = buildFinanceGroupKey(claim.submitterUserId, claim.currencyCode);
      const existing = map.get(key);
      if (existing) {
        existing.claims.push(claim);
        existing.totalCents += claim.amountCents + (claim.gstAmountCents ?? 0);
      } else {
        map.set(key, {
          key,
          submitterName: claim.submitterName,
          submitterUserId: claim.submitterUserId,
          currencyCode: claim.currencyCode,
          totalCents: claim.amountCents + (claim.gstAmountCents ?? 0),
          claims: [claim],
        });
      }
      return map;
    }, new Map<string, {
      key: string;
      submitterName: string;
      submitterUserId: string;
      currencyCode: string;
      totalCents: number;
      claims: typeof financeQueue;
    }>()),
  ).map(([, group]) => ({
    ...group,
    claims: group.claims.sort((a, b) => a.expenseDate.getTime() - b.expenseDate.getTime()),
  }));
  const selectedFinanceGroup =
    financeGroups.find((group) => group.key === selectedFinanceGroupKeyParam) ??
    financeGroups.find((group) => group.claims.some((claim) => claim.id === selectedClaimIdParam)) ??
    financeGroups[0] ??
    null;
  const selectedFinanceGroupIndex = selectedFinanceGroup ? financeGroups.findIndex((group) => group.key === selectedFinanceGroup.key) : -1;
  const activeFilterCount = [
    statusFilter !== 'ALL',
    Boolean(monthFilter),
    Boolean(paymentBatchMonthFilter),
    Boolean(expenseTypeFilter),
    Boolean(currencyFilter),
    Boolean(submitterQuery),
    approvedUnpaidOnly,
    archivedOnly,
  ].filter(Boolean).length;
  const reminderCount = reminders.staleSubmitted.length + reminders.staleApprovedUnpaid.length;
  const currentDatasetLabel = approvedUnpaidOnly
    ? t(lang, 'Approved but unpaid only', '仅看已批未付')
    : archivedOnly
      ? t(lang, 'Archived claims only', '仅看已归档报销单')
      : statusFilter !== 'ALL'
        ? formatClaimStatusLabel(lang, statusFilter as ExpenseClaimStatus)
        : t(lang, 'All working states', '全部工作状态');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={workbenchHeroStyle('amber')}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#a16207', letterSpacing: 0.4 }}>
            {t(lang, 'Expense Operations Desk', '报销工作台')}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, 'Expense Claims', '报销审批')}</h1>
          <div style={{ color: '#475569', lineHeight: 1.5 }}>
            {t(
              lang,
              'Start from submitted review or approved payout groups, then use history only for follow-up and exports.',
              '优先处理待审批队列和已批未付分组，历史列表只作为跟进和导出使用。'
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#fff', border: '1px solid #e5e7eb', color: '#334155', fontSize: 12 }}>
            {t(lang, 'Current dataset', '当前数据集')}: <b>{currentDatasetLabel}</b>
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#fff', border: '1px solid #e5e7eb', color: '#334155', fontSize: 12 }}>
            {t(lang, 'Active filters', '生效筛选')}: <b>{activeFilterCount}</b>
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#fff', border: '1px solid #e5e7eb', color: '#334155', fontSize: 12 }}>
            {t(lang, 'Follow-up reminders', '跟进提醒')}: <b>{reminderCount}</b>
          </span>
        </div>
      </section>

      {msg ? <div style={{ padding: 10, borderRadius: 8, background: '#ecfdf5', color: '#166534' }}>{msg}</div> : null}
      {err ? <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>{err}</div> : null}

      <details style={{ ...workbenchFilterPanelStyle, padding: 16 }} open={canEditApprovalConfig}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          {t(lang, 'Expense approval config', '报销审批配置')}
        </summary>
        <div style={{ color: '#475569', fontSize: 14, marginTop: 12 }}>
          {t(lang, 'Approved expense claims are controlled by this approver list.', '报销单的批准权限由这组审批人控制。')}
        </div>
        {canEditApprovalConfig ? (
          <form action={saveApprovalConfigAction} style={{ display: 'grid', gap: 8, maxWidth: 980, marginTop: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>{t(lang, 'Expense approver emails (comma-separated)', '报销审批人邮箱（逗号分隔）')}</span>
              <textarea
                name="approverEmails"
                rows={3}
                defaultValue={approvalCfg.approverEmails.join(', ')}
                placeholder="approver1@example.com, approver2@example.com"
              />
            </label>
            <div style={{ color: '#64748b', fontSize: 13 }}>
              {t(lang, 'If left empty, the system falls back to the manager approver list.', '如果留空，系统将回退到通用经理审批人列表。')}
            </div>
            <div>
              <button type="submit">{t(lang, 'Save approval config', '保存审批配置')}</button>
            </div>
          </form>
        ) : (
          <div style={{ color: '#334155', fontSize: 14, marginTop: 12 }}>
            {approvalCfg.approverEmails.length ? approvalCfg.approverEmails.join(', ') : '-'}
          </div>
        )}
      </details>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div style={{ ...workbenchMetricCardStyle('blue'), background: '#f8fbff' }}>
          <div style={workbenchMetricLabelStyle('slate')}>{t(lang, 'Submitted', '待审批')}</div>
          <div style={workbenchMetricValueStyle('slate')}>{summary.submittedCount}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle('amber'), background: '#fffbeb' }}>
          <div style={workbenchMetricLabelStyle('slate')}>{t(lang, 'Approved but unpaid', '已批未付')}</div>
          <div style={workbenchMetricValueStyle('amber')}>{summary.approvedCount}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle('emerald'), background: '#f0fdf4' }}>
          <div style={workbenchMetricLabelStyle('slate')}>{t(lang, 'Paid', '已付款')}</div>
          <div style={workbenchMetricValueStyle('emerald')}>{summary.paidCount}</div>
        </div>
        <div style={workbenchMetricCardStyle('slate')}>
          <div style={workbenchMetricLabelStyle('slate')}>{t(lang, 'Rejected', '已驳回')}</div>
          <div style={workbenchMetricValueStyle('slate')}>{summary.rejectedCount}</div>
        </div>
      </div>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{t(lang, 'Totals by currency', '按币种汇总')}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {summary.totalsByCurrency.length ? summary.totalsByCurrency.map((item) => (
            <div key={item.currencyCode} style={{ padding: '8px 12px', borderRadius: 999, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
              {formatExpenseMoney(item.cents, item.currencyCode)}
            </div>
          )) : <div style={{ color: '#64748b' }}>-</div>}
        </div>
      </section>

      <section style={{ ...workbenchFilterPanelStyle, padding: 16, display: 'grid', gap: 12, background: '#f8fafc' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 700 }}>{t(lang, 'Quick work filters', '工作流快速筛选')}</div>
          <div style={{ color: '#475569', fontSize: 14 }}>
            {t(
              lang,
              'Use these shortcuts to quickly switch the page dataset. They affect the review queue, finance queue, history list, and CSV export together.',
              '这些快捷筛选会一起影响审批队列、财务队列、历史列表和 CSV 导出。',
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={quickSubmittedHref}>{t(lang, 'Submitted review queue', '待审批队列')}</a>
          <a href={quickApprovedUnpaidHref}>{t(lang, 'Approved but unpaid', '已批未付')}</a>
          <a href={quickExpenseThisMonthHref}>{t(lang, 'This month expenses', '本月消费')}</a>
          <a href={quickExpenseLastMonthHref}>{t(lang, 'Last month expenses', '上月消费')}</a>
          <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
        </div>
      </section>

      <section style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: 16, display: 'grid', gap: 16, background: '#f8fbff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{t(lang, 'My review queue', '我的审批队列')}</div>
            <div style={{ color: '#475569', fontSize: 14 }}>
              {t(lang, 'Focus on submitted claims first, then move through them one by one.', '先处理待审批报销单，再逐条往下审核。')}
            </div>
          </div>
          <div style={{ color: '#1d4ed8', fontWeight: 700 }}>
            {t(lang, 'Waiting now', '当前待审批')}: {reviewQueue.length}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(360px, 1fr)' }}>
          <section style={{ border: '1px solid #bfdbfe', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #dbeafe', fontWeight: 700 }}>
              {t(lang, 'Submitted queue', '待审批队列')}
            </div>
            {reviewQueue.length ? (
              <div style={{ display: 'grid' }}>
                {reviewQueue.map((claim) => {
                  const isSelected = claim.id === selectedReviewClaim?.id;
                  return (
                    <a
                      key={claim.id}
                      href={focusClaimHref(filterQuery, claim.id)}
                      style={{
                        display: 'grid',
                        gap: 8,
                        padding: 14,
                        textDecoration: 'none',
                        color: 'inherit',
                        borderTop: '1px solid #eff6ff',
                        background: isSelected ? '#eff6ff' : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontWeight: 700 }}>{claim.claimRefNo}</div>
                        <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>
                          {t(lang, 'Focus', '聚焦')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                        <span>{claim.submitterName}</span>
                        <span>{formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 13 }}>
                        <span>{formatUTCDateOnly(claim.expenseDate)}</span>
                        <span>{getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode}</span>
                      </div>
                      {claim.studentName ? (
                        <div style={{ color: '#334155', fontSize: 12 }}>
                          {t(lang, 'Student', '学生')}: {claim.studentName}
                        </div>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 16, color: '#64748b' }}>
                {t(lang, 'No submitted claims match the current filters.', '当前筛选下没有待审批报销单。')}
              </div>
            )}
          </section>

          <section style={{ border: '1px solid #bfdbfe', borderRadius: 12, background: '#fff', padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{t(lang, 'Selected claim', '当前处理项')}</div>
                <div style={{ color: '#475569', fontSize: 14 }}>
                  {selectedReviewClaim
                    ? t(lang, 'Review one claim at a time with the attachment and next action together.', '每次只审核一条，附件和下一步动作放在一起。')
                    : t(lang, 'Pick one submitted claim from the queue to review it here.', '从左侧待审批队列选择一条后，在这里集中处理。')}
                </div>
              </div>
              {selectedReviewClaim ? (
                <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>
                  {t(lang, 'Queue position', '队列位置')} {selectedReviewIndex + 1} / {reviewQueue.length}
                </div>
              ) : null}
            </div>

            {selectedReviewClaim ? (
              <>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedReviewClaim.claimRefNo}</div>
                  <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div><strong>{t(lang, 'Submitter', '提交人')}:</strong> {selectedReviewClaim.submitterName}</div>
                    <div><strong>{t(lang, 'Date', '日期')}:</strong> {formatUTCDateOnly(selectedReviewClaim.expenseDate)}</div>
                    <div><strong>{t(lang, 'Type', '类型')}:</strong> {getExpenseTypeOption(selectedReviewClaim.expenseTypeCode)?.label ?? selectedReviewClaim.expenseTypeCode}</div>
                    <div><strong>{t(lang, 'Amount', '金额')}:</strong> {formatExpenseMoney(selectedReviewClaim.amountCents + (selectedReviewClaim.gstAmountCents ?? 0), selectedReviewClaim.currencyCode)}</div>
                    <div><strong>{t(lang, 'Status', '状态')}:</strong> {formatClaimStatusLabel(lang, selectedReviewClaim.status)}</div>
                    {selectedReviewClaim.studentName ? <div><strong>{t(lang, 'Student', '学生')}:</strong> {selectedReviewClaim.studentName}</div> : null}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>{t(lang, 'Attachment note / purpose', '附件说明 / 用途')}</div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #dbeafe', background: '#f8fbff', whiteSpace: 'pre-wrap' }}>
                    {selectedReviewClaim.description}
                  </div>
                  {selectedReviewClaim.remarks ? (
                    <div style={{ color: '#475569' }}>
                      <strong>{t(lang, 'Remarks', '备注')}:</strong> {selectedReviewClaim.remarks}
                    </div>
                  ) : null}
                  <div style={{ color: '#64748b', fontSize: 12, wordBreak: 'break-all' }}>{selectedReviewClaim.receiptOriginalName}</div>
                  {isPreviewableImage(selectedReviewClaim.receiptOriginalName) ? (
                    <a href={`/api/expense-claims/${encodeURIComponent(selectedReviewClaim.id)}/receipt`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/expense-claims/${encodeURIComponent(selectedReviewClaim.id)}/receipt`}
                        alt={selectedReviewClaim.receiptOriginalName || 'receipt'}
                        style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff' }}
                      />
                    </a>
                  ) : null}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href={`/api/expense-claims/${encodeURIComponent(selectedReviewClaim.id)}/receipt`} target="_blank" rel="noreferrer">{t(lang, 'View attachment', '查看附件')}</a>
                    <a href={`/api/expense-claims/${encodeURIComponent(selectedReviewClaim.id)}/receipt?download=1`} target="_blank" rel="noreferrer">{t(lang, 'Download attachment', '下载附件')}</a>
                  </div>
                </div>

                {canApprove ? (
                  <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 12, border: '1px solid #dbeafe', background: '#f8fbff' }}>
                    <div style={{ fontWeight: 700 }}>{t(lang, 'Quick review flow', '快速审批流')}</div>
                    <div style={{ color: '#475569', fontSize: 14 }}>
                      {nextReviewClaimId
                        ? t(lang, 'Approve or reject this claim and the panel will move to the next submitted item.', '批准或驳回后，面板会自动切到下一条待审批记录。')
                        : t(lang, 'This is the last submitted claim in the current queue.', '这是当前待审批队列中的最后一条。')}
                    </div>
                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(180px, 220px) minmax(220px, 1fr)' }}>
                      <form action={approveAction}>
                        <input type="hidden" name="claimId" value={selectedReviewClaim.id} />
                        <input type="hidden" name="nextClaimId" value={nextReviewClaimId} />
                        <button type="submit" style={{ width: '100%' }}>
                          {nextReviewClaimId ? t(lang, 'Approve & next', '批准并下一条') : t(lang, 'Approve', '批准')}
                        </button>
                      </form>
                      <form action={rejectAction} style={{ display: 'grid', gap: 8 }}>
                        <input type="hidden" name="claimId" value={selectedReviewClaim.id} />
                        <input type="hidden" name="nextClaimId" value={nextReviewClaimId} />
                        <select name="reason" defaultValue="">
                          <option value="">{t(lang, 'Select reject reason', '选择驳回原因')}</option>
                          {REJECT_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={`${option.value} / ${option.zh}`}>{option.value} / {option.zh}</option>
                          ))}
                        </select>
                        <button type="submit">
                          {nextReviewClaimId ? t(lang, 'Reject & next', '驳回并下一条') : t(lang, 'Reject', '驳回')}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>{t(lang, 'Read only', '只读')}</div>
                )}
              </>
            ) : (
              <div style={{ padding: '12px 0', color: '#64748b' }}>
                {t(lang, 'No submitted claim is selected. Adjust filters or choose a submitted item from the queue.', '当前没有选中的待审批报销单。你可以调整筛选，或从左侧队列选择一条。')}
              </div>
            )}
          </section>
        </div>
      </section>

      {canFinance ? (
        <section style={{ border: '1px solid #fde68a', borderRadius: 12, padding: 16, display: 'grid', gap: 16, background: '#fffbeb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{t(lang, 'Finance queue', '财务待处理队列')}</div>
              <div style={{ color: '#475569', fontSize: 14 }}>
                {t(lang, 'Focus on approved claims waiting for payment, then mark them paid one by one.', '先处理已批准未付款报销单，再逐条完成付款登记。')}
              </div>
            </div>
            <div style={{ color: '#a16207', fontWeight: 700 }}>
              {t(lang, 'Approved unpaid now', '当前已批未付')}: {financeQueue.length}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(360px, 1fr)' }}>
            <section style={{ border: '1px solid #fcd34d', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #fde68a', fontWeight: 700 }}>
                {t(lang, 'Approved unpaid groups', '已批未付分组')}
              </div>
              {financeGroups.length ? (
                <div style={{ display: 'grid' }}>
                  {financeGroups.map((group) => {
                    const isSelected = group.key === selectedFinanceGroup?.key;
                    const firstClaim = group.claims[0];
                    const financeTypeLabel = getExpenseTypeOption(firstClaim.expenseTypeCode)?.label ?? firstClaim.expenseTypeCode;
                    return (
                      <a
                        key={group.key}
                        href={`/admin/expense-claims?${buildFilterQuery({
                          ...Object.fromEntries(new URLSearchParams(filterQuery)),
                          approvedUnpaidOnly: '1',
                          financeGroup: group.key,
                        })}`}
                        style={{
                          display: 'grid',
                          gap: 8,
                          padding: 14,
                          textDecoration: 'none',
                          color: 'inherit',
                          borderTop: '1px solid #fef3c7',
                          background: isSelected ? '#fef3c7' : '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <div style={{ fontWeight: 700 }}>{firstClaim.claimRefNo}</div>
                          <span style={{ fontSize: 12, color: '#a16207', fontWeight: 700 }}>
                            {t(lang, 'Focus', '聚焦')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                          <span>{group.submitterName}</span>
                          <span>{formatExpenseMoney(group.totalCents, group.currencyCode)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 13 }}>
                          <span>{group.claims.length} {t(lang, 'claims', '条报销单')}</span>
                          <span>{firstClaim.approverEmail || t(lang, 'Approved', '已批准')}</span>
                        </div>
                        <div style={{ color: '#334155', fontSize: 12 }}>
                          {t(lang, 'Primary type / currency', '主要类型 / 币种')}: {financeTypeLabel} · {group.currencyCode}
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 16, color: '#64748b' }}>
                  {t(lang, 'No approved unpaid claims match the current filters.', '当前筛选下没有已批未付报销单。')}
                </div>
              )}
            </section>

            <section style={{ border: '1px solid #fcd34d', borderRadius: 12, background: '#fff', padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t(lang, 'Selected payout group', '当前付款分组')}</div>
                  <div style={{ color: '#475569', fontSize: 14 }}>
                    {selectedFinanceGroup
                      ? t(lang, 'Handle one teacher and one currency group at a time, with shared payment details for the selected claims.', '每次处理同一老师同一币种的一组报销单，统一填写付款信息。')
                      : t(lang, 'Pick one approved unpaid group from the finance queue to record payment here.', '从左侧财务队列选择一组已批未付报销单，在这里登记付款。')}
                  </div>
                </div>
                {selectedFinanceGroup ? (
                  <div style={{ color: '#a16207', fontWeight: 700, fontSize: 13 }}>
                    {t(lang, 'Queue position', '队列位置')} {selectedFinanceGroupIndex + 1} / {financeGroups.length}
                  </div>
                ) : null}
              </div>

              {selectedFinanceGroup ? (
                <>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedFinanceGroup.submitterName} · {selectedFinanceGroup.currencyCode}</div>
                    <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                      <div><strong>{t(lang, 'Submitter', '提交人')}:</strong> {selectedFinanceGroup.submitterName}</div>
                      <div><strong>{t(lang, 'Claim count', '报销单数量')}:</strong> {selectedFinanceGroup.claims.length}</div>
                      <div><strong>{t(lang, 'Currency', '币种')}:</strong> {selectedFinanceGroup.currencyCode}</div>
                      <div><strong>{t(lang, 'Total amount', '总金额')}:</strong> {formatExpenseMoney(selectedFinanceGroup.totalCents, selectedFinanceGroup.currencyCode)}</div>
                      <div><strong>{t(lang, 'Date range', '日期范围')}:</strong> {formatUTCDateOnly(selectedFinanceGroup.claims[0].expenseDate)} - {formatUTCDateOnly(selectedFinanceGroup.claims[selectedFinanceGroup.claims.length - 1].expenseDate)}</div>
                      <div><strong>{t(lang, 'Payment batch month', '付款批次月份')}:</strong> {paymentBatchMonthFilter || formatMonthKey(new Date())}</div>
                    </div>
                  </div>

                  <form action={markPaidBatchAction} style={{ display: 'grid', gap: 10 }}>
                    <input type="hidden" name="financeGroup" value={selectedFinanceGroup.key} />
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 700 }}>{t(lang, 'Group claims', '组内报销单')}</div>
                      {selectedFinanceGroup.claims.map((claim) => (
                        <label
                          key={claim.id}
                          style={{
                            display: 'grid',
                            gap: 6,
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid #fde68a',
                            background: '#fffdf5',
                          }}
                        >
                          <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <input type="checkbox" name="claimIds" value={claim.id} defaultChecked />
                            <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 700 }}>
                                <span>{claim.claimRefNo}</span>
                                <span>{formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}</span>
                              </span>
                              <span style={{ color: '#475569', fontSize: 13 }}>
                                {formatUTCDateOnly(claim.expenseDate)} · {getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode}
                              </span>
                              <span style={{ color: '#334155', fontSize: 13, whiteSpace: 'pre-wrap' }}>{claim.description}</span>
                              <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                                <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank" rel="noreferrer">{t(lang, 'View attachment', '查看附件')}</a>
                                <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt?download=1`} target="_blank" rel="noreferrer">{t(lang, 'Download attachment', '下载附件')}</a>
                              </span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 12, border: '1px solid #fde68a', background: '#fffdf5' }}>
                      <div style={{ fontWeight: 700 }}>{t(lang, 'Batch payment details', '批量付款信息')}</div>
                      <div style={{ color: '#475569', fontSize: 14 }}>
                        {t(lang, 'Fill once for the selected claims in this teacher-and-currency group.', '对这一组同老师同币种的选中报销单，只需填写一次付款信息。')}
                      </div>
                      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>{t(lang, 'Payment method', '付款方式')}</span>
                          <select name="paymentMethod" defaultValue="BANK_TRANSFER">
                            {EXPENSE_PAYMENT_METHODS.map((method) => (
                              <option key={method} value={method}>{formatExpensePaymentMethod(method)}</option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>{t(lang, 'Payment reference', '付款参考号')}</span>
                          <input name="paymentReference" placeholder={t(lang, 'Shared bank ref / transaction id', '共享银行流水号 / 交易号')} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>{t(lang, 'Payment batch month', '付款批次月份')}</span>
                          <input type="month" name="paymentBatchMonth" defaultValue={paymentBatchMonthFilter || formatMonthKey(new Date())} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span>{t(lang, 'Finance remarks', '财务备注')}</span>
                          <input name="financeRemarks" placeholder={t(lang, 'Optional note for this payout batch', '这批付款的可选备注')} />
                        </label>
                      </div>
                      <button type="submit">{t(lang, 'Mark selected paid', '标记选中已付款')}</button>
                    </div>
                  </form>
                </>
              ) : (
                <div style={{ padding: '12px 0', color: '#64748b' }}>
                  {t(lang, 'No approved unpaid group is selected. Adjust filters or choose a finance group from the queue.', '当前没有选中的已批未付分组。你可以调整筛选，或从左侧财务队列选择一组。')}
                </div>
              )}
            </section>
          </div>
        </section>
      ) : null}

      {(reminders.staleSubmitted.length || reminders.staleApprovedUnpaid.length) ? (
        <details style={{ border: '1px solid #fecaca', borderRadius: 12, padding: 16, background: '#fff7f7' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            {t(lang, 'Follow-up reminders', '跟进提醒')} ({reminders.staleSubmitted.length + reminders.staleApprovedUnpaid.length})
          </summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {reminders.staleSubmitted.length ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 600 }}>{t(lang, 'Submitted more than 3 days ago', '提交超过3天未审批')}</div>
                {reminders.staleSubmitted.slice(0, 8).map((claim) => (
                  <div key={claim.id} style={{ fontSize: 14 }}>
                    {claim.claimRefNo} | {claim.submitterName} | {formatUTCDateOnly(claim.expenseDate)} | {formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}
                  </div>
                ))}
                {reminders.staleSubmitted.length > 8 ? (
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {t(lang, 'More stale submitted claims remain in the queue below.', '还有更多超时待审批记录，请在下方队列继续处理。')}
                  </div>
                ) : null}
              </div>
            ) : null}
            {reminders.staleApprovedUnpaid.length ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 600 }}>{t(lang, 'Approved more than 3 days ago but not paid', '批准超过3天仍未付款')}</div>
                {reminders.staleApprovedUnpaid.slice(0, 8).map((claim) => (
                  <div key={claim.id} style={{ fontSize: 14 }}>
                    {claim.claimRefNo} | {claim.submitterName} | {formatUTCDateOnly(claim.expenseDate)} | {formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}
                  </div>
                ))}
                {reminders.staleApprovedUnpaid.length > 8 ? (
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    {t(lang, 'More approved-unpaid claims remain in the filtered list below.', '还有更多已批未付记录，请在下方列表继续处理。')}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      <details
        open={hasAdvancedFilters}
        style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 14 }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          {t(lang, 'Advanced filters and export', '高级筛选与导出')}
        </summary>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#f8fafc', border: '1px solid #e5e7eb', fontSize: 12 }}>
            {t(lang, 'Status', '状态')}: {statusFilter === 'ALL' ? t(lang, 'All', '全部') : formatClaimStatusLabel(lang, statusFilter as ExpenseClaimStatus)}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#f8fafc', border: '1px solid #e5e7eb', fontSize: 12 }}>
            {t(lang, 'Expense month', '消费月份')}: {monthFilter || '-'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#f8fafc', border: '1px solid #e5e7eb', fontSize: 12 }}>
            {t(lang, 'Payment batch month', '付款批次月份')}: {paymentBatchMonthFilter || '-'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#f8fafc', border: '1px solid #e5e7eb', fontSize: 12 }}>
            {t(lang, 'Submitter query', '提交人搜索')}: {submitterQuery || '-'}
          </span>
        </div>
        <div style={{ color: '#475569', fontSize: 14, marginTop: 12 }}>
          {t(
            lang,
            'Use advanced filters when you need to narrow by month, type, currency, submitter, payment batch, or archived status. CSV export follows the same filtered dataset.',
            '当你需要按月份、类型、币种、提交人、付款批次或归档状态精确筛选时，使用这里的高级筛选。CSV 导出也会跟随同一份筛选结果。',
          )}
        </div>
        <form style={{ display: 'grid', gap: 14, marginTop: 4 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 600, color: '#334155' }}>{t(lang, 'Expense filters', '消费筛选')}</div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>{t(lang, 'Status', '状态')}</span>
                <select name="status" defaultValue={statusFilter}>
                  <option value="ALL">{t(lang, 'All', '全部')}</option>
                  {Object.values(ExpenseClaimStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>{t(lang, 'Expense month', '消费月份')}</span>
                <input type="month" name="month" defaultValue={monthFilter} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>{t(lang, 'Type', '类型')}</span>
                <select name="expenseType" defaultValue={expenseTypeFilter}>
                  <option value="">{t(lang, 'All', '全部')}</option>
                  {EXPENSE_TYPE_OPTIONS.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>{t(lang, 'Currency', '币种')}</span>
                <select name="currency" defaultValue={currencyFilter}>
                  <option value="">{t(lang, 'All', '全部')}</option>
                  {EXPENSE_CURRENCY_CODES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 600, color: '#334155' }}>{t(lang, 'Payment and follow-up filters', '付款与跟进筛选')}</div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>{t(lang, 'Payment batch month', '付款批次月份')}</span>
                <input type="month" name="paymentBatchMonth" defaultValue={paymentBatchMonthFilter} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span>{t(lang, 'Submitter / ref / student', '提交人 / 编号 / 学生')}</span>
                <input name="q" defaultValue={submitterQuery} placeholder={t(lang, 'Name / ref / student', '姓名 / 编号 / 学生')} />
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 40 }}>
                <input type="checkbox" name="approvedUnpaidOnly" value="1" defaultChecked={approvedUnpaidOnly} />
                <span>{t(lang, 'Approved but unpaid only', '仅看已批未付')}</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 40 }}>
                <input type="checkbox" name="archived" value="1" defaultChecked={archivedOnly} />
                <span>{t(lang, 'Archived only', '仅看已归档')}</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit">{t(lang, 'Apply', '应用')}</button>
            <a href={exportHref}>{t(lang, 'Export CSV', '导出 CSV')}</a>
          </div>
        </form>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          {t(lang, 'Full claim list and history', '完整报销列表与历史')} ({claims.length})
        </summary>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                t(lang, 'Ref', '编号'),
                t(lang, 'Submitter', '提交人'),
                t(lang, 'Date', '日期'),
                t(lang, 'Type', '类型'),
                t(lang, 'Amount', '金额'),
                t(lang, 'Status', '状态'),
                t(lang, 'Receipt', '附件'),
                t(lang, 'Action', '操作'),
              ].map((head) => (
                <th key={head} style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 6px' }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => {
              const typeLabel = getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode;
              return (
                <tr key={claim.id}>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div>{claim.claimRefNo}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{claim.accountCode}</div>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div>{claim.submitterName}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{claim.submitterRole}</div>
                    {claim.studentName ? <div style={{ color: '#334155', fontSize: 12 }}>{t(lang, 'Student', '学生')}: {claim.studentName}</div> : null}
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>{formatUTCDateOnly(claim.expenseDate)}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>{typeLabel}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>{formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div>{formatClaimStatusLabel(lang, claim.status)}</div>
                    {claim.approverEmail ? <div style={{ color: '#64748b', fontSize: 12 }}>{claim.approverEmail}</div> : null}
                    {claim.rejectReason ? <div style={{ color: '#b91c1c', fontSize: 12 }}>{claim.rejectReason}</div> : null}
                    {claim.paymentMethod ? <div style={{ color: '#334155', fontSize: 12 }}>{formatExpensePaymentMethod(claim.paymentMethod)}</div> : null}
                    {claim.paymentReference ? <div style={{ color: '#64748b', fontSize: 12 }}>{claim.paymentReference}</div> : null}
                    {claim.financeRemarks ? <div style={{ color: '#475569', fontSize: 12 }}>{claim.financeRemarks}</div> : null}
                    {claim.paymentBatchMonth ? <div style={{ color: '#64748b', fontSize: 12 }}>{t(lang, 'Batch', '批次')}: {claim.paymentBatchMonth}</div> : null}
                    {claim.archivedAt ? <div style={{ color: '#64748b', fontSize: 12 }}>{t(lang, 'Archived', '已归档')}</div> : null}
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div
                        style={{
                          maxWidth: 260,
                          display: 'grid',
                          gap: 4,
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid #dbeafe',
                          background: '#f8fbff',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>
                          {t(lang, 'Attachment note', '附件说明')}
                        </div>
                        <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {claim.description}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', maxWidth: 220, wordBreak: 'break-all' }}>
                        {claim.receiptOriginalName}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank" rel="noreferrer">{t(lang, 'View', '查看')}</a>
                        <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt?download=1`} target="_blank" rel="noreferrer">{t(lang, 'Download', '下载')}</a>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', gap: 8, minWidth: 220 }}>
                      {canApprove && claim.status === ExpenseClaimStatus.SUBMITTED ? (
                        <>
                          <form action={approveAction}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <input
                              type="hidden"
                              name="nextClaimId"
                              value={reviewQueue[reviewQueue.findIndex((item) => item.id === claim.id) + 1]?.id ?? ''}
                            />
                            <button type="submit">
                              {reviewQueue[reviewQueue.findIndex((item) => item.id === claim.id) + 1]?.id
                                ? t(lang, 'Approve & next', '批准并下一条')
                                : t(lang, 'Approve', '批准')}
                            </button>
                          </form>
                          <form action={rejectAction} style={{ display: 'grid', gap: 6 }}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <input
                              type="hidden"
                              name="nextClaimId"
                              value={reviewQueue[reviewQueue.findIndex((item) => item.id === claim.id) + 1]?.id ?? ''}
                            />
                            <select name="reason" defaultValue="">
                              <option value="">{t(lang, 'Select reject reason', '选择驳回原因')}</option>
                              {REJECT_REASON_OPTIONS.map((option) => (
                                <option key={option.value} value={`${option.value} / ${option.zh}`}>{option.value} / {option.zh}</option>
                              ))}
                            </select>
                            <button type="submit">
                              {reviewQueue[reviewQueue.findIndex((item) => item.id === claim.id) + 1]?.id
                                ? t(lang, 'Reject & next', '驳回并下一条')
                                : t(lang, 'Reject', '驳回')}
                            </button>
                          </form>
                        </>
                      ) : null}
                      {canFinance && claim.status === ExpenseClaimStatus.APPROVED ? (
                        <form action={markPaidAction} style={{ display: 'grid', gap: 6 }}>
                          <input type="hidden" name="claimId" value={claim.id} />
                          <select name="paymentMethod" defaultValue="BANK_TRANSFER">
                            {EXPENSE_PAYMENT_METHODS.map((method) => (
                              <option key={method} value={method}>{formatExpensePaymentMethod(method)}</option>
                            ))}
                          </select>
                          <input name="paymentReference" placeholder={t(lang, 'Payment reference', '付款参考号')} />
                          <input type="month" name="paymentBatchMonth" defaultValue={formatMonthKey(new Date())} />
                          <input name="financeRemarks" placeholder={t(lang, 'Finance remarks', '财务备注')} />
                          <button type="submit">{t(lang, 'Mark Paid', '标记已付款')}</button>
                        </form>
                      ) : null}
                      {claim.status === ExpenseClaimStatus.PAID && !claim.archivedAt ? (
                        <form action={archiveAction}>
                          <input type="hidden" name="claimId" value={claim.id} />
                          <button type="submit">{t(lang, 'Archive', '归档')}</button>
                        </form>
                      ) : null}
                      {!canApprove && !canFinance && isManager ? <div style={{ color: '#64748b' }}>{t(lang, 'Read only', '只读')}</div> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </details>

      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#475569' }}>
          {t(lang, 'Submit a claim for myself', '为自己提交报销')}
        </summary>
        <div style={{ marginTop: 12 }}>
          <ExpenseClaimForm lang={lang} action="/api/admin/expense-claims" submitLabel={t(lang, 'Submit expense claim', '提交报销单')} />
        </div>
      </details>
    </div>
  );
}
