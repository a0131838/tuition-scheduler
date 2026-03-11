import { requireAdmin } from '@/lib/auth';
import { canFinanceOperateExpense, getExpenseTypeOption, listExpenseClaims } from '@/lib/expense-claims';

function csvEscape(value: unknown) {
  const raw = String(value ?? '');
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export async function GET(req: Request) {
  const user = await requireAdmin();
  if (!canFinanceOperateExpense(user)) {
    return new Response('Not allowed', { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const status = searchParams.get('status') as 'ALL' | null;
  const rows = await listExpenseClaims({ month, status: status || 'ALL' });
  const header = [
    'Claim Ref No',
    'Submitter',
    'Role',
    'Expense Date',
    'Expense Type',
    'Account Code',
    'Student Name',
    'Location',
    'Amount',
    'GST Amount',
    'Currency',
    'Status',
    'Approver',
    'Paid At',
    'Payment Batch Month',
    'Receipt Path',
    'Description',
    'Remarks',
  ];
  const lines = [header.join(',')];
  for (const claim of rows) {
    lines.push([
      claim.claimRefNo,
      claim.submitterName,
      claim.submitterRole,
      claim.expenseDate.toISOString().slice(0, 10),
      getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode,
      claim.accountCode,
      claim.studentName || '',
      claim.location || '',
      (claim.amountCents / 100).toFixed(2),
      ((claim.gstAmountCents ?? 0) / 100).toFixed(2),
      claim.currencyCode,
      claim.status,
      claim.approverEmail || '',
      claim.paidAt ? claim.paidAt.toISOString() : '',
      claim.paymentBatchMonth || '',
      claim.receiptPath,
      claim.description,
      claim.remarks || claim.rejectReason || '',
    ].map(csvEscape).join(','));
  }
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="expense_claims${month ? `_${month}` : ''}.csv"`,
    },
  });
}
