import { isManagerUser, requireAdmin } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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
import { BUSINESS_UPLOAD_PREFIX, storedBusinessFileExists } from '@/lib/business-file-storage';
import RememberedWorkbenchQueryClient from '../_components/RememberedWorkbenchQueryClient';
import WorkbenchActionBanner from '../_components/WorkbenchActionBanner';
import WorkbenchFormSection from '../_components/WorkbenchFormSection';
import WorkbenchScrollMemoryClient from '../_components/WorkbenchScrollMemoryClient';
import WorkbenchSplitView from '../_components/WorkbenchSplitView';
import WorkbenchStatusChip from '../_components/WorkbenchStatusChip';
import WorkflowSourceBanner from '../_components/WorkflowSourceBanner';
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
  workbenchStickyPanelStyle,
} from '../_components/workbenchStyles';

const EXPENSE_FILTER_COOKIE = 'adminExpenseClaimsPreferredFilters';

const primaryButtonStyle = {
  background: '#2563eb',
  color: '#fff',
  border: '1px solid #1d4ed8',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
} as const;

const secondaryButtonStyle = {
  background: '#fff',
  color: '#1d4ed8',
  border: '1px solid #bfdbfe',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
} as const;

const dangerButtonStyle = {
  background: '#b91c1c',
  color: '#fff',
  border: '1px solid #991b1b',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
} as const;

function expenseSummaryCardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: 'grid',
    gap: 6,
    alignContent: 'start',
  } as const;
}

function expenseSectionLinkStyle(background: string, border: string) {
  return {
    display: 'grid',
    gap: 4,
    minWidth: 170,
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  } as const;
}

function renderExpenseSectionAnchor(href: string, label: string, detail: string, background: string, border: string) {
  const style = expenseSectionLinkStyle(background, border);
  return href.startsWith('#') ? (
    <a key={label} href={href} style={style}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.45 }}>{detail}</div>
    </a>
  ) : (
    <Link key={label} href={href} scroll={false} style={style}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.45 }}>{detail}</div>
    </Link>
  );
}

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
      return t(lang, 'Approval action needed', '等待审批处理');
    case ExpenseClaimStatus.APPROVED:
      return t(lang, 'Finance payment needed', '等待财务付款');
    case ExpenseClaimStatus.REJECTED:
      return t(lang, 'Submitter update needed', '等待提交人补充');
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

function buildExpenseClaimsHref(input: Record<string, string | null | undefined>) {
  const query = buildFilterQuery(input);
  return query ? `/admin/expense-claims?${query}` : '/admin/expense-claims';
}

function buildFinanceGroupKey(submitterUserId: string, currencyCode: string) {
  return `${submitterUserId}::${currencyCode}`;
}

function focusFinanceGroupHref(baseQuery: string, financeGroup: string) {
  const params = new URLSearchParams(baseQuery);
  params.set('approvedUnpaidOnly', '1');
  params.set('financeGroup', financeGroup);
  return `/admin/expense-claims?${params.toString()}`;
}

function withExpenseRepairReturn(
  input: Record<string, string | null | undefined>,
  repairReturnMode: 'review' | 'finance' | '',
  repairReturnClaimId: string,
  repairReturnFinanceGroup: string,
) {
  return {
    ...input,
    repairReturnMode,
    repairReturnClaimId,
    repairReturnFinanceGroup,
  };
}

function normalizeExpenseStatus(value: string) {
  return value && Object.values(ExpenseClaimStatus).includes(value as ExpenseClaimStatus)
    ? (value as ExpenseClaimStatus)
    : 'ALL';
}

