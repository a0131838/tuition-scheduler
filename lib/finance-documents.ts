import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { formatBusinessDateTime, normalizeDateOnly } from "@/lib/date-only";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import { listPartnerBilling } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";
import { getReceiptApprovalStatus, isReceiptFinanceApproved } from "@/lib/receipt-approval-policy";
import { listAllParentBilling } from "@/lib/student-parent-billing";

export type FinanceDocumentChannel = "PARENT" | "PARTNER";
export type FinanceDocumentType = "INVOICE" | "RECEIPT" | "CREDIT_NOTE";
export type FinanceDocumentPaymentStatus = "PAID" | "PARTIAL" | "UNPAID" | "PENDING_APPROVAL" | "REJECTED" | "CREDITED";
export type FinanceDocumentCreditNoteStatus = "ISSUED" | "VOID";

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
  creditAmount: number;
  adjustedAmount: number;
  receiptedAmount: number;
  pendingReceiptAmount: number;
  rejectedReceiptAmount: number;
  remainingAmount: number;
  receiptCount: number;
  paymentStatus: FinanceDocumentPaymentStatus;
  creditNoteStatus?: FinanceDocumentCreditNoteStatus | null;
  relatedDocumentNo?: string | null;
  exportHref: string | null;
  sealedExportHref?: string | null;
  openHref: string;
  exportReady: boolean;
  sourceLabel?: string | null;
  contractLinkLabel?: string | null;
};

function roundMoney(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function normalizeAmount(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeFinanceDocumentChannel(value: string | null | undefined): FinanceDocumentChannel | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "PARENT" || normalized === "PARTNER" ? normalized : "";
}

export function normalizeFinanceDocumentType(value: string | null | undefined): FinanceDocumentType | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "INVOICE" || normalized === "RECEIPT" || normalized === "CREDIT_NOTE" ? normalized : "";
}

export function normalizeFinanceDocumentPaymentStatus(
  value: string | null | undefined,
): FinanceDocumentPaymentStatus | "" {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "PAID" ||
    normalized === "PARTIAL" ||
    normalized === "UNPAID" ||
    normalized === "PENDING_APPROVAL" ||
    normalized === "REJECTED" ||
    normalized === "CREDITED"
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

export function resolveInvoiceAmountsAfterCredit(input: {
  invoiceTotal: number;
  issuedCreditTotal?: number;
  approvedReceiptTotal?: number;
}) {
  const originalAmount = roundMoney(Math.max(0, normalizeAmount(input.invoiceTotal)));
  const creditAmount = roundMoney(Math.min(originalAmount, Math.max(0, normalizeAmount(input.issuedCreditTotal))));
  const adjustedAmount = roundMoney(Math.max(0, originalAmount - creditAmount));
  const receiptedAmount = roundMoney(Math.max(0, normalizeAmount(input.approvedReceiptTotal)));
  return {
    originalAmount,
    creditAmount,
    adjustedAmount,
    receiptedAmount,
    remainingAmount: roundMoney(Math.max(0, adjustedAmount - receiptedAmount)),
  };
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
    if (paymentStatus && (row.type === "CREDIT_NOTE" || row.paymentStatus !== paymentStatus)) return false;
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
        row.creditNoteStatus,
        row.relatedDocumentNo,
      ],
      q,
    );
  });
}

