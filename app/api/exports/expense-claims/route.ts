import { requireAdmin } from '@/lib/auth';
import { canFinanceOperateExpense, formatExpensePaymentMethod, getExpenseTypeOption, listExpenseClaims } from '@/lib/expense-claims';
import { formatUTCDateOnly } from '@/lib/date-only';
import { prisma } from '@/lib/prisma';
import { formatPayNowType } from '@/lib/teacher-payment-profile';

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
  const archivedParam = String(searchParams.get('archived') ?? '').trim().toLowerCase();
  const archived = archivedParam === '1' || archivedParam === 'archived' ? true : archivedParam === 'include' ? null : false;
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
  const submitterIds = Array.from(new Set(rows.map((row) => row.submitterUserId).filter(Boolean)));
  const submitters = submitterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: submitterIds } },
        select: {
          id: true,
          teacher: { select: { tutorCode: true, payNowType: true, payNowValue: true, payNowName: true } },
        },
      })
    : [];
  const submitterMap = new Map(submitters.map((submitter) => [submitter.id, submitter.teacher]));
  const header = [
    'Claim Ref No',
    'Submitter',
    'Tutor Code',
    'PayNow Type',
    'PayNow ID / Mobile',
    'PayNow Name',
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
    const teacher = submitterMap.get(claim.submitterUserId);
    lines.push([
      claim.claimRefNo,
      claim.submitterName,
      teacher?.tutorCode || '',
      formatPayNowType(teacher?.payNowType),
      teacher?.payNowValue || '',
      teacher?.payNowName || '',
      claim.submitterRole,
      formatUTCDateOnly(claim.expenseDate),
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
