import { ExpenseClaimStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { getApprovalRoleConfig, isRoleApprover } from '@/lib/approval-flow';

export const EXPENSE_CURRENCY_CODES = ['SGD', 'CNY', 'USD', 'HKD', 'THB'] as const;
export type ExpenseCurrencyCode = (typeof EXPENSE_CURRENCY_CODES)[number];

export type ExpenseTypeOption = {
  code: string;
  label: string;
  accountCode: string;
};

export const EXPENSE_TYPE_OPTIONS: ExpenseTypeOption[] = [
  { code: 'REIMBURSEMENT', label: '6000 / Reimbursement Claims / 报销申请', accountCode: '6000' },
  { code: 'TRAINING', label: '6010 / Training Costs / 培训费用', accountCode: '6010' },
  { code: 'TRANSPORT', label: '6040 / Transport and Travel / 交通与出行', accountCode: '6040' },
  { code: 'GRATUITY', label: '6041 / Gratuity Expenses / 小费支出', accountCode: '6041' },
  { code: 'IT', label: '6050 / IT Expenses / IT费用', accountCode: '6050' },
  { code: 'PLATFORM', label: '6051 / Platform Fees / 平台费用', accountCode: '6051' },
  { code: 'MATERIAL', label: '6052 / Material Fees / 材料费用', accountCode: '6052' },
  { code: 'OFFICE', label: '6060 / Office Supplies / 办公用品', accountCode: '6060' },
  { code: 'MARKETING', label: '6110 / Marketing and Advertising / 市场推广', accountCode: '6110' },
  { code: 'SMALL_ASSET', label: '6121 / Small Value Asset Expensed Off / 小额资产费用化', accountCode: '6121' },
  { code: 'SUBSCRIPTION', label: '6150 / Subscriptions and Licenses / 订阅与许可证', accountCode: '6150' },
  { code: 'MISC', label: '6199 / Miscellaneous Expenses / 其他杂项', accountCode: '6199' },
  { code: 'FIXED_ASSET', label: '1050 / Fixed Assets (> $500) / 固定资产（超过500）', accountCode: '1050' },
];

export function normalizeExpenseCurrencyCode(value?: string | null): ExpenseCurrencyCode {
  const raw = String(value ?? '').trim().toUpperCase();
  return (EXPENSE_CURRENCY_CODES as readonly string[]).includes(raw) ? (raw as ExpenseCurrencyCode) : 'SGD';
}

export function getExpenseTypeOption(code?: string | null) {
  const normalized = String(code ?? '').trim().toUpperCase();
  return EXPENSE_TYPE_OPTIONS.find((item) => item.code === normalized) ?? null;
}

export function requiresExpenseLocation(expenseTypeCode?: string | null) {
  return String(expenseTypeCode ?? '').trim().toUpperCase() === 'TRANSPORT';
}

export function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

export function formatExpenseMoney(cents: number, currencyCode: string) {
  return `${currencyCode} ${(Math.max(0, Number(cents || 0)) / 100).toFixed(2)}`;
}

export function canFinanceOperateExpense(user: { email?: string | null; role?: string | null }) {
  const email = String(user.email ?? '').trim().toLowerCase();
  return user.role === 'FINANCE' || email === 'zhaohongwei0880@gmail.com';
}

export async function canApproveExpense(user: { email?: string | null }) {
  const cfg = await getApprovalRoleConfig();
  return isRoleApprover(user.email, cfg.managerApproverEmails);
}

export async function allocateExpenseClaimRefNo(now = new Date()) {
  const prefix = `EC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const count = await prisma.expenseClaim.count({
    where: {
      createdAt: {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
        lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0),
      },
    },
  });
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

export async function createExpenseClaim(input: {
  submitterUserId: string;
  submitterName: string;
  submitterRole: string;
  expenseDate: Date;
  description: string;
  studentName?: string | null;
  location?: string | null;
  amountCents: number;
  gstAmountCents?: number | null;
  currencyCode: string;
  expenseTypeCode: string;
  accountCode: string;
  receiptPath: string;
  receiptOriginalName: string;
  remarks?: string | null;
  actor: { email?: string | null; name?: string | null; role?: string | null };
}) {
  const claimRefNo = await allocateExpenseClaimRefNo();
  const row = await prisma.expenseClaim.create({
    data: {
      claimRefNo,
      submitterUserId: input.submitterUserId,
      submitterName: input.submitterName,
      submitterRole: input.submitterRole,
      expenseDate: input.expenseDate,
      description: input.description,
      studentName: input.studentName?.trim() || null,
      location: input.location?.trim() || null,
      amountCents: input.amountCents,
      gstAmountCents: input.gstAmountCents ?? null,
      currencyCode: normalizeExpenseCurrencyCode(input.currencyCode),
      expenseTypeCode: input.expenseTypeCode,
      accountCode: input.accountCode,
      receiptPath: input.receiptPath,
      receiptOriginalName: input.receiptOriginalName,
      remarks: input.remarks?.trim() || null,
    },
  });

  await logAudit({
    actor: input.actor,
    module: 'expense-claims',
    action: 'submit',
    entityType: 'ExpenseClaim',
    entityId: row.id,
    meta: { claimRefNo: row.claimRefNo, amountCents: row.amountCents, currencyCode: row.currencyCode },
  });

  return row;
}

export async function approveExpenseClaim(input: {
  claimId: string;
  approver: { email?: string | null; name?: string | null; role?: string | null };
}) {
  const existing = await prisma.expenseClaim.findUnique({ where: { id: input.claimId } });
  if (!existing) throw new Error('Expense claim not found');
  if (existing.status !== ExpenseClaimStatus.SUBMITTED) {
    throw new Error('Only submitted claims can be approved');
  }
  const row = await prisma.expenseClaim.update({
    where: { id: input.claimId },
    data: {
      status: ExpenseClaimStatus.APPROVED,
      approverEmail: String(input.approver.email ?? '').trim().toLowerCase() || null,
      approvedAt: new Date(),
      rejectedAt: null,
      rejectReason: null,
    },
  });
  await logAudit({
    actor: input.approver,
    module: 'expense-claims',
    action: 'approve',
    entityType: 'ExpenseClaim',
    entityId: row.id,
    meta: { claimRefNo: row.claimRefNo },
  });
  return row;
}

export async function rejectExpenseClaim(input: {
  claimId: string;
  reason: string;
  approver: { email?: string | null; name?: string | null; role?: string | null };
}) {
  const existing = await prisma.expenseClaim.findUnique({ where: { id: input.claimId } });
  if (!existing) throw new Error('Expense claim not found');
  if (existing.status !== ExpenseClaimStatus.SUBMITTED) {
    throw new Error('Only submitted claims can be rejected');
  }
  const row = await prisma.expenseClaim.update({
    where: { id: input.claimId },
    data: {
      status: ExpenseClaimStatus.REJECTED,
      approverEmail: String(input.approver.email ?? '').trim().toLowerCase() || null,
      rejectedAt: new Date(),
      rejectReason: input.reason.trim(),
      approvedAt: null,
      paidAt: null,
      paidByEmail: null,
    },
  });
  await logAudit({
    actor: input.approver,
    module: 'expense-claims',
    action: 'reject',
    entityType: 'ExpenseClaim',
    entityId: row.id,
    meta: { claimRefNo: row.claimRefNo, reason: row.rejectReason },
  });
  return row;
}

export async function markExpenseClaimPaid(input: {
  claimId: string;
  paidBy: { email?: string | null; name?: string | null; role?: string | null };
  paymentBatchMonth?: string | null;
  remarks?: string | null;
}) {
  const existing = await prisma.expenseClaim.findUnique({ where: { id: input.claimId } });
  if (!existing) throw new Error('Expense claim not found');
  if (existing.status !== ExpenseClaimStatus.APPROVED) {
    throw new Error('Only approved claims can be marked paid');
  }
  const row = await prisma.expenseClaim.update({
    where: { id: input.claimId },
    data: {
      status: ExpenseClaimStatus.PAID,
      paidAt: new Date(),
      paidByEmail: String(input.paidBy.email ?? '').trim().toLowerCase() || null,
      paymentBatchMonth: input.paymentBatchMonth?.trim() || null,
      remarks: input.remarks?.trim() || undefined,
    },
  });
  await logAudit({
    actor: input.paidBy,
    module: 'expense-claims',
    action: 'mark-paid',
    entityType: 'ExpenseClaim',
    entityId: row.id,
    meta: { claimRefNo: row.claimRefNo, paymentBatchMonth: row.paymentBatchMonth },
  });
  return row;
}

export type ExpenseClaimListFilters = {
  status?: ExpenseClaimStatus | 'ALL' | null;
  month?: string | null;
  submitterUserId?: string | null;
};

export async function listExpenseClaims(filters: ExpenseClaimListFilters = {}) {
  const where: Prisma.ExpenseClaimWhereInput = {};
  if (filters.submitterUserId) where.submitterUserId = filters.submitterUserId;
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.month) {
    const [yearRaw, monthRaw] = String(filters.month).split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      where.expenseDate = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }
  }

  return prisma.expenseClaim.findMany({
    where,
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
  });
}