export async function listFinanceDocumentRows() {
  const [parentAll, partnerAll, roleCfg, partnerCreditNotes] = await Promise.all([
    listAllParentBilling(),
    listPartnerBilling(),
    getApprovalRoleConfig(),
    prisma.creditNote.findMany({
      where: {
        sourceType: "PARTNER_INVOICE",
        status: { in: ["ISSUED", "VOID"] },
      },
      orderBy: [{ issueDate: "desc" }, { creditNoteNo: "desc" }],
    }),
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
  const parentInvoiceIds = parentAll.invoices.map((invoice) => invoice.id);
  const [parentContracts, parentSchoolApplications] = parentInvoiceIds.length
    ? await Promise.all([
        prisma.studentContract.findMany({
          where: {
            invoiceId: { in: parentInvoiceIds },
          },
          select: {
            id: true,
            invoiceId: true,
            flowType: true,
            status: true,
          },
        }),
        prisma.schoolApplicationService.findMany({
          where: {
            invoiceId: { in: parentInvoiceIds },
          },
          select: {
            id: true,
            invoiceId: true,
            status: true,
          },
        }),
      ])
    : [[], []];
  const parentContractsByInvoice = new Map<string, typeof parentContracts>();
  for (const contract of parentContracts) {
    if (!contract.invoiceId) continue;
    const bucket = parentContractsByInvoice.get(contract.invoiceId) ?? [];
    bucket.push(contract);
    parentContractsByInvoice.set(contract.invoiceId, bucket);
  }
  const parentSchoolApplicationsByInvoice = new Map<string, typeof parentSchoolApplications>();
  for (const application of parentSchoolApplications) {
    if (!application.invoiceId) continue;
    const bucket = parentSchoolApplicationsByInvoice.get(application.invoiceId) ?? [];
    bucket.push(application);
    parentSchoolApplicationsByInvoice.set(application.invoiceId, bucket);
  }

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

  const issuedCreditByPartnerInvoice = new Map<string, number>();
  for (const note of partnerCreditNotes) {
    if (note.status !== "ISSUED") continue;
    issuedCreditByPartnerInvoice.set(
      note.sourceInvoiceId,
      roundMoney((issuedCreditByPartnerInvoice.get(note.sourceInvoiceId) ?? 0) + normalizeAmount(note.totalAmount)),
    );
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
    const linkedContracts = parentContractsByInvoice.get(invoice.id) ?? [];
    const linkedSchoolApplications = parentSchoolApplicationsByInvoice.get(invoice.id) ?? [];
    const noteText = String(invoice.note ?? "");
    const sourceLabel = noteText.includes("school-application:")
      ? "Auto from school application"
      : noteText.includes("student-contract:")
      ? "Auto from contract"
      : "Manual invoice";
    const contractLinkLabel =
      linkedSchoolApplications.length > 0
        ? linkedSchoolApplications.length > 1
          ? "Linked to multiple school applications"
          : linkedSchoolApplications[0].status === "VOID"
          ? "Linked school application voided"
          : "Linked school application active"
        : linkedContracts.length === 0
        ? "No linked contract"
        : linkedContracts.length > 1
        ? "Linked to multiple contracts"
        : linkedContracts[0].status === "VOID"
        ? "Linked contract voided"
        : "Linked contract active";
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
      creditAmount: 0,
      adjustedAmount: totalAmount,
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
      sourceLabel,
      contractLinkLabel,
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
      creditAmount: 0,
      adjustedAmount: amountReceived,
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
    const amounts = resolveInvoiceAmountsAfterCredit({
      invoiceTotal: normalizeAmount(invoice.totalAmount),
      issuedCreditTotal: issuedCreditByPartnerInvoice.get(invoice.id),
      approvedReceiptTotal: approvedTotal,
    });
    rows.push({
      id: invoice.id,
      channel: "PARTNER",
      type: "INVOICE",
      docNo: invoice.invoiceNo,
      issueDate: invoice.issueDate,
      packageId: "",
      partyLabel: invoice.billTo || invoice.partnerName,
      contextLabel: `${invoice.partnerName} · ${invoice.mode}${invoice.monthKey ? ` · ${invoice.monthKey}` : ""}`,
      amount: amounts.originalAmount,
      creditAmount: amounts.creditAmount,
      adjustedAmount: amounts.adjustedAmount,
      receiptedAmount: amounts.receiptedAmount,
      pendingReceiptAmount: roundMoney(pendingTotal),
      rejectedReceiptAmount: roundMoney(rejectedTotal),
      remainingAmount: amounts.remainingAmount,
      receiptCount: receipts.length,
      paymentStatus:
        amounts.creditAmount > 0 && amounts.adjustedAmount <= 0.009
          ? "CREDITED"
          : resolveInvoicePaymentStatus({
              invoiceTotal: amounts.adjustedAmount,
              approvedReceiptTotal: amounts.receiptedAmount,
              pendingReceiptTotal: pendingTotal,
              rejectedReceiptTotal: rejectedTotal,
            }),
      exportHref: `/api/exports/partner-invoice/${encodeURIComponent(invoice.id)}`,
      openHref: `/admin/reports/partner-settlement/billing?${invoice.partnerId ? `partnerId=${encodeURIComponent(invoice.partnerId)}&` : ""}mode=${encodeURIComponent(invoice.mode)}${invoice.monthKey ? `&month=${encodeURIComponent(invoice.monthKey)}` : ""}&tab=invoices`,
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
      creditAmount: 0,
      adjustedAmount: amountReceived,
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

  const partnerInvoiceMap = new Map(partnerAll.invoices.map((invoice) => [invoice.id, invoice] as const));
  for (const note of partnerCreditNotes) {
    const invoice = partnerInvoiceMap.get(note.sourceInvoiceId);
    const mode = invoice?.mode ?? String((note.sourceInvoiceSnapshot as { mode?: unknown } | null)?.mode ?? "ONLINE_PACKAGE_END");
    const monthKey = invoice?.monthKey ?? String((note.sourceInvoiceSnapshot as { monthKey?: unknown } | null)?.monthKey ?? "");
    const partnerId = invoice?.partnerId ?? String((note.sourceInvoiceSnapshot as { partnerId?: unknown } | null)?.partnerId ?? "");
    const baseHref = `/admin/reports/partner-settlement/billing?${partnerId ? `partnerId=${encodeURIComponent(partnerId)}&` : ""}mode=${encodeURIComponent(mode)}${monthKey ? `&month=${encodeURIComponent(monthKey)}` : ""}`;
    const totalAmount = roundMoney(normalizeAmount(note.totalAmount));
    rows.push({
      id: note.id,
      channel: "PARTNER",
      type: "CREDIT_NOTE",
      docNo: note.creditNoteNo,
      issueDate: note.issueDate,
      packageId: "",
      partyLabel: note.customerName,
      contextLabel: `Original invoice / 原发票 ${note.sourceInvoiceNo}`,
      amount: totalAmount,
      creditAmount: totalAmount,
      adjustedAmount: 0,
      receiptedAmount: 0,
      pendingReceiptAmount: 0,
      rejectedReceiptAmount: 0,
      remainingAmount: 0,
      receiptCount: 0,
      paymentStatus: "UNPAID",
      creditNoteStatus: note.status === "ISSUED" ? "ISSUED" : "VOID",
      relatedDocumentNo: note.sourceInvoiceNo,
      exportHref: `/api/exports/partner-credit-note/${encodeURIComponent(note.id)}`,
      sealedExportHref: note.status === "ISSUED" ? `/api/exports/partner-credit-note/${encodeURIComponent(note.id)}?seal=1` : null,
      openHref: `${baseHref}&tab=credits&creditInvoiceId=${encodeURIComponent(note.sourceInvoiceId)}`,
      exportReady: true,
      sourceLabel: note.status === "ISSUED" ? "Issued credit note" : "Voided credit note",
      contractLinkLabel: `Linked to ${note.sourceInvoiceNo}`,
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
