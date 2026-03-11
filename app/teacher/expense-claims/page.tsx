import { getCurrentUser, requireTeacher } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import { createExpenseClaim, formatExpenseMoney, getExpenseTypeOption, listExpenseClaims, requiresExpenseLocation } from '@/lib/expense-claims';
import { storeExpenseClaimFile } from '@/lib/expense-claim-files';
import ExpenseClaimForm from '@/app/_components/ExpenseClaimForm';
import { redirect } from 'next/navigation';
import { unlink } from 'fs/promises';
import path from 'path';

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function TeacherExpenseClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireTeacher();
  const currentUser = await getCurrentUser();
  const lang = await getLang();
  const params = (await searchParams) ?? {};
  const msg = typeof params.msg === 'string' ? params.msg : '';
  const err = typeof params.err === 'string' ? params.err : '';

  async function submitClaimAction(formData: FormData) {
    'use server';
    const actor = await requireTeacher();
    const current = await getCurrentUser();
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
      redirect('/teacher/expense-claims?err=Expense+date+is+required');
    }
    if (!description || amountCents === null || !expenseType) {
      redirect('/teacher/expense-claims?err=Please+complete+all+required+fields');
    }
    if (requiresExpenseLocation(expenseTypeCode) && !location) {
      redirect('/teacher/expense-claims?err=Location+is+required+for+transport+claims');
    }

    try {
      const stored = await storeExpenseClaimFile(file as File);
      try {
        await createExpenseClaim({
          submitterUserId: actor.id,
          submitterName: current?.name || actor.name || actor.email,
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
      redirect(`/teacher/expense-claims?err=${encodeURIComponent(message)}`);
    }

    redirect('/teacher/expense-claims?msg=Expense+claim+submitted');
  }

  const claims = await listExpenseClaims({ submitterUserId: user.id });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>{t(lang, 'My Expense Claims', '我的报销')}</h1>
      {msg ? <div style={{ padding: 10, borderRadius: 8, background: '#ecfdf5', color: '#166534' }}>{msg}</div> : null}
      {err ? <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>{err}</div> : null}
      <ExpenseClaimForm lang={lang} action={submitClaimAction} submitLabel={t(lang, 'Submit expense claim', '提交报销单')} />
      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>{t(lang, 'My submitted claims', '我提交的报销单')}</h2>
        {claims.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ref', 'Date', 'Type', 'Amount', 'Status', 'Receipt', 'Remarks'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 6px' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{claim.claimRefNo}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{formatDateOnly(claim.expenseDate)}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{claim.status}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}><a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank">{t(lang, 'Open', '打开')}</a></td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{claim.rejectReason || claim.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#64748b' }}>{t(lang, 'No expense claims yet.', '暂无报销单。')}</div>
        )}
      </section>
    </div>
  );
}
