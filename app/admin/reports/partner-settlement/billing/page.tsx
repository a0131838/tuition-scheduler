import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile, storeBusinessUpload } from "@/lib/business-file-storage";
import {
  addPartnerPaymentRecord,
  buildPartnerReceiptNoForInvoice,
  createPartnerInvoice,
  createPartnerReceipt,
  deletePartnerInvoice,
  deletePartnerPaymentRecord,
  deletePartnerReceipt,
  getPartnerBilledSettlementIdSet,
  getPartnerInvoiceById,
  listPartnerBillingByMode,
  replacePartnerPaymentRecord,
  type PartnerBillingMode,
} from "@/lib/partner-billing";
import {
  assertGlobalInvoiceNoAvailable,
  getNextGlobalInvoiceNo,
  parseInvoiceNoParts,
  resequenceGlobalInvoiceNumbersForMonth,
} from "@/lib/global-invoice-sequence";
import {
  deletePartnerReceiptApproval,
  getPartnerReceiptApprovalMap,
} from "@/lib/partner-receipt-approval";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { formatBusinessDateOnly, formatBusinessDateTime, formatDateOnly, normalizeDateOnly } from "@/lib/date-only";

const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";
const PARTNER_SOURCE_NAME = "新东方学生";
const PARTNER_CUSTOMER_NAME = "北京新东方前途出国咨询有限公司";

type Mode = PartnerBillingMode;
type BillingTab = "invoice" | "payments" | "receipt" | "invoices" | "receipts";

function canFinanceOperate(email: string, role: string) {
  const e = String(email ?? "").trim().toLowerCase();
  return role === "FINANCE" || e === SUPER_ADMIN_EMAIL;
}

function parseMode(v: string | null | undefined): Mode {
  return v === "OFFLINE_MONTHLY" ? "OFFLINE_MONTHLY" : "ONLINE_PACKAGE_END";
}

