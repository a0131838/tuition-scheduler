import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { prisma } from "@/lib/prisma";
import { getReceiptApprovalStatus } from "@/lib/receipt-approval-policy";
import { hasDedicatedCashPaymentRecord, isCashReceipt } from "@/lib/renewal-signature-exception";
import { contractRenewalTopUpMarker, type StudentContractSummary } from "@/lib/student-contract";
import { getStudentContractInvoiceChoice } from "@/lib/student-contract-invoice-choice";
import type { ParentInvoiceItem, ParentPaymentRecordItem, ParentReceiptItem } from "@/lib/student-parent-billing";

type Billing = { invoices: ParentInvoiceItem[]; receipts: ParentReceiptItem[]; paymentRecords: ParentPaymentRecordItem[] };
type Contract = Pick<StudentContractSummary, "id" | "studentId" | "packageId" | "invoiceId" | "createdAt" | "contractSnapshot" | "status" | "signedAt" | "signExpiresAt" | "flowType" | "contractMode">;
type ReceiptStatus = ReturnType<typeof getReceiptApprovalStatus>;
type CashPaymentStatus = "READY" | "NON_CASH" | "NO_CASH_RECEIPT" | "RECEIPT_APPROVAL_PENDING" | "CASH_BALANCE_DUE" | "CHECK_CASH_RECORD";
const cents = (amount: number) => Math.round(amount * 100);

function paymentMethod(value: string | null | undefined) {
  const method = value?.trim() ?? "";
  if (!method || /^(other|others|unknown|n\/a|-|其他|未知)$/i.test(method)) return null;
  if (isCashReceipt(method)) return "Cash";
  if (/^pay\s*now$/i.test(method)) return "PayNow";
  return method;
}

export function assessRenewalInvoicePayment(
  invoice: ParentInvoiceItem,
  billing: Billing,
  contract: Pick<Contract, "packageId" | "studentId" | "createdAt">,
  statusFor: (id: string) => ReceiptStatus,
) {
  const receipts = billing.receipts.filter(row =>
    row.invoiceId === invoice.id && row.packageId === contract.packageId && row.studentId === contract.studentId);
  const approved = receipts.filter(row => statusFor(row.id) === "COMPLETED");
  const pending = receipts.filter(row => !["COMPLETED", "REJECTED"].includes(statusFor(row.id)));
  const approvedCents = approved.reduce((sum, row) => sum + cents(row.amountReceived), 0);
  const totalCents = cents(invoice.totalAmount);
  const methodsFor = (rows: ParentReceiptItem[]) => Array.from(new Set(rows.flatMap(row => {
    const linked = billing.paymentRecords.find(record => record.id === row.paymentRecordId &&
      record.packageId === contract.packageId && record.studentId === contract.studentId);
    return [paymentMethod(row.paidBy), paymentMethod(linked?.paymentMethod)].filter((method): method is string => Boolean(method));
  })));
  const approvedMethods = methodsFor(approved);
  const activeMethods = methodsFor([...approved, ...pending]);
  const approvedCashOnly = approved.length > 0 && approved.every(row => isCashReceipt(row.paidBy));
  const cashReady = approvedCashOnly && approvedCents === totalCents && approved.every(receipt =>
    hasDedicatedCashPaymentRecord({ ...contract, contractCreatedAt: contract.createdAt, receipt,
      paymentRecords: billing.paymentRecords, allReceipts: billing.receipts }));
  const cashStatus: CashPaymentStatus = cashReady ? "READY"
    : activeMethods.some(method => method !== "Cash") ? "NON_CASH"
    : !activeMethods.includes("Cash") ? "NO_CASH_RECEIPT"
    : approvedCents < totalCents ? pending.length ? "RECEIPT_APPROVAL_PENDING" : "CASH_BALANCE_DUE"
    : "CHECK_CASH_RECORD";
  return { invoice, approvedCents, totalCents, pendingCount: pending.length, approvedMethods, cashStatus };
}

