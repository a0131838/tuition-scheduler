import { getCurrentUser, requireTeacher } from '@/lib/auth';
import { createExpenseClaim, DuplicateExpenseClaimError, getExpenseTypeOption, requiresExpenseLocation } from '@/lib/expense-claims';
import { storeExpenseClaimFile } from '@/lib/expense-claim-files';
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile } from '@/lib/business-file-storage';
import { parseDateOnlyToUTCNoon } from '@/lib/date-only';
import { redirect } from 'next/navigation';

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  const actor = await requireTeacher();
  const current = await getCurrentUser();
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
      await deleteStoredBusinessFile(stored.relativePath, BUSINESS_UPLOAD_PREFIX.expenseClaims);
      if (error instanceof DuplicateExpenseClaimError) {
        redirect('/teacher/expense-claims?msg=Expense+claim+already+submitted');
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submit claim failed';
    redirect(`/teacher/expense-claims?err=${encodeURIComponent(message)}`);
  }

  redirect('/teacher/expense-claims?msg=Expense+claim+submitted');
}