function parseBillingTab(v: string | null | undefined): BillingTab | null {
  const x = String(v ?? "").trim();
  if (x === "invoice" || x === "payments" || x === "receipt" || x === "invoices" || x === "receipts") return x;
  return null;
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

const primaryBtn = {
  border: "1px solid #93c5fd",
  background: "#eff6ff",
  color: "#1e3a8a",
  borderRadius: 8,
  padding: "4px 10px",
  fontWeight: 700,
};
const dangerBtn = {
  border: "1px solid #fecdd3",
  background: "#fff1f2",
  color: "#9f1239",
  borderRadius: 8,
  padding: "4px 10px",
  fontWeight: 700,
};
const thCell = { position: "sticky", top: 0, background: "#f3f4f6", zIndex: 1 } as const;
const completedPill = { color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 999, padding: "2px 8px", fontWeight: 700, display: "inline-block" };
const pendingPill = { color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 999, padding: "2px 8px", fontWeight: 700, display: "inline-block" };

function withQuery(base: string, mode: Mode, month: string, tab?: BillingTab | null) {
  const q = `mode=${encodeURIComponent(mode)}&month=${encodeURIComponent(month)}${tab ? `&tab=${encodeURIComponent(tab)}` : ""}`;
  return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
}

function isNextRedirectError(err: unknown) {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function parseManualItems(raw: string) {
  const rows = String(raw ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const out: Array<{ description: string; amount: number }> = [];
  for (const row of rows) {
    const [descPart, amountPart] = row.split("|");
    const description = String(descPart ?? "").trim();
    const amount = Number(String(amountPart ?? "").trim());
    if (!description || !Number.isFinite(amount)) continue;
    out.push({ description, amount });
  }
  return out;
}
async function createPartnerInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());

  const source = await prisma.studentSourceChannel.findFirst({ where: { name: PARTNER_SOURCE_NAME }, select: { id: true } });
  if (!source) redirect(withQuery("/admin/reports/partner-settlement/billing?err=source-not-found", mode, month));

  const [billedSet, settlementRows] = await Promise.all([
    getPartnerBilledSettlementIdSet(),
    prisma.partnerSettlement.findMany({
      where: {
        mode,
        status: "PENDING",
        ...(mode === "OFFLINE_MONTHLY" ? { monthKey: month } : {}),
        student: { sourceChannelId: source.id },
      },
      include: { student: { select: { name: true } }, package: { include: { course: { select: { name: true } } } } },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);
  const candidates = settlementRows.filter((x) => !billedSet.has(x.id));
  const candidatesAmount = candidates.reduce((a, b) => a + Number(b.amount || 0), 0);
  const manualItems = parseManualItems(String(formData.get("manualItems") ?? ""));
  if (candidates.length === 0 && manualItems.length === 0) {
    redirect(withQuery("/admin/reports/partner-settlement/billing?err=no-settlement-items", mode, month));
  }

  const issueDate = normalizeDateOnly(String(formData.get("issueDate") ?? "").trim(), new Date()) ?? formatDateOnly(new Date());
  const invoiceNoInput = String(formData.get("invoiceNo") ?? "").trim();
  const invoiceNo = invoiceNoInput || (await getNextGlobalInvoiceNo(issueDate));
  try {
    await assertGlobalInvoiceNoAvailable(invoiceNo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invoice No. already exists";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }

  const settlementLines = candidates.map((r) => {
    const hours = Number(r.hours ?? 0);
    const normalizedHours = Number.isFinite(hours) && hours > 0 ? Number(hours.toFixed(2)) : 1;
    const totalAmount = Number(r.amount || 0);
    const qtyBy45 = Number((((normalizedHours * 60) / 45) || 0).toFixed(2));
    const normalizedQtyBy45 = Number.isFinite(qtyBy45) && qtyBy45 > 0 ? qtyBy45 : 1;
    const hourlyUnitPrice = normalizedHours > 0 ? Number((totalAmount / normalizedHours).toFixed(2)) : totalAmount;
    const per45UnitPrice = normalizedQtyBy45 > 0 ? Number((totalAmount / normalizedQtyBy45).toFixed(2)) : totalAmount;
    return {
    type: "SETTLEMENT" as const,
    settlementId: r.id,
    description:
      mode === "ONLINE_PACKAGE_END"
        ? `Package settlement - ${r.student?.name ?? "-"} - ${r.package?.course?.name ?? "-"} (${String(r.packageId).slice(0, 8)})`
        : `${r.student?.name ?? "-"}`,
    quantity: mode === "ONLINE_PACKAGE_END" ? normalizedQtyBy45 : normalizedHours,
    amount: mode === "ONLINE_PACKAGE_END" ? per45UnitPrice : hourlyUnitPrice,
    gstAmount: 0,
    totalAmount,
  };
  });
  const manualLines = manualItems.map((m) => ({ type: "MANUAL" as const, settlementId: null, description: m.description, quantity: 1, amount: m.amount, gstAmount: 0, totalAmount: m.amount }));
  const monthNo = Number(String(month).split("-")[1] || "0");
  const offlineSummaryDesc = `星辅优学${monthNo || month}月线下一对一产品服务费`;
  const offlineSummaryLine = {
    type: "SETTLEMENT" as const,
    settlementId: null,
    description: offlineSummaryDesc,
    quantity: 1,
    amount: Number(candidatesAmount.toFixed(2)),
    gstAmount: 0,
    totalAmount: Number(candidatesAmount.toFixed(2)),
  };
  const linesToCreate =
    mode === "OFFLINE_MONTHLY"
      ? [offlineSummaryLine, ...manualLines]
      : [...settlementLines, ...manualLines];

  try {
    const invoice = await createPartnerInvoice({
      partnerName: PARTNER_SOURCE_NAME,
      mode,
      monthKey: mode === "OFFLINE_MONTHLY" ? month : null,
      settlementIds: candidates.map((x) => x.id),
      invoiceNo,
      issueDate,
      dueDate: normalizeDateOnly(String(formData.get("dueDate") ?? "").trim(), new Date()) ?? issueDate,
      billTo: String(formData.get("billTo") ?? "").trim() || PARTNER_CUSTOMER_NAME,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim() || "Immediate",
      description: String(formData.get("description") ?? "").trim() || (mode === "OFFLINE_MONTHLY" ? offlineSummaryDesc : `Partner settlement Online batch`),
      lines: linesToCreate,
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
    if (invoice.settlementIds.length > 0) {
      await prisma.partnerSettlement.updateMany({ where: { id: { in: invoice.settlementIds } }, data: { status: "INVOICED" } });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create invoice failed";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }

  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=invoice-created", mode, month));
}

async function uploadPaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) redirect("/admin/reports/partner-settlement/billing?err=only-finance");
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());

  const file = formData.get("paymentProof");
  if (!(file instanceof File) || !file.size) redirect(withQuery("/admin/reports/partner-settlement/billing?err=choose-file", mode, month));
  if (file.size > 10 * 1024 * 1024) redirect(withQuery("/admin/reports/partner-settlement/billing?err=file-too-large", mode, month));

  const dirKey = mode === "OFFLINE_MONTHLY" ? `${mode}_${month}` : mode;
  const stored = await storeBusinessUpload(file, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.partnerPaymentProofs,
    subdirSegments: [dirKey],
    maxBytes: 10 * 1024 * 1024,
    fallbackOriginalName: "payment-proof",
  });

  const paymentDate = String(formData.get("paymentDate") ?? "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim() || null;
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;
  const paymentNote = String(formData.get("paymentNote") ?? "").trim() || null;
  const replaceRecordId = String(formData.get("replacePaymentRecordId") ?? "").trim();

  if (replaceRecordId) {
    try {
      const { oldItem } = await replacePartnerPaymentRecord({
        recordId: replaceRecordId, mode, monthKey: mode === "OFFLINE_MONTHLY" ? month : null, paymentDate, paymentMethod, referenceNo,
        originalFileName: file.name || "payment-proof", storedFileName: stored.storedFileName, relativePath: stored.relativePath, note: paymentNote, uploadedBy: admin.email,
      });
      await deleteStoredBusinessFile(oldItem.relativePath, BUSINESS_UPLOAD_PREFIX.partnerPaymentProofs);
      redirect(withQuery("/admin/reports/partner-settlement/billing?msg=payment-replaced", mode, month));
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      await deleteStoredBusinessFile(stored.relativePath, BUSINESS_UPLOAD_PREFIX.partnerPaymentProofs);
      const msg = e instanceof Error ? e.message : "Replace payment record failed";
      redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
    }
  }

  await addPartnerPaymentRecord({
    mode, monthKey: mode === "OFFLINE_MONTHLY" ? month : null, paymentDate, paymentMethod, referenceNo,
    originalFileName: file.name || "payment-proof", storedFileName: stored.storedFileName, relativePath: stored.relativePath, note: paymentNote, uploadedBy: admin.email,
  });
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=payment-uploaded", mode, month));
}
async function createReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) redirect("/admin/reports/partner-settlement/billing?err=only-finance");
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) redirect(withQuery("/admin/reports/partner-settlement/billing?err=choose-invoice", mode, month));
  const linkedInvoice = await getPartnerInvoiceById(invoiceId);
  if (!linkedInvoice) redirect(withQuery("/admin/reports/partner-settlement/billing?err=invoice-not-found", mode, month));
  const receiptNoInput = String(formData.get("receiptNo") ?? "").trim();
  const receiptNo = receiptNoInput || (await buildPartnerReceiptNoForInvoice(invoiceId));
  const receivedFrom = String(formData.get("receivedFrom") ?? "").trim();
  const paidBy = String(formData.get("paidBy") ?? "").trim();
  if (!receivedFrom) redirect(withQuery("/admin/reports/partner-settlement/billing?err=received-from-required", mode, month));
  if (!paidBy) redirect(withQuery("/admin/reports/partner-settlement/billing?err=paid-by-required", mode, month));
  try {
    await createPartnerReceipt({
      invoiceId,
      paymentRecordId: String(formData.get("paymentRecordId") ?? "").trim() || null,
      receiptNo,
      receiptDate: normalizeDateOnly(String(formData.get("receiptDate") ?? "").trim(), new Date()) ?? formatDateOnly(new Date()),
      receivedFrom,
      paidBy,
      quantity: Math.max(1, Math.floor(parseNum(formData.get("quantity"), 1))),
      description: `For Invoice no. ${linkedInvoice.invoiceNo}`,
      amount: parseNum(formData.get("amount"), linkedInvoice.amount),
      gstAmount: parseNum(formData.get("gstAmount"), linkedInvoice.gstAmount),
      totalAmount: parseNum(formData.get("totalAmount"), linkedInvoice.totalAmount),
      amountReceived: parseNum(formData.get("amountReceived"), linkedInvoice.totalAmount),
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create receipt failed";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=receipt-created", mode, month));
}

async function deleteInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) redirect(withQuery("/admin/reports/partner-settlement/billing?err=missing-invoice", mode, month));
  const inv = await getPartnerInvoiceById(invoiceId);
  try {
    await deletePartnerInvoice({ invoiceId, actorEmail: admin.email });
    const mk = inv ? parseInvoiceNoParts(inv.invoiceNo)?.monthKey : null;
    if (mk) {
      await resequenceGlobalInvoiceNumbersForMonth(mk);
    }
    if (inv?.settlementIds?.length) {
      await prisma.partnerSettlement.updateMany({ where: { id: { in: inv.settlementIds } }, data: { status: "PENDING" } });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete invoice failed";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=invoice-deleted", mode, month));
}

async function deleteReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  if (!receiptId) redirect(withQuery("/admin/reports/partner-settlement/billing?err=missing-receipt", mode, month));
  try {
    await deletePartnerReceipt({ receiptId, actorEmail: admin.email });
    await deletePartnerReceiptApproval(receiptId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete receipt failed";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=receipt-deleted", mode, month));
}

async function deletePaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) redirect("/admin/reports/partner-settlement/billing?err=only-finance");
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const recordId = String(formData.get("recordId") ?? "").trim();
  if (!recordId) redirect(withQuery("/admin/reports/partner-settlement/billing?err=missing-payment-record", mode, month));
  try {
    const row = await deletePartnerPaymentRecord({ recordId, actorEmail: admin.email });
    await deleteStoredBusinessFile(row.relativePath, BUSINESS_UPLOAD_PREFIX.partnerPaymentProofs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete payment record failed";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=payment-record-deleted", mode, month));
}

