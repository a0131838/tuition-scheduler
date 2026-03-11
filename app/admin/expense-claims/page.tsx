import { getCurrentUser, isManagerUser, requireAdmin } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { ExpenseClaimStatus } from '@prisma/client';
import ExpenseClaimForm from '@/app/_components/ExpenseClaimForm';
import {
  canApproveExpense,
  canFinanceOperateExpense,
  createExpenseClaim,
  formatExpenseMoney,
  getExpenseTypeOption,
  listExpenseClaims,
  markExpenseClaimPaid,
  monthKey,
  rejectExpenseClaim,
  approveExpenseClaim,
} from '@/lib/expense-claims';
import { storeExpenseClaimFile } from '@/lib/expense-claim-files';
import { unlink } from 'fs/promises';
import path from 'path';

function isPreviewableImage(name: string | null | undefined) {
  const ext = path.extname(String(name ?? '')).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
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
  const canApprove = await canApproveExpense(user);
  const canFinance = canFinanceOperateExpense(user);
  const isManager = await isManagerUser(user);

  async function submitClaimAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    const currentUser = await getCurrentUser();
    const expenseDateRaw = String(formData.get('expenseDate') ?? '').trim();
    const expenseDate = expenseDateRaw ? new Date(`${expenseDateRaw}T00:00:00`) : null;
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
      redirect('/admin/expense-claims?err=Not+allowed');
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    if (!claimId) redirect('/admin/expense-claims?err=Missing+claim+id');
    await approveExpenseClaim({ claimId, approver: actor });
    redirect('/admin/expense-claims?msg=Expense+claim+approved');
  }

  async function rejectAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!(await canApproveExpense(actor))) {
      redirect('/admin/expense-claims?err=Not+allowed');
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();
    if (!claimId || !reason) redirect('/admin/expense-claims?err=Reject+reason+is+required');
    await rejectExpenseClaim({ claimId, reason, approver: actor });
    redirect('/admin/expense-claims?msg=Expense+claim+rejected');
  }

  async function markPaidAction(formData: FormData) {
    'use server';
    const actor = await requireAdmin();
    if (!canFinanceOperateExpense(actor)) {
      redirect('/admin/expense-claims?err=Only+finance+can+mark+paid');
    }
    const claimId = String(formData.get('claimId') ?? '').trim();
    const paymentBatchMonth = String(formData.get('paymentBatchMonth') ?? '').trim();
    const remarks = String(formData.get('remarks') ?? '').trim();
    if (!claimId) redirect('/admin/expense-claims?err=Missing+claim+id');
    await markExpenseClaimPaid({ claimId, paymentBatchMonth: paymentBatchMonth || null, remarks: remarks || null, paidBy: actor });
    redirect('/admin/expense-claims?msg=Expense+claim+marked+paid');
  }

  const claims = await listExpenseClaims({
    status: (statusFilter as ExpenseClaimStatus | 'ALL') || 'ALL',
    month: monthFilter || null,
  });
  const exportHref = `/api/exports/expense-claims${monthFilter || statusFilter !== 'ALL' ? `?${new URLSearchParams({ ...(monthFilter ? { month: monthFilter } : {}), ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}) }).toString()}` : ''}`;

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

      <form style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <label>
          {t(lang, 'Status', '状态')}
          <select name="status" defaultValue={statusFilter}>
            <option value="ALL">ALL</option>
            {Object.values(ExpenseClaimStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, 'Month', '月份')}
          <input type="month" name="month" defaultValue={monthFilter} />
        </label>
        <button type="submit">{t(lang, 'Apply', '应用')}</button>
        <a href={exportHref}>{t(lang, 'Export CSV', '导出 CSV')}</a>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Ref', 'Submitter', 'Date', 'Type', 'Amount', 'Status', 'Receipt', 'Action'].map((head) => (
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
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>{formatDateOnly(claim.expenseDate)}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>{typeLabel}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>{formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div>{claim.status}</div>
                    {claim.approverEmail ? <div style={{ color: '#64748b', fontSize: 12 }}>{claim.approverEmail}</div> : null}
                    {claim.rejectReason ? <div style={{ color: '#b91c1c', fontSize: 12 }}>{claim.rejectReason}</div> : null}
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
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
                          <input type="month" name="paymentBatchMonth" defaultValue={monthKey(new Date())} />
                          <input name="remarks" placeholder={t(lang, 'Finance remarks', '财务备注')} />
                          <button type="submit">{t(lang, 'Mark Paid', '标记已付款')}</button>
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
