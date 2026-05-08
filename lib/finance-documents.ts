import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { formatBusinessDateTime, normalizeDateOnly } from "@/lib/date-only";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import { listPartnerBilling } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";
import { getReceiptApprovalStatus, isReceiptFinanceApproved } from "@/lib/receipt-approval-policy";
import { listAllParentBilling } from "@/lib/student-parent-billing";

export type FinanceDocumentChannel = "PARENT" | "PARTNER";
export type FinanceDocumentType = "INVOICE" | "RECEIPT";
export type FinanceDocumentPaymentStatus = "PAID" | "PARTIAL" | "UNPAID" | "PENDING_APPROVAL" | "REJECTED";

export type FinanceDocumentFilters = {
  channel?: string | null;
  type?: string | null;
  paymentStatus?: string | null;
  q?: string | null;
  packageId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type FinanceDocumentRow = {
  id: string;
  channel: FinanceDocumentChannel;
  type: FinanceDocumentType;
  docNo: string;
  issueDate: string;
  packageId: string;
  partyLabel: string;
  contextLabel: string;
  amount: number;
  receiptedAmount: number;
  pendingReceiptAmount: number;
  rejectedReceiptAmount: number;
  remainingAmount: number;
  receiptCount: number;
  paymentStatus: FinanceDocumentPaymentStatus;
  exportHref: string | null;
  openHref: string;
  exportReady: boolean;
};

function roundMoney(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function normalizeAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeFinanceDocumentChannel(value: string | null | undefined): FinanceDocumentChannel | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "PARENT" || normalized === "PARTNER" ? normalized : "";
}

export function normalizeFinanceDocumentType(value: string | null | undefined): FinanceDocumentType | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "INVOICE" || normalized === "RECEIPT" ? normalized : "";
}

export function normalizeFinanceDocumentPaymentStatus(
  value: string | null | undefined,
): FinanceDocumentPaymentStatus | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "PAID" ||
    normalized === "PARTIAL" ||
    normalized === "UNPAID" ||
    normalized === "PENDING_APPROVAL" ||
    normalized === "REJECTED"
    ? normalized
    : "";
}

export function resolveInvoicePaymentStatus(input: {
  invoiceTotal: number;
  approvedReceiptTotal: number;
  pendingReceiptTotal?: number;
  rejectedReceiptTotal?: number;
}): FinanceDocumentPaymentStatus {
  const invoiceTotal = Math.max(0, normalizeAmount(input.invoiceTotal));
  const approvedReceiptTotal = Math.max(0, normalizeAmount(input.approvedReceiptTotal));
  const pendingReceiptTotal = Math.max(0, normalizeAmount(input.pendingReceiptTotal));
  const rejectedReceiptTotal = Math.max(0, normalizeAmount(input.rejectedReceiptTotal));

  if (invoiceTotal > 0 && approvedReceiptTotal + 0.009 >= invoiceTotal) return "PAID";
  if (approvedReceiptTotal > 0.009) return "PARTIAL";
  if (pendingReceiptTotal > 0.009) return "PENDING_APPROVAL";
  if (rejectedReceiptTotal > 0.009) return "REJECTED";
  return "UNPAID";
}

function includesQuery(parts: Array<string | number | null | undefined>, query: string) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  return parts.some((part) => String(part ?? "").toLowerCase().includes(normalized));
}

