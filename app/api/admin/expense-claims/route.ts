import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { createExpenseClaim, DuplicateExpenseClaimError, getExpenseTypeOption, requiresExpenseLocation } from '@/lib/expense-claims';
import { storeExpenseClaimFile } from '@/lib/expense-claim-files';
import { parseDateOnlyToUTCNoon } from '@/lib/date-only';
import { unlink } from 'fs/promises';
import path from 'path';
import { redirect } from 'next/navigation';

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function toStoredFileAbsolutePath(relativePath: string) {
  return path.join(process.cwd(), 'public', relativePath.replace(/^\//, '').replace(/\//g, path.sep));
}

export async function POST(req: Request) {
  const actor = await requireAdmin();
  const currentUser = await getCurrentUser();
  const formData = await req.formData();
  const expenseDateRaw = String(formData.get('expenseDate') ?? '').trim();
  const expenseDate = expenseDateRaw ? parseDateOnlyToUTCNoon(expenseDateRaw) : null;
  const description = String(formData.get('description') ?? '').trim();
  const studentName = String(formData.get('studentName') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const currencyCode = String(formData.get('currencyCode') ?? '').trim();
  const expenseTypeCode = String(formData.get('expenseTypeCode') ?? '').trim().toUpperCase();
  const amountCents = parseMoneyToCents(formData.get('amount'));
  const gstAmountRaw = String(formData.get('gstAmount') ?? '').trim();
  const gstAmountCents = gstAmountRaw ? parseMoneyToCents(formData.get('gstAmount')) : null;
  const remarks = String(formData.get('remarks') ?? '').trim();
  const file = formData.get('receiptFile');
  const expenseType = getExpenseTypeOption(expenseTypeCode);

  if (!expenseDate || Number.isNaN(+expenseDate)) {
    redirect('/admin/expense-claims?err=Expense+date+is+required');
  }
  if (!description || amountCents === null || !expenseType) {
    redirect('/admin/expense-claims?err=Please+complete+all+required+fields');
  }
  if (requiresExpenseLocation(expenseTypeCode) && !location) {
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
      await unlink(toStoredFileAbsolutePath(stored.relativePath)).catch(() => {});
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
