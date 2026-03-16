import { requireAdmin } from '@/lib/auth';
import { canFinanceOperateExpense, formatExpensePaymentMethod, getExpenseTypeOption, listExpenseClaims } from '@/lib/expense-claims';

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
  const paymentBatchMonth = searchParams.get('paymentBatchMonth');
  const status = searchParams.get('status') as 'ALL' | null;
  const expenseTypeCode = searchParams.get('expenseType');
  const currencyCode = searchParams.get('currency');
  const submitterQuery = searchParams.get('q');
  const approvedUnpaidOnly = searchParams.get('approvedUnpaidOnly') === '1';
  const archived = searchParams.get('archived') === '1';
  const rows = await listExpenseClaims({
    month,
    paymentBatchMonth,
    status: status || 'ALL',
    expenseTypeCode,
    currencyCode,
    submitterQuery,
    approvedUnpaidOnly,
    archived,
  });
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
    'Payment Method',
    'Payment Reference',
    'Paid At',
    'Paid By',
    'Payment Batch Month',
    'Finance Remarks',
    'Receipt Path',
    'Attachment Description',
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
      claim.paymentMethod ? formatExpensePaymentMethod(claim.paymentMethod) : '',
      claim.paymentReference || '',
      claim.paidAt ? claim.paidAt.toISOString() : '',
      claim.paidByEmail || '',
      claim.paymentBatchMonth || '',
      claim.financeRemarks || '',
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