function parseRememberedExpenseFilters(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const status = normalizeExpenseStatus(String(params.get('status') ?? '').trim());
  const monthRaw = String(params.get('month') ?? '').trim();
  const paymentBatchMonthRaw = String(params.get('paymentBatchMonth') ?? '').trim();
  const month = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : '';
  const paymentBatchMonth = /^\d{4}-\d{2}$/.test(paymentBatchMonthRaw) ? paymentBatchMonthRaw : '';
  const expenseType = String(params.get('expenseType') ?? '').trim();
  const currency = String(params.get('currency') ?? '').trim().toUpperCase();
  const q = String(params.get('q') ?? '').trim();
  const approvedUnpaidOnly = params.get('approvedUnpaidOnly') === '1';
  const archived = params.get('archived') === '1';
  const attachmentIssueOnly = params.get('attachmentIssueOnly') === '1';
  return {
    status,
    month,
    paymentBatchMonth,
    expenseType,
    currency,
    q,
    approvedUnpaidOnly,
    archived,
    attachmentIssueOnly,
    value: buildFilterQuery({
      status: status !== 'ALL' ? status : '',
      month,
      paymentBatchMonth,
      expenseType,
      currency,
      q,
      approvedUnpaidOnly: approvedUnpaidOnly ? '1' : '',
      archived: archived ? '1' : '',
      attachmentIssueOnly: attachmentIssueOnly ? '1' : '',
    }),
  };
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
  const clearFilters = typeof params.clearFilters === 'string' ? params.clearFilters === '1' : false;
  const hasStatusParam = typeof params.status === 'string';
  const hasMonthParam = typeof params.month === 'string';
  const hasPaymentBatchMonthParam = typeof params.paymentBatchMonth === 'string';
  const hasExpenseTypeParam = typeof params.expenseType === 'string';
  const hasCurrencyParam = typeof params.currency === 'string';
  const hasSubmitterQueryParam = typeof params.q === 'string';
  const hasApprovedUnpaidOnlyParam = typeof params.approvedUnpaidOnly === 'string';
  const hasArchivedOnlyParam = typeof params.archived === 'string';
  const hasAttachmentIssueOnlyParam = typeof params.attachmentIssueOnly === 'string';
  const statusParam = hasStatusParam ? String(params.status ?? '') : '';
  const monthParam = hasMonthParam ? String(params.month ?? '') : '';
  const paymentBatchMonthParam = hasPaymentBatchMonthParam ? String(params.paymentBatchMonth ?? '') : '';
  const expenseTypeParam = hasExpenseTypeParam ? String(params.expenseType ?? '') : '';
  const currencyParam = hasCurrencyParam ? String(params.currency ?? '') : '';
  const submitterQueryParam = hasSubmitterQueryParam ? String(params.q ?? '') : '';
  const selectedClaimIdParam = typeof params.claimId === 'string' ? params.claimId : '';
  const selectedFinanceGroupKeyParam = typeof params.financeGroup === 'string' ? params.financeGroup : '';
  const source = typeof params.source === 'string' ? String(params.source).trim().toLowerCase() : '';
  const sourceFocusRaw = typeof params.sourceFocus === 'string' ? String(params.sourceFocus).trim().toLowerCase() : '';
  const sourceWorkflow = source === 'approvals' ? 'approvals' : '';
  const sourceFocus =
    sourceFocusRaw === 'manager' ||
    sourceFocusRaw === 'finance' ||
    sourceFocusRaw === 'expense' ||
    sourceFocusRaw === 'overdue' ||
    sourceFocusRaw === 'all'
      ? sourceFocusRaw
      : '';
  const repairReturnMode =
    typeof params.repairReturnMode === 'string' && (params.repairReturnMode === 'review' || params.repairReturnMode === 'finance')
      ? params.repairReturnMode
      : '';
  const repairReturnClaimId = typeof params.repairReturnClaimId === 'string' ? params.repairReturnClaimId : '';
  const repairReturnFinanceGroup = typeof params.repairReturnFinanceGroup === 'string' ? params.repairReturnFinanceGroup : '';
  const repairReturnConfirmed = typeof params.repairReturn === 'string' ? params.repairReturn === '1' : false;
  const approvedUnpaidOnlyParam = hasApprovedUnpaidOnlyParam ? params.approvedUnpaidOnly === '1' : false;
  const archivedOnlyParam = hasArchivedOnlyParam ? params.archived === '1' : false;
  const attachmentIssueOnlyParam = hasAttachmentIssueOnlyParam ? params.attachmentIssueOnly === '1' : false;
  const canResumeRememberedFilters =
    !clearFilters &&
    !hasStatusParam &&
    !hasMonthParam &&
    !hasPaymentBatchMonthParam &&
    !hasExpenseTypeParam &&
    !hasCurrencyParam &&
    !hasSubmitterQueryParam &&
    !hasApprovedUnpaidOnlyParam &&
    !hasArchivedOnlyParam &&
    !hasAttachmentIssueOnlyParam &&
    !selectedClaimIdParam &&
    !selectedFinanceGroupKeyParam &&
    !repairReturnMode &&
    !repairReturnClaimId &&
    !repairReturnFinanceGroup &&
    !sourceWorkflow &&
    !sourceFocus &&
    !msg &&
    !err;
  const cookieStore = await cookies();
  const rememberedFilters = canResumeRememberedFilters
    ? parseRememberedExpenseFilters(cookieStore.get(EXPENSE_FILTER_COOKIE)?.value ?? '')
    : {
        status: 'ALL' as const,
        month: '',
        paymentBatchMonth: '',
        expenseType: '',
        currency: '',
        q: '',
        approvedUnpaidOnly: false,
        archived: false,
        attachmentIssueOnly: false,
        value: '',
      };
  const statusFilter = hasStatusParam ? normalizeExpenseStatus(statusParam) : rememberedFilters.status;
  const monthFilter = hasMonthParam ? monthParam : rememberedFilters.month;
  const paymentBatchMonthFilter = hasPaymentBatchMonthParam ? paymentBatchMonthParam : rememberedFilters.paymentBatchMonth;
  const expenseTypeFilter = hasExpenseTypeParam ? expenseTypeParam : rememberedFilters.expenseType;
  const currencyFilter = hasCurrencyParam ? currencyParam : rememberedFilters.currency;
  const submitterQuery = hasSubmitterQueryParam ? submitterQueryParam : rememberedFilters.q;
  const approvedUnpaidOnly = hasApprovedUnpaidOnlyParam ? approvedUnpaidOnlyParam : rememberedFilters.approvedUnpaidOnly;
  const archivedOnly = hasArchivedOnlyParam ? archivedOnlyParam : rememberedFilters.archived;
  const attachmentIssueOnly = hasAttachmentIssueOnlyParam ? attachmentIssueOnlyParam : rememberedFilters.attachmentIssueOnly;
  const resumedRememberedFilters =
    canResumeRememberedFilters && Boolean(rememberedFilters.value);
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
    attachmentIssueOnly: attachmentIssueOnly ? '1' : '',
  });
  const workflowQuery = buildFilterQuery({
    ...Object.fromEntries(new URLSearchParams(filterQuery)),
    source: sourceWorkflow,
    sourceFocus,
  });
  const approvalInboxReturnHref =
    sourceWorkflow === 'approvals'
      ? sourceFocus && sourceFocus !== 'all'
        ? `/admin/approvals?focus=${encodeURIComponent(sourceFocus)}`
        : '/admin/approvals'
      : '';
  const approvalInboxFocusLabel =
    sourceFocus === 'manager'
      ? t(lang, 'Manager approvals', '管理审批')
      : sourceFocus === 'finance'
        ? t(lang, 'Finance approvals', '财务审批')
        : sourceFocus === 'expense'
          ? t(lang, 'Expense approvals', '报销审批')
          : sourceFocus === 'overdue'
            ? t(lang, 'Overdue approvals', '超时审批')
            : t(lang, 'All open approvals', '全部待处理审批');
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
    attachmentIssueOnly: attachmentIssueOnly ? '1' : '',
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
    attachmentIssueOnly: attachmentIssueOnly ? '1' : '',
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
    attachmentIssueOnly: '',
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
    attachmentIssueOnly: '',
  })}`;
  const quickAttachmentIssueHref = `/admin/expense-claims?${buildFilterQuery({
    status: '',
    month: '',
    paymentBatchMonth: '',
    expenseType: '',
    currency: '',
    q: '',
    approvedUnpaidOnly: '',
    archived: '',
    attachmentIssueOnly: '1',
  })}`;
  const attachmentHealthDeskHref = "/admin/recovery/uploads?source=expense";
  const quickClearHref = '/admin/expense-claims?clearFilters=1';
  const hasAdvancedFilters =
    statusFilter !== 'ALL' ||
    Boolean(monthFilter) ||
    Boolean(paymentBatchMonthFilter) ||
    Boolean(expenseTypeFilter) ||
    Boolean(currencyFilter) ||
    Boolean(submitterQuery) ||
    approvedUnpaidOnly ||
    archivedOnly ||
    attachmentIssueOnly;

  async function approveAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Not allowed' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const nextClaimId = String(formData.get('nextClaimId') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Missing claim id' })}`);
    await approveExpenseClaim({ claimId, approver: actor });
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), claimId: nextClaimId, msg: nextClaimId ? 'Expense claim approved. Moved to next claim.' : 'Expense claim approved' })}`);
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Not allowed' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const nextClaimId = String(formData.get('nextClaimId') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();
    if (!claimId || !reason) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Reject reason is required' })}`);
    await rejectExpenseClaim({ claimId, reason, approver: actor });
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), claimId: nextClaimId, msg: nextClaimId ? 'Expense claim rejected. Moved to next claim.' : 'Expense claim rejected' })}`);
  }

  async function markPaidAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canFinanceOperateExpense(actor)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Only finance can mark paid' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const nextClaimId = String(formData.get('nextClaimId') ?? '').trim();
    const paymentBatchMonth = String(formData.get('paymentBatchMonth') ?? '').trim();
    const financeRemarks = String(formData.get('financeRemarks') ?? '').trim();
    const paymentMethod = String(formData.get('paymentMethod') ?? '').trim();
    const paymentReference = String(formData.get('paymentReference') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Missing claim id' })}`);
    await markExpenseClaimPaid({
      claimId,
      paymentBatchMonth: paymentBatchMonth || null,
      financeRemarks: financeRemarks || null,
      paymentMethod,
      paymentReference: paymentReference || null,
      paidBy: actor,
    });
    redirect(`/admin/expense-claims?${buildFilterQuery({
      ...Object.fromEntries(new URLSearchParams(workflowQuery)),
      approvedUnpaidOnly: '1',
      claimId: nextClaimId,
      msg: nextClaimId ? 'Expense claim marked paid. Moved to next payout item.' : 'Expense claim marked paid',
    })}`);
  }

  async function markPaidBatchAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canFinanceOperateExpense(actor)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Only finance can mark paid' })}`);
    }
    const claimIds = formData.getAll('claimIds').map((value) => String(value ?? '').trim()).filter(Boolean);
    const financeGroup = String(formData.get('financeGroup') ?? '').trim();
    const paymentBatchMonth = String(formData.get('paymentBatchMonth') ?? '').trim();
    const financeRemarks = String(formData.get('financeRemarks') ?? '').trim();
    const paymentMethod = String(formData.get('paymentMethod') ?? '').trim();
    const paymentReference = String(formData.get('paymentReference') ?? '').trim();
    if (!claimIds.length) {
      redirect(`/admin/expense-claims?${buildFilterQuery({
        ...Object.fromEntries(new URLSearchParams(workflowQuery)),
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
      ...Object.fromEntries(new URLSearchParams(workflowQuery)),
      approvedUnpaidOnly: '1',
      financeGroup,
      msg: `${claimIds.length} expense claim(s) marked paid`,
    })}`);
  }

  async function saveApprovalConfigAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canEditExpenseApprovalConfig(actor.email)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Not allowed to edit expense approver config' })}`);
    }
    const approverEmailsRaw = String(formData.get('approverEmails') ?? '');
    await saveExpenseApprovalConfig({ approverEmailsRaw });
    revalidatePath('/admin/expense-claims');
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), msg: 'Expense approver config updated' })}`);
  }

  async function archiveAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    const claimId = String(formData.get('claimId') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), err: 'Missing claim id' })}`);
    await archiveExpenseClaim({ claimId, actor });
    revalidatePath('/admin/expense-claims');
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(workflowQuery)), msg: 'Expense claim archived' })}`);
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
  const claimsWithAttachmentState = await Promise.all(
    claims.map(async (claim) => ({
      ...claim,
      attachmentExists: await storedBusinessFileExists(claim.receiptPath, BUSINESS_UPLOAD_PREFIX.expenseClaims),
    })),
  );
  const visibleClaims = attachmentIssueOnly
    ? claimsWithAttachmentState.filter((claim) => !claim.attachmentExists)
    : claimsWithAttachmentState;
  const summary = summarizeExpenseClaims(visibleClaims);
  const reminders = await getExpenseClaimReminderQueues();
  const exportHref = `/api/exports/expense-claims${filterQuery ? `?${filterQuery}` : ''}`;
  const reviewQueue = visibleClaims.filter((claim) => claim.status === ExpenseClaimStatus.SUBMITTED);
  const selectedReviewClaim = reviewQueue.find((claim) => claim.id === selectedClaimIdParam) ?? reviewQueue[0] ?? null;
  const selectedReviewIndex = selectedReviewClaim ? reviewQueue.findIndex((claim) => claim.id === selectedReviewClaim.id) : -1;
  const previousReviewClaimId = selectedReviewIndex > 0 ? reviewQueue[selectedReviewIndex - 1]?.id ?? '' : '';
  const nextReviewClaimId = selectedReviewIndex >= 0 && selectedReviewIndex + 1 < reviewQueue.length ? reviewQueue[selectedReviewIndex + 1]?.id ?? '' : '';
  const financeQueue = visibleClaims.filter((claim) => claim.status === ExpenseClaimStatus.APPROVED);
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
  const previousFinanceGroupKey = selectedFinanceGroupIndex > 0 ? financeGroups[selectedFinanceGroupIndex - 1]?.key ?? '' : '';
  const nextFinanceGroupKey =
    selectedFinanceGroupIndex >= 0 && selectedFinanceGroupIndex + 1 < financeGroups.length
      ? financeGroups[selectedFinanceGroupIndex + 1]?.key ?? ''
      : '';
  const activeFilterCount = [
    statusFilter !== 'ALL',
    Boolean(monthFilter),
    Boolean(paymentBatchMonthFilter),
    Boolean(expenseTypeFilter),
    Boolean(currencyFilter),
    Boolean(submitterQuery),
    approvedUnpaidOnly,
    archivedOnly,
    attachmentIssueOnly,
  ].filter(Boolean).length;
  const reminderCount = reminders.staleSubmitted.length + reminders.staleApprovedUnpaid.length;
  const attachmentIssueCount = visibleClaims.filter((claim) => !claim.attachmentExists).length;
  const reviewAttachmentIssueCount = reviewQueue.filter((claim) => !claim.attachmentExists).length;
  const financeAttachmentIssueCount = financeQueue.filter((claim) => !claim.attachmentExists).length;
  const selectedReviewAttachmentRepairHref = selectedReviewClaim
    ? buildExpenseClaimsHref({
        ...withExpenseRepairReturn(
          {
            status: '',
            month: '',
            paymentBatchMonth: '',
            expenseType: '',
            currency: selectedReviewClaim.currencyCode,
            q: selectedReviewClaim.submitterName,
            approvedUnpaidOnly: '',
            archived: '',
            attachmentIssueOnly: '1',
            claimId: selectedReviewClaim.id,
          },
          'review',
          selectedReviewClaim.id,
          '',
        ),
      })
    : quickAttachmentIssueHref;
  const selectedReviewSubmitterHistoryHref = selectedReviewClaim
    ? buildExpenseClaimsHref({
        ...withExpenseRepairReturn(
          {
            status: '',
            month: '',
            paymentBatchMonth: '',
            expenseType: '',
            currency: '',
            q: selectedReviewClaim.submitterName,
            approvedUnpaidOnly: '',
            archived: '',
            attachmentIssueOnly: '',
          },
          'review',
          selectedReviewClaim.id,
          '',
        ),
      })
    : quickClearHref;
  const selectedFinanceRepairHref = selectedFinanceGroup
    ? buildExpenseClaimsHref({
        ...withExpenseRepairReturn(
          {
            status: '',
            month: '',
            paymentBatchMonth: '',
            expenseType: '',
            currency: selectedFinanceGroup.currencyCode,
            q: selectedFinanceGroup.submitterName,
            approvedUnpaidOnly: '',
            archived: '',
            attachmentIssueOnly: '1',
            financeGroup: selectedFinanceGroup.key,
          },
          'finance',
          '',
          selectedFinanceGroup.key,
        ),
      })
    : quickAttachmentIssueHref;
  const selectedFinanceSubmitterHistoryHref = selectedFinanceGroup
    ? buildExpenseClaimsHref({
        ...withExpenseRepairReturn(
          {
            status: '',
            month: '',
            paymentBatchMonth: '',
            expenseType: '',
            currency: '',
            q: selectedFinanceGroup.submitterName,
            approvedUnpaidOnly: '',
            archived: '',
            attachmentIssueOnly: '',
          },
          'finance',
          '',
          selectedFinanceGroup.key,
        ),
      })
    : quickClearHref;
  const reviewRepairReturnHref = repairReturnClaimId
    ? buildExpenseClaimsHref({
        status: ExpenseClaimStatus.SUBMITTED,
        month: '',
        paymentBatchMonth: '',
        expenseType: '',
        currency: '',
        q: '',
        approvedUnpaidOnly: '',
        archived: '',
        attachmentIssueOnly: '',
        claimId: repairReturnClaimId,
        repairReturn: '1',
      })
    : '';
  const financeRepairReturnHref = repairReturnFinanceGroup
    ? buildExpenseClaimsHref({
        status: '',
        month: '',
        paymentBatchMonth: '',
        expenseType: '',
        currency: '',
        q: '',
        approvedUnpaidOnly: '1',
        archived: '',
        attachmentIssueOnly: '',
        financeGroup: repairReturnFinanceGroup,
        repairReturn: '1',
      })
    : '';
  const showRepairLoopCard =
    (repairReturnMode === 'review' && Boolean(reviewRepairReturnHref)) ||
    (repairReturnMode === 'finance' && Boolean(financeRepairReturnHref));
  const repairReturnResolved =
    repairReturnMode === 'review'
      ? repairReturnConfirmed && Boolean(selectedReviewClaim?.attachmentExists)
      : repairReturnMode === 'finance'
        ? repairReturnConfirmed && Boolean(selectedFinanceGroup) && !selectedFinanceGroup.claims.some((claim) => !claim.attachmentExists)
        : false;
  const reviewRepairNextStepHref = reviewRepairReturnHref ? `${reviewRepairReturnHref}#expense-review-actions` : '';
  const financeRepairNextStepHref = financeRepairReturnHref ? `${financeRepairReturnHref}#expense-payment-details` : '';
  const currentDatasetLabel = approvedUnpaidOnly
    ? t(lang, 'Approved but unpaid only', '仅看已批未付')
    : attachmentIssueOnly
      ? t(lang, 'Attachment issues only', '仅看附件异常')
    : archivedOnly
      ? t(lang, 'Archived claims only', '仅看已归档报销单')
      : statusFilter !== 'ALL'
        ? formatClaimStatusLabel(lang, statusFilter as ExpenseClaimStatus)
        : t(lang, 'All working states', '全部工作状态');
  const expenseFocusTitle = selectedReviewClaim
    ? t(lang, 'Review the selected submitted claim first', '先处理当前选中的待审批报销单')
    : selectedFinanceGroup
      ? t(lang, 'Finance payout group is ready for payment follow-up', '当前付款分组已就绪，可继续付款登记')
      : attachmentIssueOnly
        ? t(lang, 'Attachment blockers are the current focus', '当前应先清附件阻塞项')
        : approvedUnpaidOnly
          ? t(lang, 'Approved unpaid queue is the current focus', '当前应先清已批未付队列')
          : reviewQueue.length > 0
            ? t(lang, 'Submitted review queue is the current focus', '当前应先清待审批队列')
            : financeQueue.length > 0
              ? t(lang, 'Payout follow-up is the next useful stop', '下一步适合转去付款跟进')
              : t(lang, 'Expense desk is relatively clear', '报销工作台目前相对干净');
  const expenseFocusDetail = selectedReviewClaim
    ? t(lang, 'The review panel below already has the selected claim, attachments, and next action together.', '下方审批面板已经把当前报销单、附件和下一步动作放在一起。')
    : selectedFinanceGroup
      ? t(lang, 'The finance panel below is scoped to one submitter and one currency so payment details stay consistent.', '下方财务面板已经收拢到同一提交人和同一币种，付款信息更容易保持一致。')
      : attachmentIssueOnly
        ? t(lang, 'This dataset is narrowed to proof problems, so use repair shortcuts before returning to normal approval flow.', '当前数据集只看附件问题，建议先走修复入口，再回到正常审批流。')
        : reviewQueue.length > 0
          ? t(lang, 'There are still submitted claims waiting, so clear those before spending time in history or self-submission.', '还有待审批报销单时，优先清队列，再去看历史或自助提交。')
          : t(lang, 'When no urgent queue is waiting, use history and filters as the secondary workspace for follow-up.', '当没有紧急队列时，再把历史列表和筛选区作为次级工作区。');
  const expenseSummaryCards = [
    {
      title: t(lang, 'Current focus', '当前建议起点'),
      value: expenseFocusTitle,
      detail: expenseFocusDetail,
      background: selectedReviewClaim ? '#eff6ff' : selectedFinanceGroup ? '#fff7ed' : '#f8fafc',
      border: selectedReviewClaim ? '#bfdbfe' : selectedFinanceGroup ? '#fdba74' : '#dbe4f0',
    },
    {
      title: t(lang, 'Visible dataset', '当前可见数据集'),
      value: currentDatasetLabel,
      detail: t(lang, `${visibleClaims.length} visible claim(s) with ${activeFilterCount} active filter(s).`, `当前共有 ${visibleClaims.length} 条可见记录，生效筛选 ${activeFilterCount} 个。`),
      background: '#fffaf0',
      border: '#fde68a',
    },
    {
      title: t(lang, 'Main pressure points', '当前主要压力点'),
      value: t(lang, `${reviewQueue.length} review · ${financeQueue.length} payout groups`, `${reviewQueue.length} 条审批 · ${financeQueue.length} 个付款分组`),
      detail: t(lang, `${attachmentIssueCount} attachment issue(s) and ${reminderCount} follow-up reminder(s).`, `${attachmentIssueCount} 条附件异常，${reminderCount} 条跟进提醒。`),
      background: attachmentIssueCount > 0 ? '#fff7f7' : '#f0fdf4',
      border: attachmentIssueCount > 0 ? '#fecaca' : '#bbf7d0',
    },
  ];
  const expenseSectionLinks = [
    {
      href: '#expense-filters',
      label: t(lang, 'Quick filters', '快速筛选'),
      detail: t(lang, 'Switch the dataset before opening rows', '先切数据集，再进入具体条目'),
      background: '#ffffff',
      border: '#dbe4f0',
    },
    {
      href: '#expense-review-queue',
      label: t(lang, 'Review queue', '审批队列'),
      detail: t(lang, `${reviewQueue.length} waiting now`, `当前 ${reviewQueue.length} 条待审批`),
      background: selectedReviewClaim ? '#eff6ff' : '#ffffff',
      border: selectedReviewClaim ? '#bfdbfe' : '#dbe4f0',
    },
    {
      href: canFinance ? '#expense-finance-queue' : '#expense-history',
      label: canFinance ? t(lang, 'Finance queue', '财务队列') : t(lang, 'History list', '历史列表'),
      detail: canFinance
        ? t(lang, `${financeQueue.length} approved unpaid groups`, `${financeQueue.length} 个已批未付分组`)
        : t(lang, `${claims.length} visible rows`, `${claims.length} 条当前可见`),
      background: canFinance && selectedFinanceGroup ? '#fff7ed' : '#ffffff',
      border: canFinance && selectedFinanceGroup ? '#fdba74' : '#dbe4f0',
    },
    {
      href: '#expense-history',
      label: t(lang, 'History list', '历史列表'),
      detail: t(lang, `${claims.length} visible rows`, `${claims.length} 条当前可见`),
      background: '#ffffff',
      border: '#dbe4f0',
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <RememberedWorkbenchQueryClient
        cookieKey={EXPENSE_FILTER_COOKIE}
        storageKey="adminExpenseClaimsPreferredFilters"
        value={filterQuery}
      />
      <WorkbenchScrollMemoryClient storageKey="adminExpenseClaimsScroll" />
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
          <span style={{ padding: '4px 10px', borderRadius: 999, background: '#fff', border: '1px solid #e5e7eb', color: '#334155', fontSize: 12 }}>
            {t(lang, 'Attachment issues', '附件异常')}: <b>{attachmentIssueCount}</b>
          </span>
        </div>
      </section>

      {resumedRememberedFilters ? (
        <WorkbenchActionBanner
          tone="warn"
          title={t(lang, 'Resumed your last expense filter set.', '已恢复你上次的报销筛选。')}
          description={t(
            lang,
            'Use clear filters if you want to return to the default desk.',
            '如果要回到默认工作台，可直接清空筛选。'
          )}
          actions={[{ href: quickClearHref, label: t(lang, 'Back to default desk', '回到默认工作台') }]}
        />
      ) : null}

      {sourceWorkflow === 'approvals' ? (
        <WorkflowSourceBanner
          tone="indigo"
          title={t(lang, 'From Approval Inbox', '来自审批提醒中心')}
          description={t(
            lang,
            'You opened this expense workflow from the approval triage desk. Finish the current claim here, then jump back when you are ready for the next approval item.',
            '你是从审批分诊台进入这条报销流程的。先在这里处理当前报销单，处理完后再回审批中心拿下一条。'
          )}
          primaryHref={approvalInboxReturnHref || '/admin/approvals'}
          primaryLabel={t(lang, 'Back to Approval Inbox', '返回审批提醒中心')}
          meta={
            <span style={{ padding: '4px 10px', borderRadius: 999, background: '#fff', border: '1px solid #c7d2fe', color: '#4338ca', fontSize: 12, fontWeight: 700 }}>
              {t(lang, 'Inbox focus', '来源筛选')}: {approvalInboxFocusLabel}
            </span>
          }
        />
      ) : null}

      {msg ? (
        <WorkbenchActionBanner
          tone="success"
          title={t(lang, 'Action saved', '操作已完成')}
          description={msg}
          actions={[
            selectedReviewClaim
              ? { href: '#expense-review-actions', label: t(lang, 'Jump to review actions', '跳到审批操作') }
              : selectedFinanceGroup
                ? { href: '#expense-payment-details', label: t(lang, 'Jump to payment details', '跳到付款信息') }
                : { href: quickSubmittedHref, label: t(lang, 'Open submitted review queue', '打开待审批队列') },
          ]}
        />
      ) : null}
      {err ? (
        <WorkbenchActionBanner
          tone="error"
          title={t(lang, 'Action blocked', '操作未完成')}
          description={err}
          actions={[{ href: quickClearHref, label: t(lang, 'Back to default desk', '回到默认工作台') }]}
        />
      ) : null}
      {showRepairLoopCard ? (
        <WorkbenchActionBanner
          tone={repairReturnResolved ? 'success' : 'info'}
          title={
            repairReturnMode === 'review'
              ? repairReturnResolved
                ? t(lang, 'Repair loop complete. Resume this review item.', '修复回流已完成，回到当前审核项继续处理。')
                : t(lang, 'Repair loop: come back to this review item', '修复回流：处理完后回到这条审核项')
              : repairReturnResolved
                ? t(lang, 'Repair loop complete. Resume this payout group.', '修复回流已完成，回到当前付款分组继续处理。')
                : t(lang, 'Repair loop: come back to this payout group', '修复回流：处理完后回到这个付款分组')
          }
          description={
            repairReturnMode === 'review'
              ? repairReturnResolved
                ? t(lang, 'The attachment is available again, so the selected claim can continue through approval below.', '附件已恢复可用，所以下方这条报销单可以继续走审批。')
                : t(lang, 'Use the links below for history or attachment cleanup, then return directly to the same selected claim instead of searching for it again.', '你可以先去附件异常或历史视图处理，再直接回到同一条报销单，不用重新搜索。')
              : repairReturnResolved
                ? t(lang, 'The selected payout group no longer shows missing attachments, so finance can focus on payment details again.', '当前付款分组已经没有附件缺失，财务可以重新聚焦付款登记。')
                : t(lang, 'Use the links below for attachment cleanup or history, then return directly to the same payout group instead of rebuilding the queue context.', '你可以先去附件异常或历史视图处理，再直接回到同一个付款分组，不用重新找上下文。')
          }
          actions={[
            repairReturnMode === 'review' && reviewRepairReturnHref
              ? { href: reviewRepairReturnHref, label: t(lang, 'Back to selected claim', '返回当前报销单'), emphasis: 'primary' as const }
              : null,
            repairReturnMode === 'finance' && financeRepairReturnHref
              ? { href: financeRepairReturnHref, label: t(lang, 'Back to selected payout group', '返回当前付款分组'), emphasis: 'primary' as const }
              : null,
            repairReturnResolved && repairReturnMode === 'review' && reviewRepairNextStepHref
              ? { href: reviewRepairNextStepHref, label: t(lang, 'Jump to review actions', '跳到审批操作') }
              : null,
            repairReturnResolved && repairReturnMode === 'finance' && financeRepairNextStepHref
              ? { href: financeRepairNextStepHref, label: t(lang, 'Jump to payment details', '跳到付款信息') }
              : null,
            { href: quickAttachmentIssueHref, label: t(lang, 'Open all attachment issues', '查看全部附件异常') },
            { href: attachmentHealthDeskHref, label: t(lang, 'Open attachment health desk', '打开附件异常总览') },
          ]}
        />
      ) : null}

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {expenseSummaryCards.map((card) => (
          <div key={card.title} style={expenseSummaryCardStyle(card.background, card.border)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{card.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{card.value}</div>
            <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.45 }}>{card.detail}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          ...workbenchStickyPanelStyle(),
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ fontWeight: 800, color: '#0f172a' }}>{t(lang, 'Expense work map', '报销工作地图')}</div>
            <div style={{ color: '#475569', fontSize: 13 }}>
              {t(lang, 'Use this strip to confirm where you are, then jump to the right queue or history section without rescanning the full page.', '先用这条工作地图确认当前位置，再直接跳到正确队列或历史区，不用重新扫整页。')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href={quickClearHref} scroll={false}>{t(lang, 'Default desk', '默认工作台')}</Link>
            {selectedReviewClaim ? <a href="#expense-review-actions">{t(lang, 'Review actions', '审批操作')}</a> : null}
            {selectedFinanceGroup ? <a href="#expense-payment-details">{t(lang, 'Payment details', '付款信息')}</a> : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {expenseSectionLinks.map((link) => renderExpenseSectionAnchor(link.href, link.label, link.detail, link.background, link.border))}
        </div>
      </section>

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
        <div style={{ ...workbenchMetricCardStyle('rose'), background: '#fff7f7' }}>
          <div style={workbenchMetricLabelStyle('rose')}>{t(lang, 'Attachment issues', '附件异常')}</div>
          <div style={workbenchMetricValueStyle('rose')}>{attachmentIssueCount}</div>
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

      <section id="expense-filters" style={{ ...workbenchFilterPanelStyle, padding: 16, display: 'grid', gap: 12, background: '#f8fafc', scrollMarginTop: 104 }}>
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
          <Link href={quickSubmittedHref} scroll={false}>{t(lang, 'Submitted review queue', '待审批队列')}</Link>
          <a href={quickApprovedUnpaidHref}>{t(lang, 'Approved but unpaid', '已批未付')}</a>
          <a href={quickAttachmentIssueHref}>{t(lang, 'Attachment issues', '附件异常')}</a>
          <a href={attachmentHealthDeskHref}>{t(lang, 'Attachment health desk', '附件异常总览')}</a>
          <a href={quickExpenseThisMonthHref}>{t(lang, 'This month expenses', '本月消费')}</a>
          <a href={quickExpenseLastMonthHref}>{t(lang, 'Last month expenses', '上月消费')}</a>
          <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
        </div>
      </section>

      <section id="expense-review-queue" style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: 16, display: 'grid', gap: 16, background: '#f8fbff', scrollMarginTop: 104 }}>
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

        <WorkbenchSplitView
          id="expense-review"
          left={
            <section style={{ border: '1px solid #bfdbfe', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #dbeafe', fontWeight: 700 }}>
              {t(lang, 'Submitted queue', '待审批队列')}
            </div>
            {reviewQueue.length ? (
              <div style={{ display: 'grid' }}>
                {reviewQueue.map((claim) => {
                  const isSelected = claim.id === selectedReviewClaim?.id;
                  return (
                    <Link
                      key={claim.id}
                      href={focusClaimHref(workflowQuery, claim.id)}
                      scroll={false}
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
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#475569', fontSize: 12 }}>
                        <span>{formatUTCDateOnly(claim.expenseDate)}</span>
                        <span>·</span>
                        <span>{getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode}</span>
                        {claim.studentName ? (
                          <>
                            <span>·</span>
                            <span>{t(lang, 'Student', '学生')}: {claim.studentName}</span>
                          </>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: 16, color: '#64748b', display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700, color: '#334155' }}>{t(lang, 'No submitted claims match the current filters', '当前筛选下没有待审批报销单')}</div>
                <div>{t(lang, 'Try clearing the filters, checking another expense month, or opening the history list instead.', '可以尝试清空筛选、切换其他消费月份，或改看历史列表。')}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
                  <a href={buildExpenseClaimsHref({ archived: '1' })}>{t(lang, 'Open history view', '打开历史视图')}</a>
                </div>
                </div>
              )}
            </section>
          }
          right={
            <section
              style={{
                border: '1px solid #bfdbfe',
                borderRadius: 12,
                background: '#fff',
                padding: 16,
                display: 'grid',
                gap: 12,
              }}
            >
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
                    {reviewAttachmentIssueCount ? ` · ${t(lang, 'Attachment issues', '附件异常')}: ${reviewAttachmentIssueCount}` : ''}
                  </div>
                ) : null}
              </div>

            {selectedReviewClaim ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #dbeafe',
                    background: '#f8fbff',
                  }}
                >
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {selectedReviewClaim.claimRefNo} · {selectedReviewClaim.submitterName}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      {t(lang, 'Queue position', '队列位置')}: <b>{selectedReviewIndex + 1} / {reviewQueue.length}</b>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {previousReviewClaimId ? (
                      <Link href={focusClaimHref(workflowQuery, previousReviewClaimId)} scroll={false}>{t(lang, 'Open previous', '打开上一条')}</Link>
                    ) : null}
                    {nextReviewClaimId ? (
                      <Link href={focusClaimHref(workflowQuery, nextReviewClaimId)} scroll={false}>{t(lang, 'Open next', '打开下一条')}</Link>
                    ) : null}
                    <Link href={quickSubmittedHref} scroll={false}>{t(lang, 'Back to review queue', '返回待审批队列')}</Link>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedReviewClaim.claimRefNo}</div>
                  <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div><strong>{t(lang, 'Submitter', '提交人')}:</strong> {selectedReviewClaim.submitterName}</div>
                    <div><strong>{t(lang, 'Date', '日期')}:</strong> {formatUTCDateOnly(selectedReviewClaim.expenseDate)}</div>
                    <div><strong>{t(lang, 'Type', '类型')}:</strong> {getExpenseTypeOption(selectedReviewClaim.expenseTypeCode)?.label ?? selectedReviewClaim.expenseTypeCode}</div>
                    <div><strong>{t(lang, 'Amount', '金额')}:</strong> {formatExpenseMoney(selectedReviewClaim.amountCents + (selectedReviewClaim.gstAmountCents ?? 0), selectedReviewClaim.currencyCode)}</div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>{t(lang, 'Status', '状态')}:</strong>
                      <WorkbenchStatusChip
                        label={formatClaimStatusLabel(lang, selectedReviewClaim.status)}
                        tone={selectedReviewClaim.status === ExpenseClaimStatus.REJECTED ? 'error' : selectedReviewClaim.status === ExpenseClaimStatus.APPROVED ? 'warn' : selectedReviewClaim.status === ExpenseClaimStatus.PAID ? 'success' : 'info'}
                      />
                    </div>
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
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: `1px solid ${selectedReviewClaim.attachmentExists ? '#bbf7d0' : '#fecaca'}`,
                      background: selectedReviewClaim.attachmentExists ? '#f0fdf4' : '#fff7f7',
                      color: selectedReviewClaim.attachmentExists ? '#166534' : '#b91c1c',
                      fontSize: 13,
                    }}
                  >
                    {selectedReviewClaim.attachmentExists
                      ? t(lang, 'Attachment health: file is available for review.', '附件状态：文件可正常查看。')
                      : t(lang, 'Attachment health: file is missing on the server. Reject or request replacement before approving.', '附件状态：服务器上缺少文件。请先驳回或要求补传，再继续审批。')}
                  </div>
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

                {!selectedReviewClaim.attachmentExists ? (
                  <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 12, border: '1px solid #fecaca', background: '#fff7f7' }}>
                    <div style={{ fontWeight: 700, color: '#b91c1c' }}>{t(lang, 'Attachment repair path', '附件修复路径')}</div>
                    <div style={{ color: '#7f1d1d', fontSize: 14 }}>
                      {t(
                        lang,
                        'This claim cannot move forward until the file is replaced or the submitter resubmits. Start from one of the shortcuts below instead of searching manually.',
                        '这条报销单在文件补回或提交人重提之前不能继续。请直接使用下方快捷入口，不用手动再找。'
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <a href={selectedReviewAttachmentRepairHref}>{t(lang, 'Open this submitter attachment issues', '查看该提交人的附件异常')}</a>
                      <a href={selectedReviewSubmitterHistoryHref}>{t(lang, 'Open submitter history', '查看提交人历史')}</a>
                      <a href={quickAttachmentIssueHref}>{t(lang, 'Open all attachment issues', '查看全部附件异常')}</a>
                      <a href={attachmentHealthDeskHref}>{t(lang, 'Open attachment health desk', '打开附件异常总览')}</a>
                    </div>
                    {canApprove ? (
                      <form action={rejectAction} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="hidden" name="claimId" value={selectedReviewClaim.id} />
                        <input type="hidden" name="nextClaimId" value={nextReviewClaimId} />
                        <input type="hidden" name="reason" value="Missing attachment / 缺少附件" />
                        <button type="submit" style={dangerButtonStyle}>
                          {nextReviewClaimId ? t(lang, 'Reject missing attachment & next', '按缺少附件驳回并下一条') : t(lang, 'Reject as missing attachment', '按缺少附件驳回')}
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {canApprove ? (
                  <WorkbenchFormSection
                    title={t(lang, 'Quick review flow', '快速审批流')}
                    description={
                      nextReviewClaimId
                        ? t(lang, 'Approve or reject this claim and the panel will move to the next submitted item.', '批准或驳回后，面板会自动切到下一条待审批记录。')
                        : t(lang, 'This is the last submitted claim in the current queue.', '这是当前待审批队列中的最后一条。')
                    }
                    helper={nextReviewClaimId ? t(lang, 'Auto-jumps to the next row after save', '保存后会自动跳到下一条') : t(lang, 'Last row in current queue', '当前队列最后一条')}
                    tone="info"
                    style={{ scrollMarginTop: 104 }}
                  >
                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(180px, 220px) minmax(220px, 1fr)' }}>
                      <form action={approveAction}>
                        <input type="hidden" name="claimId" value={selectedReviewClaim.id} />
                        <input type="hidden" name="nextClaimId" value={nextReviewClaimId} />
                        <button type="submit" style={{ ...primaryButtonStyle, width: '100%' }}>
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
                        <button type="submit" style={dangerButtonStyle}>
                          {nextReviewClaimId ? t(lang, 'Reject & next', '驳回并下一条') : t(lang, 'Reject', '驳回')}
                        </button>
                      </form>
                    </div>
                  </WorkbenchFormSection>
                ) : (
                  <div style={{ color: '#64748b' }}>{t(lang, 'Read only', '只读')}</div>
                )}
              </>
            ) : (
              <div style={{ padding: '12px 0', color: '#64748b', display: 'grid', gap: 8, alignSelf: 'start' }}>
                <div style={{ fontWeight: 700, color: '#334155' }}>{t(lang, 'No submitted claim is selected', '当前没有选中的待审批报销单')}</div>
                <div>{t(lang, 'Choose one item from the left review queue. If the queue is empty, clear filters or move to history.', '请先从左侧待审批队列选择一条；如果队列为空，可清空筛选或切换到历史列表。')}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
                  <a href={buildExpenseClaimsHref({ archived: '1' })}>{t(lang, 'Open history view', '打开历史视图')}</a>
                </div>
              </div>
            )}
            </section>
          }
        />
      </section>

      {canFinance ? (
        <section id="expense-finance-queue" style={{ border: '1px solid #fde68a', borderRadius: 12, padding: 16, display: 'grid', gap: 16, background: '#fffbeb', scrollMarginTop: 104 }}>
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

          <WorkbenchSplitView
            id="expense-finance"
            left={
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
                          ...Object.fromEntries(new URLSearchParams(workflowQuery)),
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
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#475569', fontSize: 12 }}>
                          <span>{group.claims.length} {t(lang, 'claims', '条报销单')}</span>
                          <span>·</span>
                          <span>{financeTypeLabel}</span>
                          <span>·</span>
                          <span>{group.currencyCode}</span>
                          <span>·</span>
                          <span>{firstClaim.approverEmail || t(lang, 'Approved', '已批准')}</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 16, color: '#64748b', display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>{t(lang, 'No approved unpaid groups match the current filters', '当前筛选下没有已批未付分组')}</div>
                  <div>{t(lang, 'Try clearing filters, opening another batch month, or switching back to the submitted review queue.', '可以尝试清空筛选、切换其他付款批次月份，或回到待审批队列。')}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
                    <Link href={quickSubmittedHref} scroll={false}>{t(lang, 'Open submitted review queue', '打开待审批队列')}</Link>
                  </div>
                </div>
              )}
              </section>
            }
            right={
              <section
                style={{
                  border: '1px solid #fcd34d',
                  borderRadius: 12,
                  background: '#fff',
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
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
                    {financeAttachmentIssueCount ? ` · ${t(lang, 'Attachment issues', '附件异常')}: ${financeAttachmentIssueCount}` : ''}
                </div>
              ) : null}
              </div>

              {selectedFinanceGroup ? (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #fde68a',
                      background: '#fffdf5',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {selectedFinanceGroup.submitterName} · {selectedFinanceGroup.currencyCode}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        {t(lang, 'Queue position', '队列位置')}: <b>{selectedFinanceGroupIndex + 1} / {financeGroups.length}</b>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {previousFinanceGroupKey ? (
                        <Link href={focusFinanceGroupHref(workflowQuery, previousFinanceGroupKey)} scroll={false}>{t(lang, 'Open previous', '打开上一条')}</Link>
                      ) : null}
                      {nextFinanceGroupKey ? (
                        <Link href={focusFinanceGroupHref(workflowQuery, nextFinanceGroupKey)} scroll={false}>{t(lang, 'Open next', '打开下一条')}</Link>
                      ) : null}
                      <a href={quickApprovedUnpaidHref}>{t(lang, 'Back to finance queue', '返回财务队列')}</a>
                    </div>
                  </div>
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
                      {selectedFinanceGroup.claims.some((claim) => !claim.attachmentExists) ? (
                        <div style={{ display: 'grid', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff7f7', color: '#b91c1c', fontSize: 13 }}>
                          <div>
                            {t(lang, 'One or more claims in this payout group have missing attachments. Repair the files before marking the batch paid.', '这一付款分组里有报销单附件缺失。请先修复文件，再批量标记付款。')}
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <a href={selectedFinanceRepairHref}>{t(lang, 'Open this submitter attachment issues', '查看该提交人的附件异常')}</a>
                            <a href={selectedFinanceSubmitterHistoryHref}>{t(lang, 'Open submitter history', '查看提交人历史')}</a>
                            <a href={quickAttachmentIssueHref}>{t(lang, 'Open all attachment issues', '查看全部附件异常')}</a>
                            <a href={attachmentHealthDeskHref}>{t(lang, 'Open attachment health desk', '打开附件异常总览')}</a>
                          </div>
                        </div>
                      ) : null}
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
                              <span style={{ color: claim.attachmentExists ? '#166534' : '#b91c1c', fontSize: 12 }}>
                                {claim.attachmentExists ? t(lang, 'Attachment OK', '附件正常') : t(lang, 'Attachment missing', '附件缺失')}
                              </span>
                              <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                                <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank" rel="noreferrer">{t(lang, 'View attachment', '查看附件')}</a>
                                <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt?download=1`} target="_blank" rel="noreferrer">{t(lang, 'Download attachment', '下载附件')}</a>
                              </span>
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>

                    <div id="expense-payment-details" style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 12, border: '1px solid #fde68a', background: '#fffdf5', scrollMarginTop: 104 }}>
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
                      <button type="submit" style={primaryButtonStyle}>{t(lang, 'Mark selected paid', '标记选中已付款')}</button>
                    </div>
                  </form>
                </>
              ) : (
                <div style={{ padding: '12px 0', color: '#64748b', display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>{t(lang, 'No payout group is selected', '当前没有选中的付款分组')}</div>
                  <div>{t(lang, 'Choose one finance group from the left queue. If nothing is waiting, clear filters or switch back to submitted review work.', '请先从左侧财务队列选择一组；如果当前没有待处理项，可清空筛选或回到待审批工作流。')}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
                  <Link href={quickSubmittedHref} scroll={false}>{t(lang, 'Open submitted review queue', '打开待审批队列')}</Link>
                </div>
              </div>
            )}
              </section>
            }
          />
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

      <details style={{ ...workbenchFilterPanelStyle, padding: 16 }} open={false}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          {t(lang, 'Expense approval config', '报销审批配置')}
        </summary>
        <div style={{ color: '#475569', fontSize: 14, marginTop: 12 }}>
          {t(
            lang,
            'Keep this config below the live queues so daily approvers can stay focused on submitted items first.',
            '把这个配置区放在实时队列后面，避免日常审批人一进页面就被低频设置打断。'
          )}
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
              <button type="submit" style={secondaryButtonStyle}>{t(lang, 'Save approval config', '保存审批配置')}</button>
            </div>
          </form>
        ) : (
          <div style={{ color: '#334155', fontSize: 14, marginTop: 12 }}>
            {approvalCfg.approverEmails.length ? approvalCfg.approverEmails.join(', ') : '-'}
          </div>
        )}
      </details>

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
                <input type="checkbox" name="attachmentIssueOnly" value="1" defaultChecked={attachmentIssueOnly} />
                <span>{t(lang, 'Only attachment issues', '仅看附件异常')}</span>
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 40 }}>
                <input type="checkbox" name="archived" value="1" defaultChecked={archivedOnly} />
                <span>{t(lang, 'Archived only', '仅看已归档')}</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" style={primaryButtonStyle}>{t(lang, 'Apply', '应用')}</button>
            <a href={exportHref}>{t(lang, 'Export CSV', '导出 CSV')}</a>
          </div>
        </form>
      </details>

      <details id="expense-history" style={{ scrollMarginTop: 104 }}>
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

      <details id="expense-self-submit">
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
