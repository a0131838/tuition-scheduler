import { getReceiptApprovalStatus } from "./receipt-approval-policy";
import {
  salesMoneyCents,
  evaluateSalesReceipts,
  type RawRecord,
  parseSalesBilling,
  parseSalesApprovals,
} from "./sales-invoice-policy";
export type CustomerInvoiceRow = {
  id: string;
  channel: "PARENT" | "PARTNER";
  no: string;
  date: string;
  state: "VERIFIED" | "REVIEW";
  invoiceCents: number | null;
  approvedCents: number | null;
  outstandingCents: number | null;
  creditCents: number | null;
  pendingReceipts: number;
  rejectedReceipts: number;
  reason: string;
  href: string;
  renewal: boolean;
  studentId: string | null;
  packageId: string;
  receipts: Array<{
    no: string;
    date: string;
    amountCents: number | null;
    payer: string;
    status: string;
  }>;
};
export type CustomerFinanceContext = {
  billing: ReturnType<typeof parseSalesBilling>;
  approvals: ReturnType<typeof parseSalesApprovals>;
  financeApproverEmails: string[];
  packages: Array<{
    id: string;
    studentId: string;
    sharedStudentIds: string[];
  }>;
  credits: Array<{
    id: string;
    sourceInvoiceId: string;
    status: string;
    issuedAt: Date | null;
    voidedAt: Date | null;
    totalAmount: unknown;
    currency: string;
    sourceInvoiceNo: string;
    originalInvoiceTotal: unknown;
    amount: unknown;
    gstAmount: unknown;
  }>;
};
/** Customer payment facts, not sales attribution or commission. Unknown scope/amounts remain unknown. */
export function customerInvoice(
  invoice: RawRecord,
  channel: "PARENT" | "PARTNER",
  context: CustomerFinanceContext,
  scope: { studentIds: string[]; partnerId?: string },
  renewal = false,
): CustomerInvoiceRow {
  const id = typeof invoice.id === "string" ? invoice.id : "",
    no = typeof invoice.invoiceNo === "string" ? invoice.invoiceNo : "Unknown",
    date = typeof invoice.issueDate === "string" ? invoice.issueDate : "";
  const pkgId = typeof invoice.packageId === "string" ? invoice.packageId : "";
  const href =
    channel === "PARENT"
      ? "/admin/packages/" + encodeURIComponent(pkgId) + "/billing#invoices"
      : "/admin/reports/partner-settlement/billing?partnerId=" +
        encodeURIComponent(scope.partnerId ?? "") +
        "&tab=invoices";
  const row: CustomerInvoiceRow = {
    id,
    channel,
    no,
    date,
    state: "REVIEW",
    invoiceCents: null,
    approvedCents: null,
    outstandingCents: null,
    creditCents: null,
    pendingReceipts: 0,
    rejectedReceipts: 0,
    reason: "Billing evidence needs review / 账务凭据待核对",
    href,
    renewal,
    studentId: typeof invoice.studentId === "string" ? invoice.studentId : null,
    packageId: pkgId,
    receipts: [],
  };
  if (
    !context.billing.valid ||
    !context.approvals.valid ||
    !id ||
    context.billing.invoices.filter((i) => i.id === id).length !== 1 ||
    context.billing.deleted.some((d) => d.invoiceId === id)
  )
    return row;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    row.reason = "Invoice date is missing / 发票日期待核对";
    return row;
  }
  if (channel === "PARENT") {
    const pkg = context.packages.find((p) => p.id === pkgId);
    if (
      typeof invoice.studentId !== "string" ||
      !scope.studentIds.includes(invoice.studentId) ||
      !pkg ||
      ![pkg.studentId, ...pkg.sharedStudentIds].includes(invoice.studentId)
    ) {
      row.reason =
        "Exact student/package ownership needs review / 学生或课包归属待核对";
      return row;
    }
  } else if (
    !scope.partnerId ||
    invoice.partnerId !== scope.partnerId ||
    !["ONLINE_PACKAGE_END", "OFFLINE_MONTHLY"].includes(String(invoice.mode))
  ) {
    row.reason = "Exact partner identity needs review / 合作方身份待核对";
    return row;
  }
  if (invoice.currency != null && invoice.currency !== "SGD") return row;
  const amount = salesMoneyCents(invoice.amount),
    gst = salesMoneyCents(invoice.gstAmount),
    total = salesMoneyCents(invoice.totalAmount);
  if (
    amount === null ||
    gst === null ||
    total === null ||
    amount + gst !== total
  ) {
    row.reason = "Invoice totals are inconsistent / 发票金额不一致，待核对";
    return row;
  }
  let credit = 0;
  for (const c of context.credits.filter(
    (c) => c.sourceInvoiceId === id && c.status === "ISSUED",
  )) {
    const value = salesMoneyCents(c.totalAmount);
    if (
      value === null ||
      !c.issuedAt ||
      c.voidedAt ||
      c.currency !== "SGD" ||
      c.sourceInvoiceNo !== no ||
      salesMoneyCents(c.originalInvoiceTotal) !== total ||
      salesMoneyCents(c.amount) === null ||
      salesMoneyCents(c.gstAmount) === null ||
      salesMoneyCents(c.amount)! + salesMoneyCents(c.gstAmount)! !== value ||
      context.credits.filter((other) => other.id === c.id).length !== 1
    ) {
      row.reason = "Credit note needs review / 贷项凭据待核对";
      return row;
    }
    credit += value;
  }
  if (credit > total || !Number.isSafeInteger(credit)) return row;
  const receipts = evaluateSalesReceipts(id, context, (r) =>
    channel === "PARENT"
      ? r.studentId === invoice.studentId && r.packageId === invoice.packageId
      : r.partnerId === invoice.partnerId && r.mode === invoice.mode,
  );
  if ("error" in receipts) {
    row.reason = receipts.error.en + " / " + receipts.error.zh;
    return row;
  }
  row.state = "VERIFIED";
  row.invoiceCents = total;
  row.approvedCents = receipts.approvedCents;
  row.creditCents = credit;
  row.outstandingCents = Math.max(0, total - credit - receipts.approvedCents);
  row.pendingReceipts = receipts.pendingReceipts;
  row.rejectedReceipts = receipts.rejectedReceipts;
  row.reason =
    "Approved receipts; credit notes are not proof of refunds / 按审批收据统计，贷项不代表已退款";
  row.receipts = context.billing.receipts
    .filter((r) => r.invoiceId === id)
    .map((r) => ({
      no: typeof r.receiptNo === "string" ? r.receiptNo : "",
      date: typeof r.receiptDate === "string" ? r.receiptDate : "",
      amountCents: salesMoneyCents(r.amountReceived),
      payer:
        typeof r.paidBy === "string"
          ? r.paidBy
          : typeof r.receivedFrom === "string"
            ? r.receivedFrom
            : "",
      status: (() => {
        const a = context.approvals.items.find((a) => a.receiptId === r.id);
        return a && (a.financeRejectedAt || a.managerRejectedAt)
          ? "REJECTED"
          : getReceiptApprovalStatus(a as any, context);
      })(),
    }));
  return row;
}
export function summarizeCustomerInvoices(rows: CustomerInvoiceRow[]) {
  const unique = [
    ...new Map(rows.map((r) => [r.channel + ":" + r.id, r])).values(),
  ];
  const valid = unique.filter((r) => r.state === "VERIFIED");
  return {
    invoiceCents: valid.length
      ? valid.reduce((a, r) => a + r.invoiceCents!, 0)
      : null,
    approvedCents: valid.length
      ? valid.reduce((a, r) => a + r.approvedCents!, 0)
      : null,
    outstandingCents: valid.length
      ? valid.reduce((a, r) => a + r.outstandingCents!, 0)
      : null,
    reviewCount: unique.filter((r) => r.state === "REVIEW").length,
    verifiedCount: valid.length,
  };
}