export async function loadRenewalPaymentOverview(input: {
  contract: Contract;
  billing: Billing;
  packageType: string;
  packageStatus: string;
  settlementMode: string | null;
  roles?: Awaited<ReturnType<typeof getApprovalRoleConfig>>;
  approvals?: Awaited<ReturnType<typeof getParentReceiptApprovalMap>>;
}) {
  const { contract, billing } = input;
  if (contract.flowType !== "RENEWAL" || contract.contractMode !== "TUITION_AGREEMENT" || input.packageType !== "HOURS" ||
      input.settlementMode !== null || !contract.contractSnapshot) return null;
  const fee = Number(contract.contractSnapshot.package?.feeAmount);
  const minutes = Math.round(Number(contract.contractSnapshot.package?.totalMinutes));
  if (!(fee > 0 && Number.isFinite(fee) && minutes > 0 && Number.isFinite(minutes))) return null;

  const [roles, approvals, choice, exception, order, entries, otherContracts, otherExceptions, usedTasks] = await Promise.all([
    input.roles ?? getApprovalRoleConfig(),
    input.approvals ?? getParentReceiptApprovalMap(billing.receipts.map(row => row.id)),
    contract.invoiceId ? null : getStudentContractInvoiceChoice(contract.id),
    prisma.renewalSignatureException.findUnique({ where: { contractId: contract.id }, select: { status: true, invoiceId: true } }),
    prisma.renewalOrder.findUnique({ where: { contractId: contract.id }, select: { id: true, cancelledAt: true, activatedAt: true, invoiceId: true } }),
    prisma.packageTxn.findMany({ where: { packageId: contract.packageId, kind: "PURCHASE", note: { contains: contractRenewalTopUpMarker(contract.id) } },
      select: { deltaMinutes: true, correctionSources: { select: { unit: true, deltaUnits: true } } } }),
    prisma.studentContract.findMany({ where: { invoiceId: { in: billing.invoices.map(row => row.id) }, id: { not: contract.id }, status: { not: "VOID" } }, select: { invoiceId: true } }),
    prisma.renewalSignatureException.findMany({ where: { invoiceId: { in: billing.invoices.map(row => row.id) }, contractId: { not: contract.id }, status: { not: "REJECTED" } }, select: { invoiceId: true } }),
    prisma.renewalTask.findMany({ where: { invoiceId: { in: billing.invoices.map(row => row.id) }, paymentConfirmedAt: { not: null }, contractId: { not: contract.id } }, select: { invoiceId: true } }),
  ]);
  const activeOrder = order && !order.cancelledAt ? order : null;
  const currentInvoiceId = exception?.invoiceId ?? activeOrder?.invoiceId ?? contract.invoiceId ?? choice?.invoiceId;
  const usedInvoices = new Set([...otherContracts, ...otherExceptions, ...usedTasks].map(row => row.invoiceId));
  const candidates = billing.invoices.filter(row =>
    row.packageId === contract.packageId && row.studentId === contract.studentId && !usedInvoices.has(row.id) &&
    cents(row.totalAmount) === cents(fee) && new Date(row.createdAt).getTime() >= contract.createdAt.getTime() - 7 * 86400000);
  const statusFor = (id: string) => getReceiptApprovalStatus(approvals.get(id), roles);
  const assessments = candidates.map(row => assessRenewalInvoicePayment(row, billing, contract, statusFor));
  const matched = currentInvoiceId
    ? billing.invoices.find(row => row.id === currentInvoiceId && row.packageId === contract.packageId && row.studentId === contract.studentId)
    : candidates.length === 1 ? candidates[0] : undefined;
  const current = matched ? assessRenewalInvoicePayment(matched, billing, contract, statusFor) : null;
  const cashCandidates = assessments.filter(row => row.cashStatus !== "NON_CASH" &&
    (!currentInvoiceId || row.invoice.id === currentInvoiceId));
  const canOpenCash = Boolean(exception) || (!activeOrder && input.packageStatus === "ACTIVE" &&
    contract.status === "READY_TO_SIGN" && !contract.signedAt &&
    (!contract.signExpiresAt || contract.signExpiresAt.getTime() >= Date.now()) &&
    cashCandidates.some(row => row.cashStatus === "READY"));
  const postedMinutes = entries.reduce((total, row) => total + row.correctionSources.reduce(
    (minutes, correction) => minutes + (correction.unit === "MINUTES" ? correction.deltaUnits : 0), row.deltaMinutes,
  ), 0);
  const invoiceApproval = matched ? await prisma.packageInvoiceApproval.findFirst({
    where: { packageId: contract.packageId, invoiceId: matched.id },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }], select: { status: true },
  }) : null;

  return {
    current, cashCandidates, canOpenCash, exception, activeOrder, invoiceApproval: invoiceApproval?.status ?? null,
    minutes, posted: postedMinutes >= minutes || Boolean(activeOrder?.activatedAt && entries.length &&
      entries.every(row => !row.correctionSources.some(correction => correction.unit === "MINUTES" && correction.deltaUnits < 0))),
    ambiguous: !currentInvoiceId && candidates.length > 1,
  };
}

export type RenewalPaymentOverview = NonNullable<Awaited<ReturnType<typeof loadRenewalPaymentOverview>>>;
