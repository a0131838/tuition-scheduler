import { requireTeacher } from '@/lib/auth';
import { getExpenseTypeOption, requiresExpenseLocation, resubmitExpenseClaim } from '@/lib/expense-claims';
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
  const actor = await requireTeacher();
  const formData = await req.formData();
  const claimId = String(formData.get('claimId') ?? '').trim();
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

  if (!claimId || !expenseDate || Number.isNaN(+expenseDate)) {
    redirect('/teacher/expense-claims?err=Expense+date+is+required');
  }
  if (!description || amountCents === null || !expenseType) {
    redirect('/teacher/expense-claims?err=Please+complete+all+required+fields');
  }
  if (requiresExpenseLocation(expenseTypeCode) && !location) {
    redirect('/teacher/expense-claims?err=Location+is+required+for+transport+claims');
  }

  const hasReplacementFile = file instanceof File && file.size > 0;
  let storedReplacement:
    | {
        relativePath: string;
        originalName: string;
      }
    | null = null;

  try {
    if (hasReplacementFile) {
      storedReplacement = await storeExpenseClaimFile(file);
    }
    await resubmitExpenseClaim({
      claimId,
      actor,
      expenseDate,
      description,
      studentName: studentName || null,
      location: location || null,
      amountCents,
      gstAmountCents,
      currencyCode,
      expenseTypeCode,
      accountCode: expenseType.accountCode,
      receiptPath: storedReplacement?.relativePath ?? null,
      receiptOriginalName: storedReplacement?.originalName ?? null,
      remarks: remarks || null,
    });
  } catch (error) {
    if (storedReplacement) {
      await unlink(toStoredFileAbsolutePath(storedReplacement.relativePath)).catch(() => {});
    }
    const message = error instanceof Error ? error.message : 'Resubmit claim failed';
    redirect(`/teacher/expense-claims?err=${encodeURIComponent(message)}`);
  }

  redirect('/teacher/expense-claims?msg=Expense+claim+resubmitted');
}
