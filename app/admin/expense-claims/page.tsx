import { getCurrentUser, isManagerUser, requireAdmin } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { ExpenseClaimStatus } from '@prisma/client';
import ExpenseClaimForm from '@/app/_components/ExpenseClaimForm';
import {
  canApproveExpense,
  archiveExpenseClaim,
  canEditExpenseApprovalConfig,
  canFinanceOperateExpense,
  createExpenseClaim,
  DuplicateExpenseClaimError,
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
import { storeExpenseClaimFile } from '@/lib/expense-claim-files';
import { unlink } from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { formatDateOnly, formatMonthKey, formatUTCDateOnly, parseDateOnlyToUTCNoon } from '@/lib/date-only';

function isPreviewableImage(name: string | null | undefined) {
  const ext = path.extname(String(name ?? '')).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

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
  const quickClearHref = '/admin/expense-claims';

  async function submitClaimAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    const currentUser = await getCurrentUser();
    const expenseDateRaw = String(formData.get('expenseDate') ?? '').trim();
    const expenseDate = expenseDateRaw ? parseDateOnlyToUTCNoon(expenseDateRaw) : null;
    const description = String(formData.get('description') ?? '').trim();
    const studentName = String(formData.get('studentName') ?? '').trim();
    const location = String(formData.get('location') ?? '').trim();
    const currencyCode = String(formData.get('currencyCode') ?? '').trim();
    const expenseTypeCode = String(formData.get('expenseTypeCode') ?? '').trim().toUpperCase();
    const amountCents = parseMoneyToCents(formData.get('amount'));
    const gstAmountRaw = String(formData.get('gstAmount') ?? '').trim();
    const gstAmountCents = gstAmountRaw ? parseMoneyToCents(gstAmountRaw) : null;
    const remarks = String(formData.get('remarks') ?? '').trim();
    const file = formData.get('receiptFile');
    const expenseType = getExpenseTypeOption(expenseTypeCode);

    if (!expenseDate || Number.isNaN(+expenseDate)) {
      redirect('/admin/expense-claims?err=Expense+date+is+required');
    }
    if (!description || amountCents === null || !expenseType) {
      redirect('/admin/expense-claims?err=Please+complete+all+required+fields');
    }
    if (expenseTypeCode === 'TRANSPORT' && !location) {
      redirect('/admin/expense-claims?err=Location+is+required+for+transport+claims');
    }

    try {
      const stored = await storeExpenseClaimFile(file as File);
      try {
        await createExpenseClaim({
          submitterUserId: actor.id,
          submitterName: currentUser?.name || actor.name || actor.email,
          submitterRole: actor.role,
          expenseDate,
          description,
          studentName: studentName || null,
          location: location || null,
          amountCents,
          gstAmountCents,
          currencyCode,
          expenseTypeCode,
          accountCode: expenseType.accountCode,
          receiptPath: stored.relativePath,
          receiptOriginalName: stored.originalName,
          remarks: remarks || null,
          actor,
        });
      } catch (error) {
        const absPath = path.join(process.cwd(), 'public', stored.relativePath.replace(/^\//, '').replace(/\//g, path.sep));
        await unlink(absPath).catch(() => {});
        if (error instanceof DuplicateExpenseClaimError) {
          redirect('/admin/expense-claims?msg=Expense+claim+already+submitted');
        }
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submit claim failed';
      redirect(`/admin/expense-claims?err=${encodeURIComponent(message)}`);
    }

    redirect('/admin/expense-claims?msg=Expense+claim+submitted');
  }

  async function approveAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Not allowed' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    if (!claimId) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Missing claim id' })}`);
    await approveExpenseClaim({ claimId, approver: actor });
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), msg: 'Expense claim approved' })}`);
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Not allowed' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();
    if (!claimId || !reason) redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Reject reason is required' })}`);
    await rejectExpenseClaim({ claimId, reason, approver: actor });
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), msg: 'Expense claim rejected' })}`);
  }

  async function markPaidAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canFinanceOperateExpense(actor)) {
      redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), err: 'Only finance can mark paid' })}`);
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
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
    redirect(`/admin/expense-claims?${buildFilterQuery({ ...Object.fromEntries(new URLSearchParams(filterQuery)), msg: 'Expense claim marked paid' })}`);
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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>{t(lang, 'Expense Claims', '报销审批')}</h1>
      {msg ? <div style={{ padding: 10, borderRadius: 8, background: '#ecfdf5', color: '#166534' }}>{msg}</div> : null}
      {err ? <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>{err}</div> : null}

      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{t(lang, 'Submit a claim for myself', '为自己提交报销')}</summary>
        <div style={{ marginTop: 12 }}>
          <ExpenseClaimForm lang={lang} action={submitClaimAction} submitLabel={t(lang, 'Submit expense claim', '提交报销单')} />
        </div>
      </details>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{t(lang, 'Expense Approval Config', '报销审批配置')}</div>
        <div style={{ color: '#475569', fontSize: 14 }}>
          {t(lang, 'Approved expense claims are controlled by this approver list.', '报销单的批准权限由这组审批人控制。')}
        </div>
        {canEditApprovalConfig ? (
          <form action={saveApprovalConfigAction} style={{ display: 'grid', gap: 8, maxWidth: 980 }}>
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
          <div style={{ color: '#334155', fontSize: 14 }}>
            {approvalCfg.approverEmails.length ? approvalCfg.approverEmails.join(', ') : '-'}
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: 14, background: '#f8fbff' }}>
          <div style={{ color: '#475569', fontSize: 13 }}>{t(lang, 'Submitted', '待审批')}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{summary.submittedCount}</div>
        </div>
        <div style={{ border: '1px solid #fde68a', borderRadius: 12, padding: 14, background: '#fffbeb' }}>
          <div style={{ color: '#475569', fontSize: 13 }}>{t(lang, 'Approved but unpaid', '已批未付')}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{summary.approvedCount}</div>
        </div>
        <div style={{ border: '1px solid #dcfce7', borderRadius: 12, padding: 14, background: '#f0fdf4' }}>
          <div style={{ color: '#475569', fontSize: 13 }}>{t(lang, 'Paid', '已付款')}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{summary.paidCount}</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
          <div style={{ color: '#475569', fontSize: 13 }}>{t(lang, 'Rejected', '已驳回')}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{summary.rejectedCount}</div>
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

      {(reminders.staleSubmitted.length || reminders.staleApprovedUnpaid.length) ? (
        <section style={{ border: '1px solid #fecaca', borderRadius: 12, padding: 16, display: 'grid', gap: 12, background: '#fff7f7' }}>
          <div style={{ fontWeight: 700 }}>{t(lang, 'Follow-up reminders', '跟进提醒')}</div>
          {reminders.staleSubmitted.length ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 600 }}>{t(lang, 'Submitted more than 3 days ago', '提交超过3天未审批')}</div>
              {reminders.staleSubmitted.map((claim) => (
                <div key={claim.id} style={{ fontSize: 14 }}>
                  {claim.claimRefNo} | {claim.submitterName} | {formatUTCDateOnly(claim.expenseDate)} | {formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}
                </div>
              ))}
            </div>
          ) : null}
          {reminders.staleApprovedUnpaid.length ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontWeight: 600 }}>{t(lang, 'Approved more than 3 days ago but not paid', '批准超过3天仍未付款')}</div>
              {reminders.staleApprovedUnpaid.map((claim) => (
                <div key={claim.id} style={{ fontSize: 14 }}>
                  {claim.claimRefNo} | {claim.submitterName} | {formatUTCDateOnly(claim.expenseDate)} | {formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={quickExpenseThisMonthHref}>{t(lang, 'This month expenses', '本月消费')}</a>
          <a href={quickExpenseLastMonthHref}>{t(lang, 'Last month expenses', '上月消费')}</a>
          <a href={quickApprovedUnpaidHref}>{t(lang, 'Approved but unpaid', '已批未付')}</a>
          <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
        </div>
        <form style={{ display: 'grid', gap: 14 }}>
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
      </section>

      <div style={{ overflowX: 'auto' }}>
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
                    <div>{claim.status}</div>
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
                      {isPreviewableImage(claim.receiptOriginalName) ? (
                        <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`}
                            alt={claim.receiptOriginalName || 'receipt'}
                            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
                          />
                        </a>
                      ) : null}
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
                            <button type="submit">{t(lang, 'Approve', '批准')}</button>
                          </form>
                          <form action={rejectAction} style={{ display: 'grid', gap: 6 }}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <input name="reason" placeholder={t(lang, 'Reject reason', '驳回原因')} />
                            <button type="submit">{t(lang, 'Reject', '驳回')}</button>
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
    </div>
  );
}
