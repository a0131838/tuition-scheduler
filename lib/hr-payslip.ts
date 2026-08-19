import { HrPayslipStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export function normalizeHrMonth(value: string) {
  const month = value.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid payroll month");
  return month;
}

export function hrPayrollMonthRange(monthValue: string) {
  const month = normalizeHrMonth(monthValue);
  const [year, monthNumber] = month.split("-").map(Number);
  return { month, start: new Date(year, monthNumber - 1, 1), end: new Date(year, monthNumber, 0, 23, 59, 59, 999) };
}

export function calculateHrPayslipTotals(input: {
  basicSalaryCents: number;
  allowanceCents: number;
  deductionCents: number;
  employeeCpfCents: number;
  employerCpfCents?: number;
  reimbursementCents: number;
}) {
  const basicSalaryCents = Math.max(0, Math.round(input.basicSalaryCents));
  const allowanceCents = Math.max(0, Math.round(input.allowanceCents));
  const deductionCents = Math.max(0, Math.round(input.deductionCents));
  const employeeCpfCents = Math.max(0, Math.round(input.employeeCpfCents));
  const reimbursementCents = Math.max(0, Math.round(input.reimbursementCents));
  const grossPayCents = basicSalaryCents + allowanceCents;
  const netPayCents = Math.max(0, grossPayCents - deductionCents - employeeCpfCents + reimbursementCents);
  return { basicSalaryCents, allowanceCents, deductionCents, employeeCpfCents, reimbursementCents, grossPayCents, netPayCents };
}

export async function saveDraftHrPayslip(input: {
  employeeId: string;
  month: string;
  currencyCode?: string;
  basicSalaryCents: number;
  allowanceCents: number;
  deductionCents: number;
  employeeCpfCents: number;
  employerCpfCents: number;
  reimbursementCents: number;
  note?: string | null;
  preparedBy: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  const employee = await prisma.employeeProfile.findUnique({ where: { id: input.employeeId }, select: { legalEntityId: true, payrollEligible: true } });
  if (!employee?.payrollEligible) throw new Error("Employee is not eligible for payroll");
  const range = hrPayrollMonthRange(input.month);
  const totals = calculateHrPayslipTotals(input);
  const existing = await prisma.hrPayslip.findUnique({ where: { employeeId_month: { employeeId: input.employeeId, month: range.month } }, select: { status: true } });
  if (existing && existing.status !== HrPayslipStatus.DRAFT) throw new Error("Only a draft payslip can be edited");
  const row = await prisma.hrPayslip.upsert({
    where: { employeeId_month: { employeeId: input.employeeId, month: range.month } },
    create: {
      employeeId: input.employeeId,
      legalEntityId: employee.legalEntityId,
      month: range.month,
      periodStart: range.start,
      periodEnd: range.end,
      currencyCode: input.currencyCode?.trim().toUpperCase() || "SGD",
      ...totals,
      employerCpfCents: Math.max(0, Math.round(input.employerCpfCents)),
      note: input.note?.trim() || null,
      preparedById: input.preparedBy.id,
    },
    update: {
      currencyCode: input.currencyCode?.trim().toUpperCase() || "SGD",
      ...totals,
      employerCpfCents: Math.max(0, Math.round(input.employerCpfCents)),
      note: input.note?.trim() || null,
      preparedById: input.preparedBy.id,
    },
  });
  await logAudit({ actor: input.preparedBy, module: "hr", action: "PAYSLIP_DRAFT_SAVED", entityType: "HrPayslip", entityId: row.id, meta: { month: row.month, netPayCents: row.netPayCents } });
  return row;
}

const TRANSITIONS: Record<HrPayslipStatus, HrPayslipStatus[]> = {
  DRAFT: [HrPayslipStatus.HR_VERIFIED, HrPayslipStatus.VOID],
  HR_VERIFIED: [HrPayslipStatus.FINANCE_CONFIRMED, HrPayslipStatus.DRAFT, HrPayslipStatus.VOID],
  FINANCE_CONFIRMED: [HrPayslipStatus.DIRECTOR_APPROVED, HrPayslipStatus.HR_VERIFIED, HrPayslipStatus.VOID],
  DIRECTOR_APPROVED: [HrPayslipStatus.PAID, HrPayslipStatus.FINANCE_CONFIRMED, HrPayslipStatus.VOID],
  PAID: [],
  VOID: [],
};

export async function transitionHrPayslip(input: {
  payslipId: string;
  nextStatus: HrPayslipStatus;
  paymentReference?: string | null;
  actor: { id: string; email: string; name?: string | null; role?: string | null };
}) {
  const row = await prisma.hrPayslip.findUnique({ where: { id: input.payslipId } });
  if (!row) throw new Error("Payslip not found");
  if (!TRANSITIONS[row.status].includes(input.nextStatus)) throw new Error(`Invalid payslip transition: ${row.status} -> ${input.nextStatus}`);
  const now = new Date();
  const roleFields =
    input.nextStatus === HrPayslipStatus.HR_VERIFIED
      ? { hrVerifiedById: input.actor.id, hrVerifiedAt: now }
      : input.nextStatus === HrPayslipStatus.FINANCE_CONFIRMED
        ? { financeConfirmedById: input.actor.id, financeConfirmedAt: now }
        : input.nextStatus === HrPayslipStatus.DIRECTOR_APPROVED
          ? { directorApprovedById: input.actor.id, directorApprovedAt: now }
          : input.nextStatus === HrPayslipStatus.PAID
            ? { paidById: input.actor.id, paidAt: now, paymentReference: input.paymentReference?.trim() || null }
            : {};
  const changed = await prisma.hrPayslip.updateMany({ where: { id: row.id, status: row.status }, data: { status: input.nextStatus, ...roleFields } });
  if (changed.count !== 1) throw new Error("Payslip was updated by another user");
  await logAudit({ actor: input.actor, module: "hr", action: `PAYSLIP_${input.nextStatus}`, entityType: "HrPayslip", entityId: row.id });
}

export function formatHrMoney(cents: number, currency = "SGD") {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
