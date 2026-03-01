import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import path from "path";
import { mkdir, unlink, writeFile } from "fs/promises";
import crypto from "crypto";
import {
  addPartnerPaymentRecord,
  buildPartnerReceiptNoForInvoice,
  createPartnerInvoice,
  createPartnerReceipt,
  deletePartnerInvoice,
  deletePartnerPaymentRecord,
  deletePartnerReceipt,
  getNextPartnerInvoiceNo,
  getPartnerBilledSettlementIdSet,
  getPartnerInvoiceById,
  listPartnerBillingByMode,
  replacePartnerPaymentRecord,
  type PartnerBillingMode,
} from "@/lib/partner-billing";
import {
  deletePartnerReceiptApproval,
  financeApprovePartnerReceipt,
  financeRejectPartnerReceipt,
  getPartnerReceiptApprovalMap,
  managerApprovePartnerReceipt,
  managerRejectPartnerReceipt,
} from "@/lib/partner-receipt-approval";
import { areAllApproversConfirmed, getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";

const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";
const PARTNER_SOURCE_NAME = "新东方学生";
const PARTNER_CUSTOMER_NAME = "北京新东方前途出国咨询有限公司";

type Mode = PartnerBillingMode;

function canFinanceOperate(email: string, role: string) {
  const e = String(email ?? "").trim().toLowerCase();
  return role === "FINANCE" || e === SUPER_ADMIN_EMAIL;
}

function parseMode(v: string | null | undefined): Mode {
  return v === "OFFLINE_MONTHLY" ? "OFFLINE_MONTHLY" : "ONLINE_PACKAGE_END";
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function withQuery(base: string, mode: Mode, month: string) {
  const q = `mode=${encodeURIComponent(mode)}&month=${encodeURIComponent(month)}`;
  return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
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
  const manualItems = parseManualItems(String(formData.get("manualItems") ?? ""));
  if (candidates.length === 0 && manualItems.length === 0) {
    redirect(withQuery("/admin/reports/partner-settlement/billing?err=no-settlement-items", mode, month));
  }

  const issueDate = String(formData.get("issueDate") ?? "").trim() || ymd(new Date());
  const invoiceNoInput = String(formData.get("invoiceNo") ?? "").trim();
  const invoiceNo = invoiceNoInput || (await getNextPartnerInvoiceNo(issueDate));

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
    description: mode === "ONLINE_PACKAGE_END"
      ? `${r.student?.name ?? "-"}`
      : `${r.student?.name ?? "-"}`,
    quantity: mode === "ONLINE_PACKAGE_END" ? normalizedQtyBy45 : normalizedHours,
    amount: mode === "ONLINE_PACKAGE_END" ? per45UnitPrice : hourlyUnitPrice,
    gstAmount: 0,
    totalAmount,
  };
  });
  const manualLines = manualItems.map((m) => ({ type: "MANUAL" as const, settlementId: null, description: m.description, quantity: 1, amount: m.amount, gstAmount: 0, totalAmount: m.amount }));

  try {
    const invoice = await createPartnerInvoice({
      partnerName: PARTNER_SOURCE_NAME,
      mode,
      monthKey: mode === "OFFLINE_MONTHLY" ? month : null,
      settlementIds: candidates.map((x) => x.id),
      invoiceNo,
      issueDate,
      dueDate: String(formData.get("dueDate") ?? "").trim() || issueDate,
      billTo: String(formData.get("billTo") ?? "").trim() || PARTNER_CUSTOMER_NAME,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim() || "Immediate",
      description: String(formData.get("description") ?? "").trim() || `Partner settlement ${mode === "ONLINE_PACKAGE_END" ? "Online batch" : `Offline monthly ${month}`}`,
      lines: [...settlementLines, ...manualLines],
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

  const ext = path.extname(file.name || "").slice(0, 10) || ".bin";
  const safeExt = /^[.a-zA-Z0-9]+$/.test(ext) ? ext : ".bin";
  const storeName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${safeExt}`;
  const dirKey = mode === "OFFLINE_MONTHLY" ? `${mode}_${month}` : mode;
  const relDir = path.join("uploads", "partner-payment-proofs", dirKey);
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, storeName);
  await writeFile(absPath, Buffer.from(await file.arrayBuffer()));
  const relPath = `/${path.posix.join("uploads", "partner-payment-proofs", dirKey, storeName)}`;

  const paymentDate = String(formData.get("paymentDate") ?? "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim() || null;
  const referenceNo = String(formData.get("referenceNo") ?? "").trim() || null;
  const paymentNote = String(formData.get("paymentNote") ?? "").trim() || null;
  const replaceRecordId = String(formData.get("replacePaymentRecordId") ?? "").trim();

  if (replaceRecordId) {
    try {
      const { oldItem } = await replacePartnerPaymentRecord({
        recordId: replaceRecordId, mode, monthKey: mode === "OFFLINE_MONTHLY" ? month : null, paymentDate, paymentMethod, referenceNo,
        originalFileName: file.name || "payment-proof", storedFileName: storeName, relativePath: relPath, note: paymentNote, uploadedBy: admin.email,
      });
      if (oldItem.relativePath?.startsWith("/")) {
        const oldAbsPath = path.join(process.cwd(), "public", oldItem.relativePath.replace(/^\//, "").replace(/\//g, path.sep));
        await unlink(oldAbsPath).catch(() => {});
      }
      redirect(withQuery("/admin/reports/partner-settlement/billing?msg=payment-replaced", mode, month));
    } catch (e) {
      await unlink(absPath).catch(() => {});
      const msg = e instanceof Error ? e.message : "Replace payment record failed";
      redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
    }
  }

  await addPartnerPaymentRecord({
    mode, monthKey: mode === "OFFLINE_MONTHLY" ? month : null, paymentDate, paymentMethod, referenceNo,
    originalFileName: file.name || "payment-proof", storedFileName: storeName, relativePath: relPath, note: paymentNote, uploadedBy: admin.email,
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
      receiptDate: String(formData.get("receiptDate") ?? "").trim() || new Date().toISOString(),
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
    if (row.relativePath?.startsWith("/")) {
      const absPath = path.join(process.cwd(), "public", row.relativePath.replace(/^\//, "").replace(/\//g, path.sep));
      await unlink(absPath).catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete payment record failed";
    redirect(withQuery(`/admin/reports/partner-settlement/billing?err=${encodeURIComponent(msg)}`, mode, month));
  }
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=payment-record-deleted", mode, month));
}

async function managerApproveReceiptAction(formData: FormData) { "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(admin.email, cfg.managerApproverEmails)) redirect(withQuery("/admin/reports/partner-settlement/billing?err=not-allowed", mode, month));
  await managerApprovePartnerReceipt(receiptId, admin.email);
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=manager-approved", mode, month));
}

async function managerRejectReceiptAction(formData: FormData) { "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(admin.email, cfg.managerApproverEmails)) redirect(withQuery("/admin/reports/partner-settlement/billing?err=reject-reason-required", mode, month));
  await managerRejectPartnerReceipt(receiptId, admin.email, reason);
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=manager-rejected", mode, month));
}

async function financeApproveReceiptAction(formData: FormData) { "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(admin.email, cfg.financeApproverEmails)) redirect(withQuery("/admin/reports/partner-settlement/billing?err=not-allowed", mode, month));
  const approvalMap = await getPartnerReceiptApprovalMap([receiptId]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  if (!managerReady) redirect(withQuery("/admin/reports/partner-settlement/billing?err=manager-approval-required", mode, month));
  await financeApprovePartnerReceipt(receiptId, admin.email);
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=finance-approved", mode, month));
}

async function financeRejectReceiptAction(formData: FormData) { "use server";
  const admin = await requireAdmin();
  const mode = parseMode(String(formData.get("mode") ?? ""));
  const month = String(formData.get("month") ?? "").trim() || monthKey(new Date());
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(admin.email, cfg.financeApproverEmails)) redirect(withQuery("/admin/reports/partner-settlement/billing?err=reject-reason-required", mode, month));
  await financeRejectPartnerReceipt(receiptId, admin.email, reason);
  redirect(withQuery("/admin/reports/partner-settlement/billing?msg=finance-rejected", mode, month));
}
export default async function PartnerBillingPage({ searchParams }: { searchParams?: Promise<{ mode?: string; month?: string; msg?: string; err?: string }> }) {
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const lang = await getLang();
  const sp = await searchParams;
  const mode = parseMode(sp?.mode ?? "ONLINE_PACKAGE_END");
  const month = String(sp?.month ?? monthKey(new Date())).trim();
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";
  const today = ymd(new Date());

  const source = await prisma.studentSourceChannel.findFirst({ where: { name: PARTNER_SOURCE_NAME }, select: { id: true, name: true } });
  if (!source) return <div style={{ color: "#b00" }}>Partner source not found: {PARTNER_SOURCE_NAME}</div>;

  const financeOpsEnabled = canFinanceOperate(current?.email ?? admin.email, current?.role ?? admin.role);
  const roleCfg = await getApprovalRoleConfig();
  const isManagerApprover = isRoleApprover(admin.email, roleCfg.managerApproverEmails);
  const isFinanceApprover = isRoleApprover(admin.email, roleCfg.financeApproverEmails);

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
  const defaultInvoiceNo = await getNextPartnerInvoiceNo(today);
  const usedInvoiceIds = new Set(billing.receipts.map((x) => x.invoiceId));
  const availableInvoices = billing.invoices.filter((x) => !usedInvoiceIds.has(x.id));
  const invoiceMap = new Map(billing.invoices.map((x) => [x.id, x]));
  const approvalMap = await getPartnerReceiptApprovalMap(billing.receipts.map((x) => x.id));

  return (
    <div>
      <h2>{t(lang, "Partner Settlement Billing", "合作方结算账单中心")}</h2>
      <div style={{ marginBottom: 10 }}><a href="/admin/reports/partner-settlement">{t(lang, "Back to Settlement Center", "返回合作方结算中心")}</a></div>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <label>Mode<select name="mode" defaultValue={mode} style={{ marginLeft: 6 }}><option value="ONLINE_PACKAGE_END">Online: Package End</option><option value="OFFLINE_MONTHLY">Offline: Monthly</option></select></label>
        <label>Month<input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} /></label>
        <button type="submit">Apply</button>
      </form>

      <h3>Pending Settlement Items ({mode === "ONLINE_PACKAGE_END" ? "Online" : `Offline ${month}`})</h3>
      <div style={{ marginBottom: 8, color: "#374151" }}>Items: {candidates.length} | Total: SGD {money(candidatesAmount)}</div>

      <h3>Create Partner Invoice (Batch)</h3>
      <form action={createPartnerInvoiceAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
          <label>Invoice No.<input name="invoiceNo" defaultValue={defaultInvoiceNo} style={{ width: "100%" }} /></label>
          <label>Issue Date<input name="issueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>Due Date<input name="dueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
          <label>Payment Terms<input name="paymentTerms" defaultValue="Immediate" style={{ width: "100%" }} /></label>
          <label>Bill To<input name="billTo" defaultValue={PARTNER_CUSTOMER_NAME} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 3" }}>Description<input name="description" defaultValue={`Partner settlement ${mode === "ONLINE_PACKAGE_END" ? "Online batch" : `Offline monthly ${month}`}`} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 4" }}>Manual Extra Items (Description|Amount per line)<textarea name="manualItems" rows={4} style={{ width: "100%" }} /></label>
          <label style={{ gridColumn: "span 4" }}>Note<input name="note" style={{ width: "100%" }} /></label>
        </div>
        <div style={{ marginTop: 8 }}><button type="submit">Create Invoice (Batch)</button></div>
      </form>

      <h3>Payment Records</h3>
      {financeOpsEnabled ? (
        <form action={uploadPaymentRecordAction} encType="multipart/form-data" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(160px, 1fr))", gap: 8 }}>
            <label>Payment Proof<input name="paymentProof" type="file" required style={{ width: "100%" }} /></label>
            <label>Payment Date<input name="paymentDate" type="date" style={{ width: "100%" }} /></label>
            <label>Payment Method<select name="paymentMethod" defaultValue="" style={{ width: "100%" }}><option value="">(optional)</option><option value="Paynow">Paynow</option><option value="Cash">Cash</option><option value="Bank transfer">Bank transfer</option></select></label>
            <label>Reference No.<input name="referenceNo" style={{ width: "100%" }} /></label>
            <label>Replace Existing<select name="replacePaymentRecordId" defaultValue="" style={{ width: "100%" }}><option value="">(new record)</option>{billing.paymentRecords.map((r) => (<option key={r.id} value={r.id}>{new Date(r.uploadedAt).toLocaleDateString()} - {r.originalFileName}</option>))}</select></label>
            <label style={{ gridColumn: "span 5" }}>Note<input name="paymentNote" style={{ width: "100%" }} /></label>
          </div>
          <div style={{ marginTop: 8 }}><button type="submit">Upload</button></div>
        </form>
      ) : <div style={{ color: "#92400e", marginBottom: 12 }}>Only finance can manage payment records.</div>}

      <h3>Create Receipt</h3>
      {financeOpsEnabled ? (
        <form action={createReceiptAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
            <label>Source Invoice<select name="invoiceId" defaultValue={availableInvoices[0]?.id ?? ""} required style={{ width: "100%" }}><option value="" disabled>{availableInvoices.length === 0 ? "(No available invoice)" : "Select an invoice"}</option>{availableInvoices.map((inv) => (<option key={inv.id} value={inv.id}>{inv.invoiceNo} / {money(inv.totalAmount)}</option>))}</select></label>
            <label>Receipt No.<input name="receiptNo" placeholder="Leave blank to auto-generate: InvoiceNo-RC" style={{ width: "100%" }} /></label>
            <label>Receipt Date<input name="receiptDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
            <label>Received From<input name="receivedFrom" required style={{ width: "100%" }} /></label>
            <label>Paid By<select name="paidBy" required defaultValue="Paynow" style={{ width: "100%" }}><option value="Paynow">Paynow</option><option value="Cash">Cash</option><option value="Bank transfer">Bank transfer</option></select></label>
            <label>Quantity<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
            <label>Amount<input name="amount" type="number" step="0.01" defaultValue={availableInvoices[0]?.amount ?? 0} style={{ width: "100%" }} /></label>
            <label>GST<input name="gstAmount" type="number" step="0.01" defaultValue={availableInvoices[0]?.gstAmount ?? 0} style={{ width: "100%" }} /></label>
            <label>Total<input name="totalAmount" type="number" step="0.01" defaultValue={availableInvoices[0]?.totalAmount ?? 0} style={{ width: "100%" }} /></label>
            <label>Amount Received<input name="amountReceived" type="number" step="0.01" defaultValue={availableInvoices[0]?.totalAmount ?? 0} style={{ width: "100%" }} /></label>
            <label>Payment Record<select name="paymentRecordId" defaultValue="" style={{ width: "100%" }}><option value="">(none)</option>{billing.paymentRecords.map((r) => (<option key={r.id} value={r.id}>{new Date(r.uploadedAt).toLocaleDateString()} - {r.originalFileName}</option>))}</select></label>
            <label style={{ gridColumn: "span 4" }}>Note<input name="note" style={{ width: "100%" }} /></label>
          </div>
          <div style={{ marginTop: 8 }}><button type="submit" disabled={availableInvoices.length === 0}>Create Receipt</button></div>
        </form>
      ) : null}

      <h3>Partner Invoices</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}><thead><tr style={{ background: "#f3f4f6" }}><th align="left">Invoice No.</th><th align="left">Issue</th><th align="left">Mode</th><th align="left">Month</th><th align="left">Total</th><th align="left">PDF</th><th align="left">Delete</th></tr></thead><tbody>{billing.invoices.map((r) => (<tr key={r.id} style={{ borderTop: "1px solid #eee" }}><td>{r.invoiceNo}</td><td>{new Date(r.issueDate).toLocaleDateString()}</td><td>{r.mode}</td><td>{r.monthKey ?? "-"}</td><td>{money(r.totalAmount)}</td><td><a href={`/api/exports/partner-invoice/${encodeURIComponent(r.id)}`}>Export PDF</a></td><td><form action={deleteInvoiceAction}><input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} /><input type="hidden" name="invoiceId" value={r.id} /><button type="submit">Delete</button></form></td></tr>))}</tbody></table>

      <h3>Partner Receipts</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr style={{ background: "#f3f4f6" }}><th align="left">Receipt No.</th><th align="left">Date</th><th align="left">Invoice No.</th><th align="left">Amount</th><th align="left">Manager</th><th align="left">Finance</th><th align="left">Actions</th><th align="left">PDF</th><th align="left">Delete</th></tr></thead><tbody>{billing.receipts.map((r) => {
        const inv = invoiceMap.get(r.invoiceId);
        const approval = approvalMap.get(r.id) ?? { managerApprovedBy: [], financeApprovedBy: [] };
        const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
        const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
        const exportReady = managerReady && financeReady;
        return (<tr key={r.id} style={{ borderTop: "1px solid #eee" }}><td>{r.receiptNo}</td><td>{new Date(r.receiptDate).toLocaleDateString()}</td><td>{inv?.invoiceNo ?? "-"}</td><td>{money(r.amountReceived)}</td><td>{`${approval.managerApprovedBy.length}/${roleCfg.managerApproverEmails.length}`}</td><td>{`${approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`}</td><td>{exportReady ? <span style={{ color: "#166534" }}>Completed</span> : (<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{isManagerApprover ? <><form action={managerApproveReceiptAction}><input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} /><input type="hidden" name="receiptId" value={r.id} /><button type="submit">Manager Approve</button></form><form action={managerRejectReceiptAction}><input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} /><input type="hidden" name="receiptId" value={r.id} /><input name="reason" placeholder="Manager reject reason" /><button type="submit">Manager Reject</button></form></> : null}{isFinanceApprover ? <><form action={financeApproveReceiptAction}><input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} /><input type="hidden" name="receiptId" value={r.id} /><button type="submit">Finance Approve</button></form><form action={financeRejectReceiptAction}><input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} /><input type="hidden" name="receiptId" value={r.id} /><input name="reason" placeholder="Finance reject reason" /><button type="submit">Finance Reject</button></form></> : null}</div>)}</td><td>{exportReady ? <a href={`/api/exports/partner-receipt/${encodeURIComponent(r.id)}`}>Export PDF</a> : <span style={{ color: "#b45309" }}>Pending approval</span>}</td><td><form action={deleteReceiptAction}><input type="hidden" name="mode" value={mode} /><input type="hidden" name="month" value={month} /><input type="hidden" name="receiptId" value={r.id} /><button type="submit">Delete</button></form></td></tr>);
      })}</tbody></table>
    </div>
  );
}