export default async function PartnerBillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; month?: string; tab?: string; msg?: string; err?: string }>;
}) {
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const lang = await getLang();
  const sp = await searchParams;
  const mode = parseMode(sp?.mode ?? "ONLINE_PACKAGE_END");
  const month = String(sp?.month ?? monthKey(new Date())).trim();
  const requestedTab = parseBillingTab(sp?.tab ?? null);
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";
  const today = formatDateOnly(new Date());

  const source = await prisma.studentSourceChannel.findFirst({ where: { name: PARTNER_SOURCE_NAME }, select: { id: true, name: true } });
  if (!source) return <div style={{ color: "#b00" }}>Partner source not found: {PARTNER_SOURCE_NAME}</div>;

  const financeOpsEnabled = canFinanceOperate(current?.email ?? admin.email, current?.role ?? admin.role);
  const roleCfg = await getApprovalRoleConfig();
  const defaultTab: BillingTab = financeOpsEnabled ? "payments" : "receipts";
  const activeTab: BillingTab = requestedTab ?? defaultTab;
  const tabHref = (tab: BillingTab) =>
    `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(mode)}&month=${encodeURIComponent(month)}&tab=${encodeURIComponent(tab)}`;

  const [billedSet, settlementRows, billing] = await Promise.all([
    getPartnerBilledSettlementIdSet(),
    prisma.partnerSettlement.findMany({
      where: { mode, status: "PENDING", ...(mode === "OFFLINE_MONTHLY" ? { monthKey: month } : {}), student: { sourceChannelId: source.id } },
      include: { student: { select: { name: true } }, package: { include: { course: { select: { name: true } } } } },
      orderBy: [{ createdAt: "asc" }],
    }),
    listPartnerBillingByMode(mode, mode === "OFFLINE_MONTHLY" ? month : null),
  ]);
  const candidates = settlementRows.filter((x) => !billedSet.has(x.id));
  const candidatesAmount = candidates.reduce((a, b) => a + Number(b.amount || 0), 0);
  const defaultInvoiceNo = await getNextGlobalInvoiceNo(today);
  const usedInvoiceIds = new Set(billing.receipts.map((x) => x.invoiceId));
  const availableInvoices = billing.invoices.filter((x) => !usedInvoiceIds.has(x.id));
  const invoiceMap = new Map(billing.invoices.map((x) => [x.id, x]));
  const paymentRecordMap = new Map(billing.paymentRecords.map((x) => [x.id, x]));
  const approvalMap = await getPartnerReceiptApprovalMap(billing.receipts.map((x) => x.id));
  const cardStyle = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 14, background: "#fff" };
  const tabBtn = (tab: BillingTab, label: string) => (
    <a
      href={tabHref(tab)}
      style={{
        textDecoration: "none",
        border: "1px solid #cbd5e1",
        borderRadius: 999,
        padding: "6px 12px",
        fontWeight: 700,
        color: activeTab === tab ? "#1d4ed8" : "#334155",
        background: activeTab === tab ? "#eff6ff" : "#fff",
      }}
    >
      {label}
    </a>
  );

  return (
    <div>
      <h2>{t(lang, "Partner Settlement Billing", "合作方结算账单中心")}</h2>
      <div style={{ marginBottom: 10 }}><a href="/admin/reports/partner-settlement">{t(lang, "Back to Settlement Center", "返回合作方结算中心")}</a></div>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <div style={{ ...cardStyle, position: "sticky", top: 8, zIndex: 5 }}>
        <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label>{t(lang, "Mode", "模式")}<select name="mode" defaultValue={mode} style={{ marginLeft: 6 }}><option value="ONLINE_PACKAGE_END">{t(lang, "Online: Package End", "线上：课包结束")}</option><option value="OFFLINE_MONTHLY">{t(lang, "Offline: Monthly", "线下：按月")}</option></select></label>
          <label>{t(lang, "Month", "月份")}<input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} /></label>
          <input type="hidden" name="tab" value={activeTab} />
          <button type="submit" data-apply-submit="1" style={primaryBtn}>{t(lang, "Apply", "应用")}</button>
        </form>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {tabBtn("invoice", t(lang, "Create Invoice", "创建发票"))}
          {tabBtn("payments", t(lang, "Payment records", "付款记录"))}
          {tabBtn("receipt", t(lang, "Create Receipt", "创建收据"))}
          {tabBtn("invoices", t(lang, "Invoices", "发票"))}
          {tabBtn("receipts", t(lang, "Receipts and approvals", "收据与审批"))}
        </div>
      </div>

      <div style={{ ...cardStyle, background: "#f8fafc" }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Pending Settlement Items", "待结算项目")} ({mode === "ONLINE_PACKAGE_END" ? t(lang, "Online", "线上") : `${t(lang, "Offline", "线下")} ${month}`})</h3>
        <div style={{ color: "#374151" }}>{t(lang, "Items", "项目数")}: {candidates.length} | {t(lang, "Total", "合计")}: SGD {money(candidatesAmount)}</div>
      </div>

      {activeTab === "invoice" ? (
      <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{t(lang, "Create partner invoice batch", "创建合作方批量发票")}</h3>
      <form action={createPartnerInvoiceAction}>
        <input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          <label>{t(lang, "Invoice No.", "发票号")}<input name="invoiceNo" defaultValue={defaultInvoiceNo} style={{ width: "100%" }} /></label>
          <label>{t(lang, "Issue Date", "开票日期")}<input name="issueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>{t(lang, "Due Date", "到期日期")}<input name="dueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>{t(lang, "Payment Terms", "付款条款")}<input name="paymentTerms" defaultValue="Immediate" style={{ width: "100%" }} /></label>
          <label>{t(lang, "Bill To", "账单对象")}<input name="billTo" defaultValue={PARTNER_CUSTOMER_NAME} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 3" }}>{t(lang, "Description", "描述")}<input name="description" defaultValue={mode === "OFFLINE_MONTHLY" ? `星辅优学${Number(String(month).split("-")[1] || "0") || month}月线下一对一产品服务费` : "Partner settlement Online batch"} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 4" }}>
            {t(lang, "Manual extra items (one per line: description | amount)", "手动附加项目（每行一条：描述 | 金额）")}
            <textarea
              name="manualItems"
              rows={4}
              placeholder={"教材费|200\n交通补贴|150.50"}
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ gridColumn: "span 4" }}>{t(lang, "Note", "备注")}<input name="note" style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginTop: 8 }}><button type="submit" style={primaryBtn}>{t(lang, "Create Invoice (Batch)", "创建发票（批量）")}</button></div>
      </form>
      </div>
      ) : null}

      {activeTab === "payments" ? (
      <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{t(lang, "Payment records", "付款记录")}</h3>
      {financeOpsEnabled ? (
        <form action={uploadPaymentRecordAction} encType="multipart/form-data" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            <label>{t(lang, "Payment proof file", "付款凭证文件")}<input name="paymentProof" type="file" required style={{ width: "100%" }} /></label>
            <label>{t(lang, "Payment Date", "付款日期")}<input name="paymentDate" type="date" style={{ width: "100%" }} /></label>
            <label>{t(lang, "Payment Method", "付款方式")}<select name="paymentMethod" defaultValue="" style={{ width: "100%" }}><option value="">{t(lang, "(optional)", "（可选）")}</option><option value="Paynow">Paynow</option><option value="Cash">Cash</option><option value="Bank transfer">{t(lang, "Bank transfer", "银行转账")}</option></select></label>
            <label>{t(lang, "Reference number", "参考号")}<input name="referenceNo" style={{ width: "100%" }} /></label>
            <label>{t(lang, "Replace existing record", "替换现有记录")}<select name="replacePaymentRecordId" defaultValue="" style={{ width: "100%" }}><option value="">{t(lang, "(new record)", "（新记录）")}</option>{billing.paymentRecords.map((r) => (<option key={r.id} value={r.id}>{formatBusinessDateOnly(new Date(r.uploadedAt))} - {r.originalFileName}</option>))}</select></label>
            <label style={{ gridColumn: "span 5" }}>{t(lang, "Note", "备注")}<input name="paymentNote" style={{ width: "100%" }} /></label>
          </div>
          <div style={{ marginTop: 8 }}><button type="submit" style={primaryBtn}>{t(lang, "Upload", "上传")}</button></div>
        </form>
      ) : <div style={{ color: "#92400e", marginBottom: 12 }}>{t(lang, "Only finance can manage payment records.", "仅财务可管理付款记录。")}</div>}
      {billing.paymentRecords.length === 0 ? (
        <div style={{ color: "#666", marginBottom: 12 }}>{t(lang, "No payment records yet.", "暂无付款记录。")}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12, minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left" style={thCell}>{t(lang, "Time", "时间")}</th>
              <th align="left" style={thCell}>{t(lang, "Payment Date", "付款日期")}</th>
              <th align="left" style={thCell}>{t(lang, "Method", "方式")}</th>
              <th align="left" style={thCell}>{t(lang, "Reference", "参考号")}</th>
              <th align="left" style={thCell}>{t(lang, "File", "文件")}</th>
              <th align="left" style={thCell}>{t(lang, "Note", "备注")}</th>
              <th align="left" style={thCell}>{t(lang, "Uploaded by", "上传人")}</th>
              <th align="left" style={thCell}>{t(lang, "Delete", "删除")}</th>
            </tr>
          </thead>
          <tbody>
            {billing.paymentRecords.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{formatBusinessDateTime(new Date(r.uploadedAt))}</td>
                <td>{r.paymentDate ? normalizeDateOnly(r.paymentDate) ?? "-" : "-"}</td>
                <td>{r.paymentMethod || "-"}</td>
                <td>{r.referenceNo || "-"}</td>
                <td>
                  <a href={r.relativePath} target="_blank" rel="noreferrer">
                    {r.originalFileName}
                  </a>
                </td>
                <td>{r.note || "-"}</td>
                <td>{r.uploadedBy}</td>
                <td>
                  <form action={deletePaymentRecordAction}>
                    <input type="hidden" name="mode" value={mode} />
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="recordId" value={r.id} />
                    <button type="submit" style={dangerBtn}>{t(lang, "Delete", "删除")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      </div>
      ) : null}

      {activeTab === "receipt" ? (
      <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{t(lang, "Create Receipt", "创建收据")}</h3>
      {financeOpsEnabled ? (
        <form action={createReceiptAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 0 }}>
          <input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
            <label>{t(lang, "Source Invoice", "来源发票")}<select name="invoiceId" defaultValue={availableInvoices[0]?.id ?? ""} required style={{ width: "100%" }}><option value="" disabled>{availableInvoices.length === 0 ? t(lang, "(No available invoice)", "（无可用发票）") : t(lang, "Select an invoice", "请选择发票")}</option>{availableInvoices.map((inv) => (<option key={inv.id} value={inv.id}>{inv.invoiceNo} / {money(inv.totalAmount)}</option>))}</select></label>
            <label>{t(lang, "Receipt number", "收据号")}<input name="receiptNo" placeholder={t(lang, "Leave blank to auto-generate: InvoiceNo-RC", "留空自动生成：InvoiceNo-RC")} style={{ width: "100%" }} /></label>
            <label>{t(lang, "Receipt Date", "收据日期")}<input name="receiptDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
            <label>{t(lang, "Received From", "收款对象")}<input name="receivedFrom" required style={{ width: "100%" }} /></label>
            <label>{t(lang, "Paid via", "付款方式")}<select name="paidBy" required defaultValue="Paynow" style={{ width: "100%" }}><option value="Paynow">Paynow</option><option value="Cash">Cash</option><option value="Bank transfer">{t(lang, "Bank transfer", "银行转账")}</option></select></label>
            <label>{t(lang, "Quantity", "数量")}<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
            <label>{t(lang, "Amount", "金额")}<input name="amount" type="number" step="0.01" defaultValue={availableInvoices[0]?.amount ?? 0} style={{ width: "100%" }} /></label>
            <label>{t(lang, "GST", "消费税")}<input name="gstAmount" type="number" step="0.01" defaultValue={availableInvoices[0]?.gstAmount ?? 0} style={{ width: "100%" }} /></label>
            <label>{t(lang, "Total", "合计")}<input name="totalAmount" type="number" step="0.01" defaultValue={availableInvoices[0]?.totalAmount ?? 0} style={{ width: "100%" }} /></label>
            <label>{t(lang, "Amount Received", "实收金额")}<input name="amountReceived" type="number" step="0.01" defaultValue={availableInvoices[0]?.totalAmount ?? 0} style={{ width: "100%" }} /></label>
            <label>{t(lang, "Payment Record", "付款记录")}<select name="paymentRecordId" defaultValue="" style={{ width: "100%" }}><option value="">{t(lang, "(none)", "（无）")}</option>{billing.paymentRecords.map((r) => (<option key={r.id} value={r.id}>{formatBusinessDateOnly(new Date(r.uploadedAt))} - {r.originalFileName}</option>))}</select></label>
            <label style={{ gridColumn: "span 4" }}>{t(lang, "Note", "备注")}<input name="note" style={{ width: "100%" }} /></label>
          </div>
          <div style={{ marginTop: 8 }}><button type="submit" style={primaryBtn} disabled={availableInvoices.length === 0}>{t(lang, "Create Receipt", "创建收据")}</button></div>
        </form>
      ) : <div style={{ color: "#92400e" }}>{t(lang, "Only finance can create receipts.", "仅财务可创建收据。")}</div>}
      </div>
      ) : null}

      {activeTab === "invoices" ? (
      <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{t(lang, "Partner Invoices", "合作方发票")}</h3>
      <div style={{ overflowX: "auto" }}>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16, minWidth: 980 }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th align="left" style={thCell}>{t(lang, "Invoice No.", "发票号")}</th>
            <th align="left" style={thCell}>{t(lang, "Issue", "开票日")}</th>
            <th align="left" style={thCell}>{t(lang, "Mode", "模式")}</th>
            <th align="left" style={thCell}>{t(lang, "Month", "月份")}</th>
            <th align="left" style={thCell}>{t(lang, "Total", "合计")}</th>
            <th align="left" style={thCell}>PDF</th>
            <th align="left" style={thCell}>{t(lang, "Settlement detail export", "结算明细导出")}</th>
            <th align="left" style={thCell}>{t(lang, "Delete", "删除")}</th>
          </tr>
        </thead>
        <tbody>
          {billing.invoices.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{r.invoiceNo}</td>
              <td>{normalizeDateOnly(r.issueDate) ?? "-"}</td>
              <td>{r.mode}</td>
              <td>{r.monthKey ?? "-"}</td>
              <td>{money(r.totalAmount)}</td>
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <a href={`/api/exports/partner-invoice/${encodeURIComponent(r.id)}`}>{t(lang, "Export PDF", "导出 PDF")}</a>
                  <a href={`/api/exports/partner-invoice/${encodeURIComponent(r.id)}?seal=1`}>PDF + Seal</a>
                </div>
              </td>
              <td>
                {r.mode === "OFFLINE_MONTHLY" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <a href={`/api/exports/partner-invoice-detail/${encodeURIComponent(r.id)}`}>{t(lang, "Export XLSX", "导出 XLSX")}</a>
                      <a href={`/api/exports/partner-invoice-detail/${encodeURIComponent(r.id)}?seal=1`}>XLSX + Seal</a>
                  </div>
                ) : (
                  <span style={{ color: "#9ca3af" }}>-</span>
                )}
              </td>
              <td>
                <form action={deleteInvoiceAction}>
                  <input type="hidden" name="mode" value={mode} />
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="invoiceId" value={r.id} />
                  <button type="submit" style={dangerBtn}>{t(lang, "Delete", "删除")}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>
      ) : null}

      {activeTab === "receipts" ? (
      <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>{t(lang, "Partner Receipts", "合作方收据")}</h3>
      <div style={{ marginBottom: 10 }}>
        <a href="/admin/receipts-approvals" style={{ fontWeight: 700 }}>
          {t(lang, "Open Receipt Approval Center", "打开收据审批中心")}
        </a>
      </div>
      <div style={{ overflowX: "auto" }}>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 1200 }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th align="left" style={thCell}>{t(lang, "Receipt No.", "收据号")}</th>
            <th align="left" style={thCell}>{t(lang, "Date", "日期")}</th>
            <th align="left" style={thCell}>{t(lang, "Invoice No.", "发票号")}</th>
            <th align="left" style={thCell}>{t(lang, "Payment Record", "付款记录")}</th>
            <th align="left" style={thCell}>{t(lang, "Amount", "金额")}</th>
            <th align="left" style={thCell}>{t(lang, "Manager", "管理")}</th>
            <th align="left" style={thCell}>{t(lang, "Finance", "财务")}</th>
            <th align="left" style={thCell}>{t(lang, "Actions", "操作")}</th>
            <th align="left" style={thCell}>PDF</th>
            <th align="left" style={thCell}>{t(lang, "Delete", "删除")}</th>
          </tr>
        </thead>
        <tbody>
          {billing.receipts.map((r) => {
            const inv = invoiceMap.get(r.invoiceId);
            const paymentRecord = r.paymentRecordId ? paymentRecordMap.get(r.paymentRecordId) : null;
            const approval = approvalMap.get(r.id) ?? { managerApprovedBy: [], financeApprovedBy: [] };
            const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
            const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
            const exportReady = managerReady && financeReady;
            return (
              <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{r.receiptNo}</td>
                <td>{normalizeDateOnly(r.receiptDate) ?? "-"}</td>
                <td>{inv?.invoiceNo ?? "-"}</td>
                <td>
                  {paymentRecord ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span>{formatBusinessDateOnly(new Date(paymentRecord.uploadedAt))}</span>
                      <a href={paymentRecord.relativePath} target="_blank" rel="noreferrer">
                        {paymentRecord.originalFileName}
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: "#6b7280" }}>{t(lang, "(none)", "（无）")}</span>
                  )}
                </td>
                <td>{money(r.amountReceived)}</td>
                <td>{`${approval.managerApprovedBy.length}/${roleCfg.managerApproverEmails.length}`}</td>
                <td>{`${approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`}</td>
                <td>
                  {exportReady ? <span style={completedPill}>{t(lang, "Completed", "已完成")}</span> : <span style={pendingPill}>{t(lang, "Go to Approval Center", "前往审批中心")}</span>}
                </td>
                <td>
                  {exportReady ? (
                    <a href={`/api/exports/partner-receipt/${encodeURIComponent(r.id)}`}>{t(lang, "Export PDF", "导出 PDF")}</a>
                  ) : (
                    <span style={pendingPill}>{t(lang, "Pending approval", "等待审批")}</span>
                  )}
                </td>
                <td>
                  <form action={deleteReceiptAction}>
                    <input type="hidden" name="mode" value={mode} />
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="receiptId" value={r.id} />
                    <button type="submit" style={dangerBtn}>{t(lang, "Delete", "删除")}</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      </div>
      ) : null}
    </div>
  );
}