function normalizeDateFilter(value: string | null | undefined) {
  const normalized = normalizeDateOnly(String(value ?? "").trim());
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

export function filterFinanceDocumentRows(rows: FinanceDocumentRow[], filters: FinanceDocumentFilters = {}) {
  const channel = normalizeFinanceDocumentChannel(filters.channel);
  const type = normalizeFinanceDocumentType(filters.type);
  const paymentStatus = normalizeFinanceDocumentPaymentStatus(filters.paymentStatus);
  const q = String(filters.q ?? "").trim();
  const packageId = String(filters.packageId ?? "").trim();
  const dateFrom = normalizeDateFilter(filters.dateFrom);
  const dateTo = normalizeDateFilter(filters.dateTo);

  return rows.filter((row) => {
    if (channel && row.channel !== channel) return false;
    if (type && row.type !== type) return false;
    if (paymentStatus && row.paymentStatus !== paymentStatus) return false;
    if (packageId && row.channel === "PARENT" && row.packageId !== packageId) return false;
    const rowDate = normalizeDateFilter(row.issueDate);
    if (dateFrom && rowDate && rowDate < dateFrom) return false;
    if (dateTo && rowDate && rowDate > dateTo) return false;
    return includesQuery(
      [
        row.docNo,
        row.partyLabel,
        row.contextLabel,
        row.channel,
        row.type,
        row.issueDate,
        row.packageId,
        row.paymentStatus,
      ],
      q,
    );
  });
}

export async function listFinanceDocumentRows() {
  const [parentAll, partnerAll, roleCfg] = await Promise.all([
    listAllParentBilling(),
    listPartnerBilling(),
    getApprovalRoleConfig(),
  ]);

  const packageIds = Array.from(
    new Set(
      [...parentAll.invoices.map((x) => x.packageId), ...parentAll.receipts.map((x) => x.packageId)].filter(Boolean),
    ),
  );
  const packages = packageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIds } },
        include: { student: true, course: true },
      })
    : [];
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg] as const));

  const [parentApprovalMap, partnerApprovalMap] = await Promise.all([
    getParentReceiptApprovalMap(parentAll.receipts.map((x) => x.id)),
    getPartnerReceiptApprovalMap(partnerAll.receipts.map((x) => x.id)),
  ]);

  const parentReceiptsByInvoice = new Map<string, typeof parentAll.receipts>();
  for (const receipt of parentAll.receipts) {
    if (!receipt.invoiceId) continue;
    const bucket = parentReceiptsByInvoice.get(receipt.invoiceId) ?? [];
    bucket.push(receipt);
    parentReceiptsByInvoice.set(receipt.invoiceId, bucket);
  }

  const partnerReceiptsByInvoice = new Map<string, typeof partnerAll.receipts>();
  for (const receipt of partnerAll.receipts) {
    const bucket = partnerReceiptsByInvoice.get(receipt.invoiceId) ?? [];
    bucket.push(receipt);
    partnerReceiptsByInvoice.set(receipt.invoiceId, bucket);
  }

  const rows: FinanceDocumentRow[] = [];

  for (const invoice of parentAll.invoices) {
    const pkg = packageMap.get(invoice.packageId);
    const receipts = parentReceiptsByInvoice.get(invoice.id) ?? [];
    let approvedTotal = 0;
    let pendingTotal = 0;
    let rejectedTotal = 0;
    for (const receipt of receipts) {
      const approval = parentApprovalMap.get(receipt.id);
      const status = getReceiptApprovalStatus(approval, roleCfg);
      const amount = normalizeAmount(receipt.amountReceived);
      if (status === "COMPLETED") approvedTotal += amount;
      else if (status === "REJECTED") rejectedTotal += amount;
      else pendingTotal += amount;
    }
    const totalAmount = roundMoney(normalizeAmount(invoice.totalAmount));
    const receiptedAmount = roundMoney(approvedTotal);
    rows.push({
      id: invoice.id,
      channel: "PARENT",
      type: "INVOICE",
      docNo: invoice.invoiceNo,
      issueDate: invoice.issueDate,
      packageId: invoice.packageId,
      partyLabel: invoice.billTo || pkg?.student.name || "-",
      contextLabel: pkg ? `${pkg.student.name} · ${pkg.course.name}` : invoice.packageId,
      amount: totalAmount,
      receiptedAmount,
      pendingReceiptAmount: roundMoney(pendingTotal),
      rejectedReceiptAmount: roundMoney(rejectedTotal),
      remainingAmount: roundMoney(Math.max(0, totalAmount - receiptedAmount)),
      receiptCount: receipts.length,
      paymentStatus: resolveInvoicePaymentStatus({
        invoiceTotal: totalAmount,
        approvedReceiptTotal: receiptedAmount,
        pendingReceiptTotal: pendingTotal,
        rejectedReceiptTotal: rejectedTotal,
      }),
      exportHref: `/api/exports/parent-invoice/${encodeURIComponent(invoice.id)}`,
      openHref: `/admin/packages/${encodeURIComponent(invoice.packageId)}/billing#invoices`,
      exportReady: true,
    });
  }

  for (const receipt of parentAll.receipts) {
    const pkg = packageMap.get(receipt.packageId);
    const approval = parentApprovalMap.get(receipt.id);
    const approvalStatus = getReceiptApprovalStatus(approval, roleCfg);
    const exportReady = isReceiptFinanceApproved(approval, roleCfg);
    const amountReceived = roundMoney(normalizeAmount(receipt.amountReceived));
    rows.push({
      id: receipt.id,
      channel: "PARENT",
      type: "RECEIPT",
      docNo: receipt.receiptNo,
      issueDate: receipt.receiptDate,
      packageId: receipt.packageId,
      partyLabel: receipt.receivedFrom || pkg?.student.name || "-",
      contextLabel: pkg ? `${pkg.student.name} · ${pkg.course.name}` : receipt.packageId,
      amount: amountReceived,
      receiptedAmount: exportReady ? amountReceived : 0,
      pendingReceiptAmount: approvalStatus === "PENDING" ? amountReceived : 0,
      rejectedReceiptAmount: approvalStatus === "REJECTED" ? amountReceived : 0,
      remainingAmount: 0,
      receiptCount: 1,
      paymentStatus: approvalStatus === "COMPLETED" ? "PAID" : approvalStatus === "REJECTED" ? "REJECTED" : "PENDING_APPROVAL",
      exportHref: exportReady ? `/api/exports/parent-receipt/${encodeURIComponent(receipt.id)}` : null,
      openHref: `/admin/packages/${encodeURIComponent(receipt.packageId)}/billing#receipts`,
      exportReady,
    });
  }

  for (const invoice of partnerAll.invoices) {
    const receipts = partnerReceiptsByInvoice.get(invoice.id) ?? [];
    let approvedTotal = 0;
    let pendingTotal = 0;
    let rejectedTotal = 0;
    for (const receipt of receipts) {
      const approval = partnerApprovalMap.get(receipt.id);
      const status = getReceiptApprovalStatus(approval, roleCfg);
      const amount = normalizeAmount(receipt.amountReceived);
      if (status === "COMPLETED") approvedTotal += amount;
      else if (status === "REJECTED") rejectedTotal += amount;
      else pendingTotal += amount;
    }
    const totalAmount = roundMoney(normalizeAmount(invoice.totalAmount));
    const receiptedAmount = roundMoney(approvedTotal);
    rows.push({
      id: invoice.id,
      channel: "PARTNER",
      type: "INVOICE",
      docNo: invoice.invoiceNo,
      issueDate: invoice.issueDate,
      packageId: "",
      partyLabel: invoice.billTo || invoice.partnerName,
      contextLabel: `${invoice.partnerName} · ${invoice.mode}${invoice.monthKey ? ` · ${invoice.monthKey}` : ""}`,
      amount: totalAmount,
      receiptedAmount,
      pendingReceiptAmount: roundMoney(pendingTotal),
      rejectedReceiptAmount: roundMoney(rejectedTotal),
      remainingAmount: roundMoney(Math.max(0, totalAmount - receiptedAmount)),
      receiptCount: receipts.length,
      paymentStatus: resolveInvoicePaymentStatus({
        invoiceTotal: totalAmount,
        approvedReceiptTotal: receiptedAmount,
        pendingReceiptTotal: pendingTotal,
        rejectedReceiptTotal: rejectedTotal,
      }),
      exportHref: `/api/exports/partner-invoice/${encodeURIComponent(invoice.id)}`,
      openHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(invoice.mode)}${invoice.monthKey ? `&month=${encodeURIComponent(invoice.monthKey)}` : ""}&tab=invoices`,
      exportReady: true,
    });
  }

  for (const receipt of partnerAll.receipts) {
    const approval = partnerApprovalMap.get(receipt.id);
    const approvalStatus = getReceiptApprovalStatus(approval, roleCfg);
    const exportReady = isReceiptFinanceApproved(approval, roleCfg);
    const amountReceived = roundMoney(normalizeAmount(receipt.amountReceived));
    rows.push({
      id: receipt.id,
      channel: "PARTNER",
      type: "RECEIPT",
      docNo: receipt.receiptNo,
      issueDate: receipt.receiptDate,
      packageId: "",
      partyLabel: receipt.receivedFrom || "-",
      contextLabel: `${receipt.mode}${receipt.monthKey ? ` · ${receipt.monthKey}` : ""}`,
      amount: amountReceived,
      receiptedAmount: exportReady ? amountReceived : 0,
      pendingReceiptAmount: approvalStatus === "PENDING" ? amountReceived : 0,
      rejectedReceiptAmount: approvalStatus === "REJECTED" ? amountReceived : 0,
      remainingAmount: 0,
      receiptCount: 1,
      paymentStatus: approvalStatus === "COMPLETED" ? "PAID" : approvalStatus === "REJECTED" ? "REJECTED" : "PENDING_APPROVAL",
      exportHref: exportReady ? `/api/exports/partner-receipt/${encodeURIComponent(receipt.id)}` : null,
      openHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(receipt.mode)}${receipt.monthKey ? `&month=${encodeURIComponent(receipt.monthKey)}` : ""}&tab=receipts`,
      exportReady,
    });
  }

  return rows.sort((a, b) => {
    const dateCmp = String(b.issueDate).localeCompare(String(a.issueDate));
    if (dateCmp !== 0) return dateCmp;
    return b.docNo.localeCompare(a.docNo);
  });
}

export async function listFilteredFinanceDocumentRows(filters: FinanceDocumentFilters = {}) {
  return filterFinanceDocumentRows(await listFinanceDocumentRows(), filters);
}

export function financeDocumentGeneratedAt() {
  return formatBusinessDateTime(new Date());
}
