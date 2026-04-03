import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BUSINESS_UPLOAD_PREFIX,
  deleteStoredBusinessFile,
  storeBusinessUpload,
  storedBusinessFileExists,
} from "@/lib/business-file-storage";
import {
  addParentPaymentRecord,
  buildParentReceiptNoForInvoice,
  createParentReceipt,
  deleteParentPaymentRecord,
  getParentInvoiceById,
  getParentPaymentRecordById,
  listAllParentBilling,
  listParentBillingForPackage,
  replaceParentPaymentRecord,
} from "@/lib/student-parent-billing";
import { listPartnerBilling } from "@/lib/partner-billing";
import {
  financeApproveParentReceipt,
  financeRejectParentReceipt,
  getParentReceiptApprovalMap,
  managerApproveParentReceipt,
  managerRejectParentReceipt,
  revokeParentReceiptApprovalForRedo,
} from "@/lib/parent-receipt-approval";
import {
  financeApprovePartnerReceipt,
  financeRejectPartnerReceipt,
  getPartnerReceiptApprovalMap,
  managerApprovePartnerReceipt,
  managerRejectPartnerReceipt,
  revokePartnerReceiptApprovalForRedo,
} from "@/lib/partner-receipt-approval";
import {
  areAllApproversConfirmed,
  getApprovalRoleConfig,
  isRoleApprover,
} from "@/lib/approval-flow";
import ImagePreviewWithFallback from "../_components/ImagePreviewWithFallback";
import RememberedWorkbenchQueryClient from "../_components/RememberedWorkbenchQueryClient";
import { formatBusinessDateOnly, formatBusinessDateTime, formatDateOnly, monthKeyFromDateOnly, normalizeDateOnly } from "@/lib/date-only";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
} from "../_components/workbenchStyles";

const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";
const RECEIPTS_QUEUE_COOKIE = "adminReceiptsPreferredQueue";
const RECEIPT_REJECT_REASON_OPTIONS = [
  "Missing payment proof / 缺少缴费记录",
  "Attachment unclear / 附件不清晰",
  "Wrong amount / 金额不一致",
  "Wrong linked record / 关联记录错误",
  "Incomplete details / 信息不完整",
] as const;

const primaryButtonStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "1px solid #1d4ed8",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
} as const;

const secondaryButtonStyle = {
  background: "#fff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
} as const;

const dangerButtonStyle = {
  background: "#b91c1c",
  color: "#fff",
  border: "1px solid #991b1b",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
} as const;

function canFinanceOperate(email: string, role: string) {
  const e = String(email ?? "").trim().toLowerCase();
  return role === "FINANCE" || e === SUPER_ADMIN_EMAIL;
}

function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function tagStyle(kind: "ok" | "warn" | "err" | "muted") {
  if (kind === "ok") return { color: "#166534", background: "#dcfce7", border: "1px solid #86efac" };
  if (kind === "warn") return { color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" };
  if (kind === "err") return { color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" };
  return { color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db" };
}

function queueStatusLabel(
  lang: "BILINGUAL" | "ZH" | "EN",
  status: "COMPLETED" | "REJECTED" | "PENDING",
) {
  if (status === "COMPLETED") return t(lang, "Completed, ready to archive", "已完成，可归档");
  if (status === "REJECTED") return t(lang, "Rejected, needs fix", "已驳回，需修复");
  return t(lang, "Pending, waiting for review", "待审批，等待审核");
}

function queueStatusKind(status: "COMPLETED" | "REJECTED" | "PENDING") {
  if (status === "COMPLETED") return "ok" as const;
  if (status === "REJECTED") return "err" as const;
  return "warn" as const;
}

function queueTypeLabel(lang: "BILINGUAL" | "ZH" | "EN", type: "PARENT" | "PARTNER") {
  return type === "PARENT" ? t(lang, "Parent", "家长") : t(lang, "Partner", "合作方");
}

function bilingualLabel(en: string, zh: string) {
  return `${en} / ${zh}`;
}

function renderRejectReasonFields(lang: "BILINGUAL" | "ZH" | "EN", idSuffix: string) {
  return (
    <>
      <select name="reason" defaultValue="" style={{ minWidth: 240 }}>
        <option value="">{t(lang, "Select reject reason", "选择驳回原因")}</option>
        {RECEIPT_REJECT_REASON_OPTIONS.map((option) => (
          <option key={`${idSuffix}-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        name="reasonDetail"
        placeholder={t(lang, "Extra note (optional)", "补充备注（可选）")}
      />
    </>
  );
}

function normalizeReceiptView(value: string) {
  return value === "PARENT" || value === "PARTNER" ? value : "ALL";
}

function normalizeReceiptQueueFilter(value: string) {
  return (
    ["ALL", "PENDING", "REJECTED", "COMPLETED", "NO_PAYMENT_RECORD", "FILE_ISSUE", "TODAY_MINE"] as const
  ).includes(value as any)
    ? (value as "ALL" | "PENDING" | "REJECTED" | "COMPLETED" | "NO_PAYMENT_RECORD" | "FILE_ISSUE" | "TODAY_MINE")
    : "ALL";
}

function normalizeReceiptQueueBucket(value: string) {
  return (["ALL", "MINE", "OPEN", "HISTORY"] as const).includes(value as any)
    ? (value as "ALL" | "MINE" | "OPEN" | "HISTORY")
    : "ALL";
}

function parseRememberedReceiptsQueue(raw: string) {
  let normalizedRaw = raw;
  try {
    normalizedRaw = decodeURIComponent(raw);
  } catch {
    normalizedRaw = raw;
  }
  const params = new URLSearchParams(normalizedRaw);
  const monthRaw = String(params.get("month") ?? "").trim();
  const month = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : "";
  const view = normalizeReceiptView(String(params.get("view") ?? "").trim().toUpperCase());
  const queueFilter = normalizeReceiptQueueFilter(String(params.get("queueFilter") ?? "").trim().toUpperCase());
  const queueBucket = normalizeReceiptQueueBucket(String(params.get("queueBucket") ?? "").trim().toUpperCase());
  const normalized = new URLSearchParams();
  if (month) normalized.set("month", month);
  if (view !== "ALL") normalized.set("view", view);
  if (queueFilter !== "ALL") normalized.set("queueFilter", queueFilter);
  if (queueBucket !== "ALL") normalized.set("queueBucket", queueBucket);
  return {
    month,
    view,
    queueFilter,
    queueBucket,
    value: normalized.toString(),
  };
}

function isImageFile(pathOrName: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(pathOrName);
}

function parentPaymentRecordFileHref(recordId: string) {
  return `/api/admin/parent-payment-records/${encodeURIComponent(recordId)}/file`;
}

function withQuery(base: string, packageId?: string) {
  if (!packageId) return base;
  const q = `packageId=${encodeURIComponent(packageId)}`;
  return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
}

function isNextRedirectError(err: unknown) {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function resolveActionHref(formData: FormData, fallback: string) {
  const nextHref = String(formData.get("nextHref") ?? "").trim();
  return nextHref || fallback;
}

function appendResultParam(href: string, key: "msg" | "err", value: string) {
  const url = new URL(href, "https://sgtmanage.com");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function extractRejectReason(formData: FormData, reasonFieldName = "reason", detailFieldName = "reasonDetail") {
  const preset = String(formData.get(reasonFieldName) ?? "").trim();
  const detail = String(formData.get(detailFieldName) ?? "").trim();
  if (preset && detail) return `${preset} | ${detail}`;
  return preset || detail;
}

function queuePriority(
  status: "COMPLETED" | "REJECTED" | "PENDING",
  hasRisk: boolean,
  missingPaymentRecord: boolean,
  paymentFileMissing: boolean
) {
  if (status === "PENDING" && missingPaymentRecord) return 0;
  if (status === "PENDING" && paymentFileMissing) return 1;
  if (status === "PENDING" && hasRisk) return 2;
  if (status === "PENDING") return 3;
  if (status === "REJECTED") return 4;
  return 5;
}

function describeReceiptActionResult(
  lang: "BILINGUAL" | "ZH" | "EN",
  rawMsg: string,
  movedToNext: boolean
) {
  const normalized = String(rawMsg || "").trim();
  const withMove = movedToNext
    ? t(lang, "Moved to next item", "已跳转到下一条")
    : t(lang, "Queue updated", "队列已更新");
  if (normalized === "Manager approved") return `${t(lang, "Manager approved", "管理已批准")} · ${withMove}`;
  if (normalized === "Manager rejected") return `${t(lang, "Manager rejected", "管理已驳回")} · ${withMove}`;
  if (normalized === "Finance approved") return `${t(lang, "Finance approved", "财务已批准")} · ${withMove}`;
  if (normalized === "Finance rejected") return `${t(lang, "Finance rejected", "财务已驳回")} · ${withMove}`;
  if (normalized === "Partner manager approved") return `${t(lang, "Partner manager approved", "合作方管理已批准")} · ${withMove}`;
  if (normalized === "Partner manager rejected") return `${t(lang, "Partner manager rejected", "合作方管理已驳回")} · ${withMove}`;
  if (normalized === "Partner finance approved") return `${t(lang, "Partner finance approved", "合作方财务已批准")} · ${withMove}`;
  if (normalized === "Partner finance rejected") return `${t(lang, "Partner finance rejected", "合作方财务已驳回")} · ${withMove}`;
  if (normalized === "Receipt reopened for redo") return `${t(lang, "Receipt reopened", "收据已重新打开")} · ${withMove}`;
  if (normalized === "Partner receipt reopened for redo") return `${t(lang, "Partner receipt reopened", "合作方收据已重新打开")} · ${withMove}`;
  if (normalized === "Payment record uploaded") return `${t(lang, "Payment record uploaded", "缴费记录已上传")} · ${withMove}`;
  if (normalized === "Payment record replaced") return `${t(lang, "Payment record replaced", "缴费记录已替换")} · ${withMove}`;
  if (normalized === "Payment record deleted") return `${t(lang, "Payment record deleted", "缴费记录已删除")} · ${withMove}`;
  if (normalized === "Receipt created") return `${t(lang, "Receipt created", "收据已创建")} · ${withMove}`;
  return normalized;
}

function queueRiskBadgeLabel(
  lang: "BILINGUAL" | "ZH" | "EN",
  item: { paymentRecord: { id: string; name: string; path: string; date?: string | null } | null; paymentFileMissing?: boolean; riskCount?: number }
) {
  if (!item.paymentRecord || item.paymentFileMissing) return t(lang, "Blocker", "阻塞");
  if ((item.riskCount ?? 0) > 0) return t(lang, "Needs check", "需要核对");
  return t(lang, "Ready", "可处理");
}

function queueRiskBadgeKind(item: { paymentRecord: unknown; paymentFileMissing?: boolean; riskCount?: number }) {
  if (!item.paymentRecord || item.paymentFileMissing) return "err" as const;
  if ((item.riskCount ?? 0) > 0) return "warn" as const;
  return "ok" as const;
}

function queueRiskAssistLabel(
  lang: "BILINGUAL" | "ZH" | "EN",
  item: { paymentRecord: { id: string; name: string; path: string; date?: string | null } | null; paymentFileMissing?: boolean; riskCount?: number }
) {
  if (!item.paymentRecord) return t(lang, "Missing proof", "缺少凭证");
  if (item.paymentFileMissing) return t(lang, "File missing", "文件缺失");
  if ((item.riskCount ?? 0) > 0) return t(lang, "Check details", "核对明细");
  return t(lang, "Ready to approve", "可直接处理");
}

function queueReviewProgressLabel(
  lang: "BILINGUAL" | "ZH" | "EN",
  roleCfg: { managerApproverEmails: string[]; financeApproverEmails: string[] },
  approval: { managerApprovedBy: string[]; financeApprovedBy: string[] }
) {
  const managerSummary = roleCfg.managerApproverEmails.length === 0
    ? t(lang, "Manager no config", "管理未配置")
    : `${t(lang, "Manager", "管理")}: ${approval.managerApprovedBy.length}/${roleCfg.managerApproverEmails.length}`;
  const financeSummary = roleCfg.financeApproverEmails.length === 0
    ? t(lang, "Finance no config", "财务未配置")
    : `${t(lang, "Finance", "财务")}: ${approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`;
  return `${managerSummary} · ${financeSummary}`;
}

function queuePrimaryActionLabel(
  lang: "BILINGUAL" | "ZH" | "EN",
  status: "COMPLETED" | "REJECTED" | "PENDING"
) {
  if (status === "COMPLETED") return t(lang, "Review completed item", "查看已完成项目");
  if (status === "REJECTED") return t(lang, "Open and fix", "打开并修复");
  return t(lang, "Open for review", "打开审核");
}

function renderQueueCards(
  rows: Array<{
    id: string;
    type: "PARENT" | "PARTNER";
    receiptNo: string;
    receiptDate: string | null;
    invoiceNo: string;
    partyName: string;
    amountReceived: number;
    status: "COMPLETED" | "REJECTED" | "PENDING";
    approval: {
      managerApprovedBy: string[];
      financeApprovedBy: string[];
    };
    paymentRecord: { id: string; name: string; path: string; date?: string | null } | null;
    paymentFileMissing?: boolean;
    riskCount?: number;
    packageId: string;
  }>,
  lang: "BILINGUAL" | "ZH" | "EN",
  selectedRow: { type: "PARENT" | "PARTNER"; id: string } | null,
  roleCfg: { managerApproverEmails: string[]; financeApproverEmails: string[] },
  openHref: (type: "PARENT" | "PARTNER", id: string) => string
) {
  return rows.map((x) => (
    <article
      key={`${x.type}-${x.id}`}
      style={{
        border: selectedRow?.type === x.type && selectedRow?.id === x.id ? "1px solid #93c5fd" : "1px solid #e5e7eb",
        borderRadius: 12,
        background: selectedRow?.type === x.type && selectedRow?.id === x.id ? "#f8fbff" : x.status === "COMPLETED" ? "#fcfcfd" : "#fff",
        color: x.status === "COMPLETED" ? "#6b7280" : undefined,
        opacity: x.status === "COMPLETED" ? 0.8 : 1,
        padding: 12,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{x.receiptNo}</div>
          <div style={{ color: "#334155", fontSize: 14 }}>{x.partyName}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "#111827" }}>{money(x.amountReceived)}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{normalizeDateOnly(x.receiptDate) ?? "-"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ ...tagStyle("muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
          {queueTypeLabel(lang, x.type)}
        </span>
        <span style={{ ...tagStyle(queueStatusKind(x.status)), borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
          {queueStatusLabel(lang, x.status)}
        </span>
        <span style={{ ...tagStyle(queueRiskBadgeKind(x)), borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
          {queueRiskBadgeLabel(lang, x)}
        </span>
      </div>
      <div style={{ display: "grid", gap: 4, fontSize: 12, color: "#475569" }}>
        <div>
          <b>{t(lang, "Invoice", "发票")}</b>: {x.invoiceNo}
        </div>
        <div>
          <b>{t(lang, "Progress", "进度")}</b>: {queueReviewProgressLabel(lang, roleCfg, x.approval)}
        </div>
        <div>
          <b>{t(lang, "Risk", "风险")}</b>: {queueRiskAssistLabel(lang, x)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a href={openHref(x.type, x.id)} style={{ fontWeight: 600 }}>
          {queuePrimaryActionLabel(lang, x.status)}
        </a>
        {x.type === "PARENT" && (x.status === "REJECTED" || !x.paymentRecord || x.paymentFileMissing) ? (
          <a
            href={`/admin/receipts-approvals?packageId=${encodeURIComponent(x.packageId)}&step=create&selectedType=PARENT&selectedId=${encodeURIComponent(x.id)}`}
            style={{ fontSize: 12, color: "#b45309" }}
          >
            {t(lang, "Fix payment proof", "修复缴费凭证")}
          </a>
        ) : null}
      </div>
    </article>
  ));
}

function renderQueueSection(
  rows: Array<{
    id: string;
    type: "PARENT" | "PARTNER";
    receiptNo: string;
    receiptDate: string | null;
    invoiceNo: string;
    partyName: string;
    amountReceived: number;
    status: "COMPLETED" | "REJECTED" | "PENDING";
    approval: {
      managerApprovedBy: string[];
      financeApprovedBy: string[];
    };
    paymentRecord: { id: string; name: string; path: string; date?: string | null } | null;
    paymentFileMissing?: boolean;
    riskCount?: number;
    packageId: string;
  }>,
  opts: {
    heading: string;
    count: number;
    tone: "ok" | "warn" | "muted";
    lang: "BILINGUAL" | "ZH" | "EN";
    selectedRow: { type: "PARENT" | "PARTNER"; id: string } | null;
    roleCfg: { managerApproverEmails: string[]; financeApproverEmails: string[] };
    openHref: (type: "PARENT" | "PARTNER", id: string) => string;
  }
) {
  if (rows.length === 0) return null;
  return (
    <section style={{ display: "grid", gap: 8 }}>
      <div style={{ ...tagStyle(opts.tone), borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
        {opts.heading} ({opts.count})
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {renderQueueCards(rows, opts.lang, opts.selectedRow, opts.roleCfg, opts.openHref)}
      </div>
    </section>
  );
}

async function uploadPaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) {
    redirect("/admin/receipts-approvals?err=Only+finance+can+manage+payment+records");
  }
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) redirect("/admin/receipts-approvals?err=Missing+package+id");
  const fallbackHref = withQuery("/admin/receipts-approvals", packageId);
  const actionHref = resolveActionHref(formData, fallbackHref);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true },
  });
  if (!pkg) redirect(appendResultParam(actionHref, "err", "Package not found"));

  const file = formData.get("paymentProof");
  if (!(file instanceof File) || !file.size) {
    redirect(appendResultParam(actionHref, "err", "Please choose a file"));
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect(appendResultParam(actionHref, "err", "File too large (max 10MB)"));
  }

  const stored = await storeBusinessUpload(file, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.paymentProofs,
    subdirSegments: [packageId],
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
      const { oldItem } = await replaceParentPaymentRecord({
        recordId: replaceRecordId,
        packageId,
        paymentDate,
        paymentMethod,
        referenceNo,
        originalFileName: file.name || "payment-proof",
        storedFileName: stored.storedFileName,
        relativePath: stored.relativePath,
        note: paymentNote,
        uploadedBy: admin.email,
      });
      await deleteStoredBusinessFile(oldItem.relativePath, BUSINESS_UPLOAD_PREFIX.paymentProofs);
      redirect(appendResultParam(actionHref, "msg", "Payment record replaced"));
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      await deleteStoredBusinessFile(stored.relativePath, BUSINESS_UPLOAD_PREFIX.paymentProofs);
      const msg = e instanceof Error ? e.message : "Replace payment record failed";
      redirect(appendResultParam(actionHref, "err", msg));
    }
  }

  await addParentPaymentRecord({
    packageId,
    studentId: pkg.studentId,
    paymentDate,
    paymentMethod,
    referenceNo,
    originalFileName: file.name || "payment-proof",
    storedFileName: stored.storedFileName,
    relativePath: stored.relativePath,
    note: paymentNote,
    uploadedBy: admin.email,
  });

  redirect(appendResultParam(actionHref, "msg", "Payment record uploaded"));
}

async function deletePaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) {
    redirect("/admin/receipts-approvals?err=Only+finance+can+delete+payment+records");
  }
  const packageId = String(formData.get("packageId") ?? "").trim();
  const recordId = String(formData.get("recordId") ?? "").trim();
  const fallbackHref = withQuery("/admin/receipts-approvals", packageId);
  const actionHref = resolveActionHref(formData, fallbackHref);
  if (!packageId || !recordId) {
    redirect(appendResultParam(actionHref, "err", "Missing payment record id"));
  }
  try {
    const row = await deleteParentPaymentRecord({ recordId, actorEmail: admin.email });
    await deleteStoredBusinessFile(row.relativePath, BUSINESS_UPLOAD_PREFIX.paymentProofs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete payment record failed";
    redirect(appendResultParam(actionHref, "err", msg));
  }
  redirect(appendResultParam(actionHref, "msg", "Payment record deleted"));
}

async function createReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) {
    redirect("/admin/receipts-approvals?err=Only+finance+can+create+receipts");
  }
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) redirect("/admin/receipts-approvals?err=Missing+package+id");
  const fallbackHref = withQuery("/admin/receipts-approvals", packageId);
  const actionHref = resolveActionHref(formData, fallbackHref);

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });
  if (!pkg) redirect(appendResultParam(actionHref, "err", "Package not found"));

  const amount = parseNum(formData.get("amount"), 0);
  const gstAmount = parseNum(formData.get("gstAmount"), 0);
  const totalAmountRaw = parseNum(formData.get("totalAmount"), Number.NaN);
  const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : amount + gstAmount;
  const amountReceivedRaw = parseNum(formData.get("amountReceived"), Number.NaN);
  const amountReceived = Number.isFinite(amountReceivedRaw) ? amountReceivedRaw : totalAmount;
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) {
    redirect(appendResultParam(actionHref, "err", "Please select an invoice for this receipt"));
  }
  const linkedInvoice = await getParentInvoiceById(invoiceId);
  if (!linkedInvoice) {
    redirect(appendResultParam(actionHref, "err", "Selected invoice not found"));
  }
  const billing = await listParentBillingForPackage(packageId);
  const hasAnyPaymentRecords = billing.paymentRecords.length > 0;
  const paymentRecordId = String(formData.get("paymentRecordId") ?? "").trim() || null;
  if (hasAnyPaymentRecords && !paymentRecordId) {
    redirect(appendResultParam(actionHref, "err", "Please select a payment record before creating receipt"));
  }
  if (paymentRecordId) {
    const paymentRecord = await getParentPaymentRecordById(paymentRecordId);
    if (!paymentRecord || paymentRecord.packageId !== packageId) {
      redirect(appendResultParam(actionHref, "err", "Selected payment record not found for this package"));
    }
  }
  const receiptNoInput = String(formData.get("receiptNo") ?? "").trim();
  let receiptNo = receiptNoInput;
  if (!receiptNo) {
    try {
      receiptNo = await buildParentReceiptNoForInvoice(invoiceId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate receipt no";
      redirect(appendResultParam(actionHref, "err", msg));
    }
  }
  const receivedFrom = String(formData.get("receivedFrom") ?? "").trim();
  const paidBy = String(formData.get("paidBy") ?? "").trim();
  if (!receivedFrom) {
    redirect(appendResultParam(actionHref, "err", "Received From is required"));
  }
  if (!paidBy) {
    redirect(appendResultParam(actionHref, "err", "Paid By is required"));
  }

  try {
    await createParentReceipt({
      packageId,
      studentId: pkg.studentId,
      invoiceId,
      paymentRecordId,
      receiptNo,
      receiptDate: normalizeDateOnly(String(formData.get("receiptDate") ?? "").trim(), new Date()) ?? formatDateOnly(new Date()),
      receivedFrom,
      paidBy,
      quantity: Math.max(1, Math.floor(parseNum(formData.get("quantity"), 1))),
      description: `For Invoice no. ${linkedInvoice.invoiceNo}`,
      amount,
      gstAmount,
      totalAmount,
      amountReceived,
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create receipt failed";
    redirect(appendResultParam(actionHref, "err", msg));
  }

  redirect(appendResultParam(actionHref, "msg", "Receipt created"));
}

async function managerApproveReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "err", "Not allowed"));
  }
  await managerApproveParentReceipt(receiptId, actorEmail);
  redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "msg", "Manager approved"));
}

async function managerRejectReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reason = extractRejectReason(formData);
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "err", "Reject reason required"));
  }
  await managerRejectParentReceipt(receiptId, actorEmail, reason);
  redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "msg", "Manager rejected"));
}

async function financeApproveReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "err", "Not allowed"));
  }
  const approvalMap = await getParentReceiptApprovalMap([receiptId]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  if (!managerReady) {
    redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "err", "Manager approval is required first"));
  }
  await financeApproveParentReceipt(receiptId, actorEmail);
  redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "msg", "Finance approved"));
}

async function financeRejectReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reason = extractRejectReason(formData);
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "err", "Reject reason required"));
  }
  await financeRejectParentReceipt(receiptId, actorEmail, reason);
  redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "msg", "Finance rejected"));
}

async function revokeParentReceiptForRedoAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = (current?.email ?? admin.email).trim().toLowerCase();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = extractRejectReason(formData);
  if (actorEmail !== SUPER_ADMIN_EMAIL || !receiptId) {
    redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "err", "Not allowed"));
  }
  await revokeParentReceiptApprovalForRedo(receiptId, actorEmail, reason || "Super admin revoke to redo");
  redirect(appendResultParam(resolveActionHref(formData, withQuery("/admin/receipts-approvals", packageId)), "msg", "Receipt reopened for redo"));
}

async function managerApprovePartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "err", "Not allowed"));
  }
  await managerApprovePartnerReceipt(receiptId, actorEmail);
  redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "msg", "Partner manager approved"));
}

async function managerRejectPartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = extractRejectReason(formData);
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "err", "Partner reject reason required"));
  }
  await managerRejectPartnerReceipt(receiptId, actorEmail, reason);
  redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "msg", "Partner manager rejected"));
}

async function financeApprovePartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "err", "Not allowed"));
  }
  const approvalMap = await getPartnerReceiptApprovalMap([receiptId]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  if (!managerReady) {
    redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "err", "Partner manager approval is required first"));
  }
  await financeApprovePartnerReceipt(receiptId, actorEmail);
  redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "msg", "Partner finance approved"));
}

async function financeRejectPartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = extractRejectReason(formData);
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "err", "Partner reject reason required"));
  }
  await financeRejectPartnerReceipt(receiptId, actorEmail, reason);
  redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "msg", "Partner finance rejected"));
}

async function revokePartnerReceiptForRedoAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = (current?.email ?? admin.email).trim().toLowerCase();
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = extractRejectReason(formData);
  if (actorEmail !== SUPER_ADMIN_EMAIL || !receiptId) {
    redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "err", "Not allowed"));
  }
  await revokePartnerReceiptApprovalForRedo(receiptId, actorEmail, reason || "Super admin revoke to redo");
  redirect(appendResultParam(resolveActionHref(formData, "/admin/receipts-approvals"), "msg", "Partner receipt reopened for redo"));
}

export default async function ReceiptsApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    msg?: string;
    err?: string;
    clearQueue?: string;
    packageId?: string;
    month?: string;
    view?: string;
    selectedType?: string;
    selectedId?: string;
    step?: string;
    queueFilter?: string;
    queueBucket?: string;
    paymentRecordId?: string;
    invoiceId?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const packageIdFilter = sp?.packageId ? String(sp.packageId).trim() : "";
  const clearQueue = String(sp?.clearQueue ?? "").trim() === "1";
  const hasMonthParam = typeof sp?.month === "string";
  const hasViewParam = typeof sp?.view === "string";
  const hasQueueFilterParam = typeof sp?.queueFilter === "string";
  const hasQueueBucketParam = typeof sp?.queueBucket === "string";
  const monthParamRaw = hasMonthParam ? String(sp.month).trim() : "";
  const viewParamRaw = hasViewParam ? String(sp.view).trim() : "";
  const queueFilterParamRaw = hasQueueFilterParam ? String(sp.queueFilter).trim() : "";
  const queueBucketParamRaw = hasQueueBucketParam ? String(sp.queueBucket).trim() : "";
  const stepRaw = String(sp?.step ?? "upload").trim().toLowerCase();
  const workflowStep = (["upload", "records", "create", "review"] as const).includes(stepRaw as any)
    ? (stepRaw as "upload" | "records" | "create" | "review")
    : "upload";
  const selectedTypeRaw = String(sp?.selectedType ?? "").trim().toUpperCase();
  const selectedType = selectedTypeRaw === "PARENT" || selectedTypeRaw === "PARTNER" ? selectedTypeRaw : "";
  const selectedId = String(sp?.selectedId ?? "").trim();
  const preferredPaymentRecordId = String(sp?.paymentRecordId ?? "").trim();
  const preferredInvoiceId = String(sp?.invoiceId ?? "").trim();
  const canResumeRememberedQueue =
    !clearQueue &&
    !packageIdFilter &&
    !hasMonthParam &&
    !hasViewParam &&
    !hasQueueFilterParam &&
    !hasQueueBucketParam &&
    !String(sp?.step ?? "").trim() &&
    !selectedType &&
    !selectedId &&
    !preferredPaymentRecordId &&
    !preferredInvoiceId;
  const cookieStore = await cookies();
  const rememberedQueue = canResumeRememberedQueue
    ? parseRememberedReceiptsQueue(cookieStore.get(RECEIPTS_QUEUE_COOKIE)?.value ?? "")
    : { month: "", view: "ALL" as const, queueFilter: "ALL" as const, queueBucket: "ALL" as const, value: "" };
  const monthFilter = hasMonthParam
    ? (/^\d{4}-\d{2}$/.test(monthParamRaw) ? monthParamRaw : "")
    : rememberedQueue.month;
  const viewMode = hasViewParam
    ? normalizeReceiptView(viewParamRaw.trim().toUpperCase())
    : rememberedQueue.view;
  const queueFilter = hasQueueFilterParam
    ? normalizeReceiptQueueFilter(queueFilterParamRaw.trim().toUpperCase())
    : rememberedQueue.queueFilter;
  const queueBucket = hasQueueBucketParam
    ? normalizeReceiptQueueBucket(queueBucketParamRaw.trim().toUpperCase())
    : rememberedQueue.queueBucket;
  const resumedRememberedQueue =
    canResumeRememberedQueue && Boolean(rememberedQueue.value);

  const [current, roleCfg, all, partnerAll] = await Promise.all([
    getCurrentUser(),
    getApprovalRoleConfig(),
    listAllParentBilling(),
    listPartnerBilling(),
  ]);
  const actorEmail = current?.email ?? "";
  const canSuperRevoke = actorEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  const financeOpsEnabled = canFinanceOperate(actorEmail, current?.role ?? "");
  const isManagerApprover = isRoleApprover(actorEmail, roleCfg.managerApproverEmails);
  const isFinanceApprover = isRoleApprover(actorEmail, roleCfg.financeApproverEmails);
  const today = formatDateOnly(new Date());

  const invoiceMap = new Map(all.invoices.map((x) => [x.id, x]));
  const invoiceCountByPackage = new Map<string, number>();
  for (const inv of all.invoices) {
    invoiceCountByPackage.set(inv.packageId, (invoiceCountByPackage.get(inv.packageId) ?? 0) + 1);
  }
  const receiptCountByPackage = new Map<string, number>();
  for (const rc of all.receipts) {
    receiptCountByPackage.set(rc.packageId, (receiptCountByPackage.get(rc.packageId) ?? 0) + 1);
  }
  const packageIdsFromInvoices = Array.from(new Set(all.invoices.map((x) => x.packageId)));
  const invoicePackages = packageIdsFromInvoices.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIdsFromInvoices } },
        include: { student: true, course: true },
      })
    : [];
  const invoicePackageMap = new Map(invoicePackages.map((x) => [x.id, x]));
  const packageIds = Array.from(new Set(all.receipts.map((x) => x.packageId)));
  const packages = packageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIds } },
        include: { student: true, course: true },
      })
    : [];
  const packageMap = new Map(packages.map((x) => [x.id, x]));
  const opPackageIds = Array.from(
    new Set(
      [...all.invoices.map((x) => x.packageId), ...all.paymentRecords.map((x) => x.packageId), ...all.receipts.map((x) => x.packageId)]
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    )
  );
  const opPackages = opPackageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: opPackageIds } },
        include: { student: true, course: true },
      })
    : [];
  const opPackageMap = new Map(opPackages.map((x) => [x.id, x]));

  let rows = packageIdFilter
    ? all.receipts.filter((x) => x.packageId === packageIdFilter)
    : all.receipts;
  if (monthFilter) {
    rows = rows.filter((x) => {
      return monthKeyFromDateOnly(x.receiptDate) === monthFilter;
    });
  }
  rows = rows.sort((a, b) => (normalizeDateOnly(b.receiptDate) ?? "").localeCompare(normalizeDateOnly(a.receiptDate) ?? ""));
  const approvalMap = await getParentReceiptApprovalMap(rows.map((x) => x.id));
  const parentPaymentRecordMap = new Map(all.paymentRecords.map((x) => [x.id, x]));
  let partnerRows = partnerAll.receipts;
  if (monthFilter) {
    partnerRows = partnerRows.filter((x) => {
      return monthKeyFromDateOnly(x.receiptDate) === monthFilter;
    });
  }
  partnerRows = partnerRows.sort((a, b) => (normalizeDateOnly(b.receiptDate) ?? "").localeCompare(normalizeDateOnly(a.receiptDate) ?? ""));
  const partnerInvoiceMap = new Map(partnerAll.invoices.map((x) => [x.id, x]));
  const partnerPaymentRecordMap = new Map(partnerAll.paymentRecords.map((x) => [x.id, x]));
  const partnerApprovalMap = await getPartnerReceiptApprovalMap(partnerRows.map((x) => x.id));
  const selectedPackage = packageIdFilter
    ? await prisma.coursePackage.findUnique({
        where: { id: packageIdFilter },
        include: { student: true, course: true },
      })
    : null;
  const selectedBilling = packageIdFilter
    ? await listParentBillingForPackage(packageIdFilter).catch(() => null)
    : null;
  const paymentRecordFileMap = new Map<string, boolean>(
    selectedBilling
      ? await Promise.all(
          selectedBilling.paymentRecords.map(async (record) => {
            return [
              record.id,
              await storedBusinessFileExists(record.relativePath, BUSINESS_UPLOAD_PREFIX.paymentProofs),
            ] as const;
          })
        )
      : []
  );
  const availableInvoices = selectedBilling
    ? selectedBilling.invoices.filter((inv) => !selectedBilling.receipts.some((r) => r.invoiceId === inv.id))
    : [];
  const selectedCreateInvoice =
    availableInvoices.find((inv) => inv.id === preferredInvoiceId) ??
    availableInvoices[0] ??
    null;
  const linkedPaymentRecordIdSet = new Set(
    (selectedBilling?.receipts ?? []).map((r) => r.paymentRecordId).filter((x): x is string => Boolean(x))
  );
  const selectedCreatePaymentRecord =
    selectedBilling?.paymentRecords.find((r) => r.id === preferredPaymentRecordId) ??
    selectedBilling?.paymentRecords.find((r) => (paymentRecordFileMap.get(r.id) ?? false) && !linkedPaymentRecordIdSet.has(r.id)) ??
    selectedBilling?.paymentRecords.find((r) => (paymentRecordFileMap.get(r.id) ?? false)) ??
    null;
  const defaultReceiptDate =
    normalizeDateOnly(selectedCreatePaymentRecord?.paymentDate ?? null) ?? today;
  const defaultPaidBy = selectedCreatePaymentRecord?.paymentMethod || "Paynow";
  const defaultReceivedFrom = selectedPackage?.student?.name || "";
  const defaultAmount = selectedCreateInvoice?.totalAmount ?? selectedPackage?.paidAmount ?? 0;
  const defaultGst = 0;
  const defaultTotal = selectedCreateInvoice?.totalAmount ?? selectedPackage?.paidAmount ?? 0;
  const defaultAmountReceived = selectedCreateInvoice?.totalAmount ?? selectedPackage?.paidAmount ?? 0;
  const amountDiffVsInvoice = selectedCreateInvoice
    ? Math.abs((Number(defaultAmountReceived) || 0) - (Number(selectedCreateInvoice.totalAmount) || 0))
    : 0;
  const missingPaymentFileCount = selectedBilling
    ? selectedBilling.paymentRecords.filter((r) => !(paymentRecordFileMap.get(r.id) ?? false)).length
    : 0;
  const usablePaymentRecordCount = selectedBilling
    ? selectedBilling.paymentRecords.filter((r) => (paymentRecordFileMap.get(r.id) ?? false)).length
    : 0;
  const linkedPaymentRecordCount = selectedBilling
    ? selectedBilling.paymentRecords.filter((r) => linkedPaymentRecordIdSet.has(r.id)).length
    : 0;
  const totalInvoicedAmount = selectedBilling
    ? selectedBilling.invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)
    : 0;
  const totalReceiptAmount = selectedBilling
    ? selectedBilling.receipts.reduce((sum, rc) => sum + (Number(rc.amountReceived) || 0), 0)
    : 0;
  const paidAmount = Number(selectedPackage?.paidAmount ?? 0) || 0;
  const pendingReceiptAmount = Math.max(0, totalInvoicedAmount - totalReceiptAmount);
  const uninvoicedPaidAmount = Math.max(0, paidAmount - totalInvoicedAmount);

  const baseQuery = new URLSearchParams();
  if (packageIdFilter) baseQuery.set("packageId", packageIdFilter);
  if (monthFilter) baseQuery.set("month", monthFilter);
  if (viewMode !== "ALL") baseQuery.set("view", viewMode);
  if (workflowStep !== "upload") baseQuery.set("step", workflowStep);
  if (queueFilter !== "ALL") baseQuery.set("queueFilter", queueFilter);
  if (queueBucket !== "ALL") baseQuery.set("queueBucket", queueBucket);
  if (preferredPaymentRecordId) baseQuery.set("paymentRecordId", preferredPaymentRecordId);
  if (preferredInvoiceId) baseQuery.set("invoiceId", preferredInvoiceId);
  const openHref = (type: "PARENT" | "PARTNER", id: string) => {
    const q = new URLSearchParams(baseQuery.toString());
    q.set("selectedType", type);
    q.set("selectedId", id);
    return `/admin/receipts-approvals?${q.toString()}`;
  };
  const selectedReviewHref =
    selectedType && selectedId
      ? openHref(selectedType, selectedId)
      : `/admin/receipts-approvals?${baseQuery.toString()}`;
  const stepHref = (step: "upload" | "records" | "create" | "review") => {
    const q = new URLSearchParams(baseQuery.toString());
    q.set("step", step);
    return `/admin/receipts-approvals?${q.toString()}`;
  };
  const selectedRepairReturnHref =
    selectedType && selectedId
      ? selectedReviewHref
      : stepHref(workflowStep === "upload" ? "records" : workflowStep);
  const queueFilterHref = (
    filter: "ALL" | "PENDING" | "REJECTED" | "COMPLETED" | "NO_PAYMENT_RECORD" | "FILE_ISSUE" | "TODAY_MINE"
  ) => {
    const q = new URLSearchParams(baseQuery.toString());
    if (filter === "ALL") q.delete("queueFilter");
    else q.set("queueFilter", filter);
    return `/admin/receipts-approvals?${q.toString()}`;
  };
  const queueBucketHref = (bucket: "ALL" | "MINE" | "OPEN" | "HISTORY") => {
    const q = new URLSearchParams(baseQuery.toString());
    if (bucket === "ALL") q.delete("queueBucket");
    else q.set("queueBucket", bucket);
    return `/admin/receipts-approvals?${q.toString()}`;
  };
  const globalQueueQuery = new URLSearchParams(baseQuery.toString());
  globalQueueQuery.delete("packageId");
  globalQueueQuery.delete("step");
  globalQueueQuery.delete("paymentRecordId");
  globalQueueQuery.delete("invoiceId");
  const globalQueueHref = globalQueueQuery.toString()
    ? `/admin/receipts-approvals?${globalQueueQuery.toString()}`
    : "/admin/receipts-approvals";
  const packageWorkspaceMode = Boolean(packageIdFilter);

  const parentQueue = rows.map((r) => {
    const pkg = packageMap.get(r.packageId);
    const inv = r.invoiceId ? invoiceMap.get(r.invoiceId) : null;
    const pay = r.paymentRecordId ? parentPaymentRecordMap.get(r.paymentRecordId) : null;
    const approval = approvalMap.get(r.id) ?? {
      managerApprovedBy: [],
      financeApprovedBy: [],
      managerRejectReason: null,
      financeRejectReason: null,
    };
    const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
    const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
    const status: "COMPLETED" | "REJECTED" | "PENDING" = managerReady && financeReady
      ? "COMPLETED"
      : approval.managerRejectReason || approval.financeRejectReason
        ? "REJECTED"
        : "PENDING";
    const paymentFileMissing = Boolean(pay && !(paymentRecordFileMap.get(pay.id) ?? false));
    const amountDiff = Math.abs((Number(r.amountReceived) || 0) - (Number(inv?.totalAmount ?? 0) || 0));
    const riskCount = (pay ? 0 : 1) + (paymentFileMissing ? 1 : 0) + (amountDiff > 0.01 ? 1 : 0);
    return {
      id: r.id,
      type: "PARENT" as const,
      receiptNo: r.receiptNo,
      receiptDate: r.receiptDate,
      invoiceNo: inv?.invoiceNo ?? "-",
      partyName: pkg?.student?.name ?? "-",
      mode: "-",
      amountReceived: r.amountReceived,
      invoiceTotalAmount: Number(inv?.totalAmount ?? 0) || 0,
      approval,
      status,
      paymentRecord: pay ? { id: pay.id, name: pay.originalFileName, path: parentPaymentRecordFileHref(pay.id), date: pay.paymentDate } : null,
      paymentFileMissing,
      riskCount,
      packageId: r.packageId,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      exportHref: `/api/exports/parent-receipt/${encodeURIComponent(r.id)}`,
    };
  });

  const partnerQueue = partnerRows.map((r) => {
    const inv = partnerInvoiceMap.get(r.invoiceId);
    const pay = r.paymentRecordId ? partnerPaymentRecordMap.get(r.paymentRecordId) : null;
    const approval = partnerApprovalMap.get(r.id) ?? {
      managerApprovedBy: [],
      financeApprovedBy: [],
      managerRejectReason: null,
      financeRejectReason: null,
    };
    const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
    const financeReady = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
    const status: "COMPLETED" | "REJECTED" | "PENDING" = managerReady && financeReady
      ? "COMPLETED"
      : approval.managerRejectReason || approval.financeRejectReason
        ? "REJECTED"
        : "PENDING";
    const amountDiff = Math.abs((Number(r.amountReceived) || 0) - (Number(inv?.totalAmount ?? 0) || 0));
    const riskCount = (pay ? 0 : 1) + (amountDiff > 0.01 ? 1 : 0);
    return {
      id: r.id,
      type: "PARTNER" as const,
      receiptNo: r.receiptNo,
      receiptDate: r.receiptDate,
      invoiceNo: inv?.invoiceNo ?? "-",
      partyName: inv?.billTo || "Partner",
      mode: r.mode,
      amountReceived: r.amountReceived,
      invoiceTotalAmount: Number(inv?.totalAmount ?? 0) || 0,
      approval,
      status,
      paymentRecord: pay ? { id: pay.id, name: pay.originalFileName, path: pay.relativePath, date: pay.paymentDate } : null,
      paymentFileMissing: false,
      riskCount,
      packageId: "",
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      exportHref: `/api/exports/partner-receipt/${encodeURIComponent(r.id)}`,
    };
  });

  let unifiedQueue = viewMode === "PARENT" ? parentQueue : viewMode === "PARTNER" ? partnerQueue : [...parentQueue, ...partnerQueue];
  if (queueFilter === "PENDING") unifiedQueue = unifiedQueue.filter((x) => x.status === "PENDING");
  if (queueFilter === "REJECTED") unifiedQueue = unifiedQueue.filter((x) => x.status === "REJECTED");
  if (queueFilter === "COMPLETED") unifiedQueue = unifiedQueue.filter((x) => x.status === "COMPLETED");
  if (queueFilter === "NO_PAYMENT_RECORD") unifiedQueue = unifiedQueue.filter((x) => !x.paymentRecord);
  if (queueFilter === "FILE_ISSUE") unifiedQueue = unifiedQueue.filter((x) => !x.paymentRecord || Boolean(x.paymentFileMissing));
  if (queueFilter === "TODAY_MINE") {
    const todayPrefix = `${today} `;
    unifiedQueue = unifiedQueue.filter((x: any) => {
      const createdBy = String(x.createdBy ?? "").trim().toLowerCase();
      const createdAt = String(x.createdAt ?? "");
      return createdBy === String(actorEmail).trim().toLowerCase() || createdAt.startsWith(todayPrefix) || createdAt.startsWith(today);
    });
  }
  unifiedQueue = unifiedQueue.sort((a, b) => {
    const aPriority = queuePriority(a.status, (a.riskCount ?? 0) > 0, !a.paymentRecord, Boolean(a.paymentFileMissing));
    const bPriority = queuePriority(b.status, (b.riskCount ?? 0) > 0, !b.paymentRecord, Boolean(b.paymentFileMissing));
    if (aPriority !== bPriority) return aPriority - bPriority;
    if ((a.riskCount ?? 0) !== (b.riskCount ?? 0)) return (b.riskCount ?? 0) - (a.riskCount ?? 0);
    return (normalizeDateOnly(b.receiptDate) ?? "").localeCompare(normalizeDateOnly(a.receiptDate) ?? "");
  });
  const actionableQueue = unifiedQueue.filter((x) => x.status !== "COMPLETED");
  const completedQueue = unifiedQueue.filter((x) => x.status === "COMPLETED");
  const mineQueue = actionableQueue.filter((x) => {
    const managerTodo = isManagerApprover && x.approval.managerApprovedBy.length < roleCfg.managerApproverEmails.length;
    const financeTodo = isFinanceApprover && x.approval.financeApprovedBy.length < roleCfg.financeApproverEmails.length;
    return managerTodo || financeTodo;
  });
  const otherQueue = actionableQueue.filter((x) => !mineQueue.some((mine) => mine.type === x.type && mine.id === x.id));
  const visibleMineQueue = queueBucket === "OPEN" || queueBucket === "HISTORY" ? [] : mineQueue;
  const visibleOtherQueue = queueBucket === "MINE" || queueBucket === "HISTORY" ? [] : otherQueue;
  const visibleCompletedQueue = queueBucket === "MINE" || queueBucket === "OPEN" ? [] : completedQueue;
  const defaultVisibleQueue =
    queueBucket === "MINE"
      ? visibleMineQueue
      : queueBucket === "OPEN"
        ? [...visibleMineQueue, ...visibleOtherQueue]
        : queueBucket === "HISTORY"
          ? visibleCompletedQueue
          : [...visibleMineQueue, ...visibleOtherQueue, ...visibleCompletedQueue];
  const selectedRow =
    unifiedQueue.find((x) => x.type === selectedType && x.id === selectedId) ??
    defaultVisibleQueue[0] ??
    null;
  const activeQueueForNavigation =
    selectedRow?.status === "COMPLETED"
      ? visibleCompletedQueue
      : [...visibleMineQueue, ...visibleOtherQueue];
  const selectedRowIndex = selectedRow
    ? activeQueueForNavigation.findIndex((x) => x.type === selectedRow.type && x.id === selectedRow.id)
    : -1;
  const nextQueueRow =
    selectedRowIndex >= 0
      ? activeQueueForNavigation[selectedRowIndex + 1] ?? activeQueueForNavigation[selectedRowIndex - 1] ?? null
      : activeQueueForNavigation[0] ?? null;
  const selectedActionNextHref = nextQueueRow
    ? openHref(nextQueueRow.type, nextQueueRow.id)
    : selectedRow
      ? openHref(selectedRow.type, selectedRow.id)
      : `/admin/receipts-approvals?${baseQuery.toString()}`;
  const actionMovedToNext =
    Boolean(msg) &&
    Boolean(selectedId) &&
    Boolean(selectedRow) &&
    `${selectedType}:${selectedId}` !== `${selectedRow.type}:${selectedRow.id}`;
  const currentRoleFocus = isFinanceApprover
    ? t(lang, "Finance actions", "财务操作")
    : isManagerApprover
      ? t(lang, "Manager actions", "管理操作")
      : t(lang, "View only", "仅查看");
  const selectedRowAmountDiff =
    selectedRow ? Math.abs((Number(selectedRow.amountReceived) || 0) - (Number(selectedRow.invoiceTotalAmount) || 0)) : 0;
  const selectedRiskMessages: string[] = [];
  if (selectedRow) {
    if (!selectedRow.paymentRecord) {
      selectedRiskMessages.push(t(lang, "No linked payment record.", "未绑定缴费记录。"));
    }
    if (selectedRow.paymentFileMissing) {
      selectedRiskMessages.push(t(lang, "Payment file is missing.", "缴费文件缺失。"));
    }
    if (selectedRowAmountDiff > 0.01) {
      selectedRiskMessages.push(
        t(lang, "Amount differs from invoice total.", "收据金额与发票总额不一致。")
      );
    }
  }
  const selectedRiskActions = selectedRiskMessages.map((line) => {
    if (line.includes("No linked payment record") || line.includes("未绑定缴费记录")) {
      return t(lang, "Next step: open fix tools and link a payment proof.", "下一步：打开修复工具并绑定缴费记录。");
    }
    if (line.includes("Payment file is missing") || line.includes("缴费文件缺失")) {
      return t(lang, "Next step: open fix tools and re-upload the payment file.", "下一步：打开修复工具并重新上传缴费文件。");
    }
    if (line.includes("Amount differs from invoice total") || line.includes("收据金额与发票总额不一致")) {
      return t(lang, "Next step: confirm the invoice and receipt amounts before approval.", "下一步：批准前先核对发票金额和收据金额。");
    }
    return null;
  }).filter((line): line is string => Boolean(line));
  const approveAndNextLabel = nextQueueRow
    ? t(lang, "Approve & next", "批准并下一条")
    : t(lang, "Approve", "批准");
  const rejectAndNextLabel = nextQueueRow
    ? t(lang, "Reject & next", "驳回并下一条")
    : t(lang, "Reject", "驳回");
  const isRepairWorkspaceResult =
    msg === "Payment record uploaded" ||
    msg === "Payment record replaced" ||
    msg === "Payment record deleted" ||
    msg === "Receipt created";
  const selectedRepairReady =
    Boolean(selectedRow) &&
    Boolean(selectedRow.paymentRecord) &&
    !selectedRow.paymentFileMissing &&
    selectedRiskMessages.length === 0;
  const selectedPrimaryActionsHref =
    selectedRow && selectedRow.status !== "COMPLETED" ? `${selectedReviewHref}#receipt-primary-actions` : "";
  const selectedFixToolsHref =
    selectedRow && selectedRow.type === "PARENT"
      ? `/admin/receipts-approvals?packageId=${encodeURIComponent(selectedRow.packageId)}&step=create&selectedType=${encodeURIComponent(selectedRow.type)}&selectedId=${encodeURIComponent(selectedRow.id)}`
      : "";
  const recentOps = [
    ...all.paymentRecords.map((x) => ({
      id: `pay-${x.id}`,
      kind: "PAYMENT_UPLOAD" as const,
      packageId: x.packageId,
      actor: x.uploadedBy,
      at: x.uploadedAt,
      title: x.originalFileName,
    })),
    ...all.invoices.map((x) => ({
      id: `inv-${x.id}`,
      kind: "INVOICE_CREATE" as const,
      packageId: x.packageId,
      actor: x.createdBy,
      at: x.createdAt,
      title: x.invoiceNo,
    })),
    ...all.receipts.map((x) => ({
      id: `rc-${x.id}`,
      kind: "RECEIPT_CREATE" as const,
      packageId: x.packageId,
      actor: x.createdBy,
      at: x.createdAt,
      title: x.receiptNo,
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 8);
  const queueBlockerCount = actionableQueue.filter(
    (x) => !x.paymentRecord || Boolean(x.paymentFileMissing) || (x.riskCount ?? 0) > 0
  ).length;
  const queueMissingProofCount = actionableQueue.filter((x) => !x.paymentRecord).length;
  const queueMissingFileCount = actionableQueue.filter((x) => Boolean(x.paymentFileMissing)).length;
  const queueFileIssueCount = actionableQueue.filter((x) => !x.paymentRecord || Boolean(x.paymentFileMissing)).length;
  const packageWorkspaceRiskCount = packageWorkspaceMode
    ? [missingPaymentFileCount > 0, pendingReceiptAmount > 0, uninvoicedPaidAmount > 0].filter(Boolean).length
    : 0;
  const controlsOpen =
    Boolean(packageIdFilter) ||
    Boolean(monthFilter) ||
    viewMode !== "ALL" ||
    queueFilter !== "ALL" ||
    queueBucket !== "ALL";
  const rememberedQueueValue = (() => {
    const params = new URLSearchParams();
    if (monthFilter) params.set("month", monthFilter);
    if (viewMode !== "ALL") params.set("view", viewMode);
    if (queueFilter !== "ALL") params.set("queueFilter", queueFilter);
    if (queueBucket !== "ALL") params.set("queueBucket", queueBucket);
    return params.toString();
  })();

  return (
    <div>
      {!packageWorkspaceMode ? (
        <RememberedWorkbenchQueryClient
          cookieKey={RECEIPTS_QUEUE_COOKIE}
          storageKey="adminReceiptsPreferredQueue"
          value={rememberedQueueValue}
        />
      ) : null}
      <h2>{t(lang, "Receipt Approval Center", "收据审批中心")}</h2>
      {err ? (
        <div style={{ marginBottom: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>
          {t(lang, "Error", "错误")}: {err}
        </div>
      ) : null}
      {msg ? (
        <div style={{ marginBottom: 12, color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px" }}>
          {t(lang, "Success", "成功")}: {describeReceiptActionResult(lang, msg, actionMovedToNext)}
        </div>
      ) : null}

      <div style={workbenchHeroStyle("indigo")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#3730a3", letterSpacing: 0.4 }}>
            {packageWorkspaceMode ? t(lang, "Package Mode", "课包模式") : t(lang, "Global Queue Mode", "全局队列模式")}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
            {packageWorkspaceMode
              ? t(lang, "Finish one package cleanly, then return to the queue", "先把单个课包处理干净，再返回队列")
              : t(lang, "Pick the next blocked receipt and clear it", "选中下一条被阻塞的收据并清掉它")}
          </div>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {packageWorkspaceMode && selectedPackage
              ? `${selectedPackage.student.name} | ${selectedPackage.course.name}`
              : t(
                  lang,
                  "Use the queue for prioritization, then use the workspace below only for the package or receipt you are actively resolving.",
                  "先用队列确定优先级，再只在下方工作区处理当前正在解决的课包或收据。"
                )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{bilingualLabel("My next actions", "我待处理的")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#1d4ed8" }}>{mineQueue.length}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Items currently waiting on my role.", "当前需要我这个角色处理的项。")}</div>
          </div>
          <div style={workbenchMetricCardStyle("amber")}>
            <div style={workbenchMetricLabelStyle("amber")}>{bilingualLabel("Open work", "未完成工作")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#c2410c" }}>{actionableQueue.length}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Pending and rejected receipts still in circulation.", "仍在流转中的待审批和已驳回收据。")}</div>
          </div>
          <div style={workbenchMetricCardStyle("rose")}>
            <div style={workbenchMetricLabelStyle("rose")}>{bilingualLabel("Blockers", "阻塞项")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#be123c" }}>{queueBlockerCount}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Missing proof, missing file, or risky rows.", "缺少凭证、文件缺失或高风险行。")}</div>
          </div>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{packageWorkspaceMode ? t(lang, "Package risks", "课包风险") : bilingualLabel("Completed history", "已完成历史")}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#3730a3" }}>
              {packageWorkspaceMode ? packageWorkspaceRiskCount : completedQueue.length}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {packageWorkspaceMode
                ? t(lang, "Missing files, pending receipt amount, or paid-not-invoiced issues.", "文件缺失、待开收据金额或已付未开票问题。")
                : t(lang, "Receipts already fully completed.", "已经完成的收据历史。")}
            </div>
          </div>
        </div>
      </div>

      {!packageWorkspaceMode && resumedRememberedQueue ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1d4ed8",
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {t(
              lang,
              "Resumed your last receipt queue. Use the chips below if you want to jump back to the default queue.",
              "已恢复你上次的收据队列；如果要回到默认队列，可直接用下方标签切回。"
            )}
          </div>
          <a href="/admin/receipts-approvals?clearQueue=1">{t(lang, "Back to default queue", "回到默认队列")}</a>
        </div>
      ) : null}

      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ ...tagStyle("muted"), borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
          {t(lang, "Month", "月份")}: {monthFilter || t(lang, "All months", "全部月份")}
        </span>
        <span style={{ ...tagStyle(viewMode === "ALL" ? "muted" : "ok"), borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
          {t(lang, "View", "视图")}: {viewMode === "ALL" ? t(lang, "All", "全部") : viewMode === "PARENT" ? t(lang, "Parent", "家长") : t(lang, "Partner", "合作方")}
        </span>
        <span style={{ ...tagStyle(queueFilter === "ALL" ? "muted" : "warn"), borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
          {t(lang, "Queue filter", "队列筛选")}: {queueFilter}
        </span>
        <span style={{ ...tagStyle(packageWorkspaceMode ? "ok" : "muted"), borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
          {packageWorkspaceMode ? t(lang, "Package workspace active", "当前课包工作区已启用") : t(lang, "Working from global queue", "当前从全局队列工作")}
        </span>
        <span style={{ ...tagStyle(queueFileIssueCount > 0 ? "err" : "muted"), borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
          {t(lang, "Proof or file issues", "凭证或文件异常")}: {queueFileIssueCount}
        </span>
      </div>

      <div
        style={{
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${queueFileIssueCount > 0 ? "#fecaca" : "#e2e8f0"}`,
          background: queueFileIssueCount > 0 ? "#fff7f7" : "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 700, color: queueFileIssueCount > 0 ? "#b91c1c" : "#334155" }}>
            {t(lang, "Attachment triage", "附件异常分诊")}
          </div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              `Missing payment record: ${queueMissingProofCount}. Missing file on linked proof: ${queueMissingFileCount}.`,
              `缺少付款记录：${queueMissingProofCount}。已关联凭证但文件缺失：${queueMissingFileCount}。`
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={queueFilterHref("FILE_ISSUE")}>{t(lang, "Open proof or file issues", "查看凭证或文件异常")}</a>
          <a href="/admin/recovery/uploads?source=package_payment">{t(lang, "Open attachment health desk", "打开附件异常总览")}</a>
          {queueFilter !== "ALL" ? <a href={queueFilterHref("ALL")}>{t(lang, "Back to all queue items", "返回全部队列")}</a> : null}
        </div>
      </div>

      <details open={controlsOpen} style={{ ...workbenchFilterPanelStyle, marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Queue filters & mode controls", "队列筛选与模式控制")}
        </summary>
        <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>
          {t(
            lang,
            "Use this area only when you need to switch queue scope, open a package workspace, or move between review steps.",
            "只有在需要切换队列范围、打开单个课包工作区或切换审核步骤时，再展开这里。"
          )}
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {workflowStep !== "upload" ? <input type="hidden" name="step" value={workflowStep} /> : null}
            {queueFilter !== "ALL" ? <input type="hidden" name="queueFilter" value={queueFilter} /> : null}
            {preferredPaymentRecordId ? <input type="hidden" name="paymentRecordId" value={preferredPaymentRecordId} /> : null}
            {preferredInvoiceId ? <input type="hidden" name="invoiceId" value={preferredInvoiceId} /> : null}
            <label>
              {t(lang, "Package ID", "课包ID")}
              <input name="packageId" defaultValue={packageIdFilter} style={{ marginLeft: 6, minWidth: 260 }} />
            </label>
            <label>
              {t(lang, "Month", "月份")}
              <input name="month" type="month" defaultValue={monthFilter} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {t(lang, "View", "视图")}
              <select name="view" defaultValue={viewMode} style={{ marginLeft: 6 }}>
                <option value="ALL">{t(lang, "All", "全部")}</option>
                <option value="PARENT">{t(lang, "Parent", "家长")}</option>
                <option value="PARTNER">{t(lang, "Partner", "合作方")}</option>
              </select>
            </label>
            <button type="submit">{t(lang, "Filter", "筛选")}</button>
            <a href="/admin/receipts-approvals?clearQueue=1">{t(lang, "Reset", "重置")}</a>
          </form>
          {packageIdFilter ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Workflow", "流程")}</span>
              {([
                ["upload", t(lang, "Step 1 Upload", "步骤1 上传")],
                ["records", t(lang, "Step 2 Check Records", "步骤2 查看记录")],
                ["create", t(lang, "Step 3 Create Receipt", "步骤3 创建收据")],
                ["review", t(lang, "Step 4 Review Queue", "步骤4 审核队列")],
              ] as const).map(([step, label]) => (
                <a
                  key={step}
                  href={stepHref(step)}
                  style={{
                    border: workflowStep === step ? "1px solid #2563eb" : "1px solid #d1d5db",
                    background: workflowStep === step ? "#eff6ff" : "#fff",
                    color: workflowStep === step ? "#1d4ed8" : "#374151",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </details>

      {packageIdFilter && selectedType && selectedId ? (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: "8px 10px" }}>
          <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{t(lang, "Fix flow", "修复回流")}</span>
          <span style={{ color: "#334155", fontSize: 13 }}>
            {t(lang, "After updating the proof or receipt setup, return here to continue the same review item.", "修复缴费凭证或收据设置后，可回到这里继续处理同一张收据。")}
          </span>
          <a href={selectedReviewHref}>{t(lang, "Back to selected receipt", "返回当前收据")}</a>
        </div>
      ) : null}
      {packageIdFilter && selectedType && selectedId && isRepairWorkspaceResult && selectedRow ? (
        <div
          style={{
            marginBottom: 12,
            display: "grid",
            gap: 6,
            border: `1px solid ${selectedRepairReady ? "#86efac" : "#fcd34d"}`,
            background: selectedRepairReady ? "#f0fdf4" : "#fffbeb",
            borderRadius: 10,
            padding: "10px 12px",
            color: selectedRepairReady ? "#166534" : "#92400e",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {selectedRepairReady
              ? t(lang, "Repair complete. Continue review now.", "修复已完成，现在可以继续审核。")
              : t(lang, "Repair step saved. One more check is still needed.", "修复步骤已保存，但还需要再检查一次。")}
          </div>
          <div style={{ fontSize: 13 }}>
            {selectedRepairReady
              ? t(lang, "The proof is now linked and no receipt-level risk is blocking this item, so the approval controls below are the main next step.", "当前凭证已可用，且这条收据没有剩余风险项；下方审批操作现在就是主步骤。")
              : t(lang, "You are back on the same receipt, but proof linking, file health, or amount checks still show a blocker below.", "你已经回到同一张收据，但下方仍有凭证、文件或金额核对项没有通过。")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {selectedRepairReady && selectedPrimaryActionsHref ? (
              <a href={selectedPrimaryActionsHref}>{t(lang, "Jump to approval controls", "跳到审批操作")}</a>
            ) : null}
            {!selectedRepairReady && selectedFixToolsHref ? (
              <a href={selectedFixToolsHref}>{t(lang, "Open fix tools again", "重新打开修复工具")}</a>
            ) : null}
            <a href={selectedReviewHref}>{t(lang, "Stay on this receipt", "继续查看当前收据")}</a>
          </div>
        </div>
      ) : null}
      {packageWorkspaceMode && selectedPackage ? (
        <div style={{ marginBottom: 12, display: "grid", gap: 8, border: "1px solid #bfdbfe", background: "#f8fbff", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#1d4ed8" }}>
                {t(lang, "Package finance workspace", "课包财务工作区")}
              </div>
              <div style={{ color: "#334155", marginTop: 2 }}>
                {selectedPackage.student.name} | {selectedPackage.course.name}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={globalQueueHref}>{t(lang, "Back to global receipt queue", "返回统一收据队列")}</a>
              <a href={stepHref("review")}>{t(lang, "Open package review step", "打开当前课包审核步骤")}</a>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ ...tagStyle("muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
              {t(lang, "Package ID", "课包ID")}: {packageIdFilter}
            </span>
            <span style={{ ...tagStyle("warn"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
              {t(lang, "Current step", "当前步骤")}: {workflowStep === "upload"
                ? t(lang, "Upload proof", "上传凭证")
                : workflowStep === "records"
                  ? t(lang, "Check records", "查看记录")
                  : workflowStep === "create"
                    ? t(lang, "Create receipt", "创建收据")
                    : t(lang, "Review queue", "审核队列")}
            </span>
            <span style={{ ...tagStyle("ok"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
              {t(lang, "Package mode active", "当前处于课包模式")}
            </span>
          </div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              "You are now working inside one package. Use the workspace below to upload proof, check records, and create a receipt. Return to the global queue when this package is done.",
              "你现在正在处理单个课包。请使用下方工作区上传凭证、查看记录并创建收据。处理完成后再返回统一收据队列。"
            )}
          </div>
          {selectedType && selectedId ? (
            <div style={{ color: "#1d4ed8", fontSize: 13 }}>
              {t(
                lang,
                "Repair actions in this workspace will return you to the selected receipt review item.",
                "在这个工作区里的修复操作完成后，会自动带你回到当前选中的收据审核项。"
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <details style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 12, background: "#fafafa" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          {t(lang, "Recent Finance Actions", "最近财务操作")} ({recentOps.length})
        </summary>
        {recentOps.length === 0 ? (
          <div style={{ marginTop: 8, color: "#6b7280" }}>{t(lang, "No recent actions.", "暂无最近操作。")}</div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {recentOps.map((op) => {
              const pkg = opPackageMap.get(op.packageId);
              const actionLabel =
                op.kind === "PAYMENT_UPLOAD"
                  ? t(lang, "Payment upload", "上传缴费记录")
                  : op.kind === "INVOICE_CREATE"
                    ? t(lang, "Invoice created", "创建发票")
                    : t(lang, "Receipt created", "创建收据");
              const openPkgHref = `/admin/receipts-approvals?packageId=${encodeURIComponent(op.packageId)}&step=records`;
              return (
                <div key={op.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px", background: "#fff", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 2 }}>
                    <div style={{ fontWeight: 600 }}>{actionLabel}: {op.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {pkg ? `${pkg.student.name} | ${pkg.course.name}` : op.packageId}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {formatBusinessDateTime(new Date(op.at))} · {op.actor}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <a href={openPkgHref}>{t(lang, "Open package", "打开课包")}</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </details>

      {!packageIdFilter ? (
        <details style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            {t(lang, "Open one package workspace", "打开单个课包工作区")}
          </summary>
          <form
            method="get"
            className="ts-filter-bar"
            style={{ marginTop: 10 }}
          >
            {viewMode !== "ALL" ? <input type="hidden" name="view" value={viewMode} /> : null}
            {monthFilter ? <input type="hidden" name="month" value={monthFilter} /> : null}
            <label style={{ display: "grid", gap: 6, minWidth: 0, width: "100%" }}>
              {t(lang, "Quick Select Package", "快捷选择课包")}
              <select name="packageId" defaultValue="" style={{ width: "100%", minWidth: 0, maxWidth: 420 }}>
                <option value="" disabled>
                  {t(lang, "Select package to open finance operations", "选择课包以打开财务操作")}
                </option>
                {packageIdsFromInvoices
                  .map((id) => {
                    const pkg = invoicePackageMap.get(id);
                    const invoiceCount = invoiceCountByPackage.get(id) ?? 0;
                    const receiptCount = receiptCountByPackage.get(id) ?? 0;
                    const remaining = Math.max(0, invoiceCount - receiptCount);
                    return {
                      id,
                      label: `${pkg?.student?.name ?? "Unknown"} | ${pkg?.course?.name ?? "-"} | ${id.slice(0, 8)}... | Invoices ${invoiceCount}, Receipts ${receiptCount}, Pending ${remaining}`,
                    };
                  })
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit">{t(lang, "Open Finance Operations", "打开财务操作")}</button>
          </form>
        </details>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Finance Receipt Operations", "财务收据操作")}</h3>
        {!packageIdFilter ? (
          <div style={{ color: "#666" }}>
            {t(lang, "Enter a Package ID above to upload payment records and create receipts.", "请先输入课包ID，再上传缴费记录和创建收据。")}
          </div>
        ) : !selectedPackage ? (
          <div style={{ color: "#b00" }}>{t(lang, "Package not found", "课包不存在")}: {packageIdFilter}</div>
        ) : !financeOpsEnabled ? (
          <div style={{ color: "#92400e" }}>
            {t(lang, "Only finance can manage payment records and create receipts.", "仅财务可管理缴费记录并创建收据。")}
          </div>
        ) : !selectedBilling ? (
          <div style={{ color: "#b00" }}>{t(lang, "Unable to load billing data for this package.", "无法加载该课包账单数据。")}</div>
        ) : (
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
              {t(lang, "Current package finance workspace", "当前课包财务工作区")}
            </summary>
            <div style={{ marginBottom: 10 }}>
              <b>{t(lang, "Student", "学生")}:</b> {selectedPackage.student.name} | <b>{t(lang, "Course", "课程")}:</b> {selectedPackage.course.name}
            </div>
            <div style={{ marginBottom: 10, color: "#666" }}>
              {t(
                lang,
                "This area is split into 3 blocks: upload payment proof, check existing records, create receipt.",
                "该区域已拆分为3个模块：上传缴费凭证、查看已上传记录、创建收据。"
              )}
            </div>
            <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc", padding: 8 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Paid amount", "已缴费金额")}</div>
                <div style={{ fontWeight: 700 }}>{money(paidAmount)}</div>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc", padding: 8 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Invoiced amount", "已开票金额")}</div>
                <div style={{ fontWeight: 700 }}>{money(totalInvoicedAmount)}</div>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc", padding: 8 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Receipted amount", "已开收据金额")}</div>
                <div style={{ fontWeight: 700 }}>{money(totalReceiptAmount)}</div>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc", padding: 8 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{t(lang, "Pending receipt amount", "待开收据金额")}</div>
                <div style={{ fontWeight: 700, color: pendingReceiptAmount > 0 ? "#92400e" : "#166534" }}>{money(pendingReceiptAmount)}</div>
              </div>
            </div>
            <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...tagStyle(usablePaymentRecordCount > 0 ? "ok" : "muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                {t(lang, "Usable payment files", "可用付款文件")}: {usablePaymentRecordCount}
              </span>
              <span style={{ ...tagStyle(missingPaymentFileCount > 0 ? "err" : "ok"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                {t(lang, "Missing files", "文件缺失")}: {missingPaymentFileCount}
              </span>
              <span style={{ ...tagStyle(linkedPaymentRecordCount > 0 ? "warn" : "muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                {t(lang, "Linked to receipt", "已绑定收据")}: {linkedPaymentRecordCount}
              </span>
              <span style={{ ...tagStyle(uninvoicedPaidAmount > 0 ? "warn" : "ok"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                {t(lang, "Paid but not invoiced", "已缴费未开票")}: {money(uninvoicedPaidAmount)}
              </span>
            </div>

            <details open={workflowStep === "upload"} style={{ marginBottom: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {t(lang, "1) Upload Payment Record", "1）上传缴费记录")}
              </summary>
              <form
                action={uploadPaymentRecordAction}
                encType="multipart/form-data"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 8 }}
              >
                <input type="hidden" name="packageId" value={packageIdFilter} />
                <input type="hidden" name="nextHref" value={selectedRepairReturnHref} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                  <label>Payment Proof
                    <input
                      name="paymentProof"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      required
                      style={{ width: "100%" }}
                    />
                  </label>
                  <label>{t(lang, "Payment Date", "付款日期")}<input name="paymentDate" type="date" style={{ width: "100%" }} /></label>
                  <label>{t(lang, "Payment Method", "付款方式")}
                    <select name="paymentMethod" defaultValue="" style={{ width: "100%" }}>
                      <option value="">{t(lang, "(optional)", "（可选）")}</option>
                      <option value="Paynow">Paynow</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank transfer">{t(lang, "Bank transfer", "银行转账")}</option>
                    </select>
                  </label>
                  <label>{t(lang, "Reference No.", "参考号")}<input name="referenceNo" placeholder="UTR / Txn Id" style={{ width: "100%" }} /></label>
                  <label>{t(lang, "Replace Existing", "替换现有记录")}
                    <select name="replacePaymentRecordId" defaultValue="" style={{ width: "100%" }}>
                      <option value="">{t(lang, "(new record)", "（新记录）")}</option>
                      {selectedBilling.paymentRecords.map((r) => (
                        <option key={r.id} value={r.id}>
                          {formatBusinessDateOnly(new Date(r.uploadedAt))} - {r.originalFileName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>Note / 备注
                    <input name="paymentNote" placeholder={t(lang, "Note", "备注")} style={{ width: "100%" }} />
                  </label>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button type="submit">{t(lang, "Upload", "上传")}</button>
                </div>
              </form>
            </details>

            <details open={workflowStep === "records"} style={{ marginBottom: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {t(lang, "2) Existing Payment Records", "2）已上传缴费记录")}
              </summary>
              <div style={{ marginTop: 8 }}>
                {selectedBilling.paymentRecords.length === 0 ? (
                  <div style={{ color: "#666", marginBottom: 12 }}>{t(lang, "No payment records yet.", "暂无缴费记录")}</div>
                ) : (
                  <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6" }}>
                        <th align="left">{t(lang, "Time", "时间")}</th>
                        <th align="left">{t(lang, "Payment Date", "付款日期")}</th>
                        <th align="left">{t(lang, "Method", "方式")}</th>
                        <th align="left">{t(lang, "Reference", "参考号")}</th>
                        <th align="left">{t(lang, "File", "文件")}</th>
                        <th align="left">{t(lang, "Preview", "预览")}</th>
                        <th align="left">Note</th>
                        <th align="left">{t(lang, "By", "上传人")}</th>
                        <th align="left">{t(lang, "Status", "状态")}</th>
                        <th align="left">{t(lang, "Delete", "删除")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBilling.paymentRecords.map((r) => {
                        const fileExists = paymentRecordFileMap.get(r.id) ?? false;
                        const linked = linkedPaymentRecordIdSet.has(r.id);
                        return (
                          <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                            <td>{formatBusinessDateTime(new Date(r.uploadedAt))}</td>
                            <td>{r.paymentDate ? normalizeDateOnly(r.paymentDate) ?? "-" : "-"}</td>
                            <td>{r.paymentMethod || "-"}</td>
                            <td>{r.referenceNo || "-"}</td>
                            <td>
                              {fileExists ? (
                                <a href={parentPaymentRecordFileHref(r.id)} target="_blank" rel="noreferrer">
                                  {t(lang, "Open File", "打开文件")}
                                </a>
                              ) : (
                                <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                                  {t(lang, "File missing", "文件缺失")}
                                </span>
                              )}
                            </td>
                            <td>
                              {!fileExists ? (
                                <span style={{ color: "#b91c1c" }}>
                                  {t(lang, "Missing file, please re-upload", "文件已丢失，请重新上传")}
                                </span>
                              ) : isImageFile(r.relativePath) || isImageFile(r.originalFileName) ? (
                                <ImagePreviewWithFallback
                                  src={parentPaymentRecordFileHref(r.id)}
                                  alt={r.originalFileName}
                                  href={parentPaymentRecordFileHref(r.id)}
                                  noPreviewLabel={t(lang, "No preview", "无法预览")}
                                />
                              ) : (
                                <span style={{ color: "#666" }}>{t(lang, "No preview", "无法预览")}</span>
                              )}
                            </td>
                            <td>{r.note ?? "-"}</td>
                            <td>{r.uploadedBy}</td>
                            <td>
                              {!fileExists ? (
                                <span style={{ ...tagStyle("err"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                                  {t(lang, "Missing file", "文件缺失")}
                                </span>
                              ) : linked ? (
                                <span style={{ ...tagStyle("warn"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                                  {t(lang, "Linked receipt", "已绑定收据")}
                                </span>
                              ) : (
                                <span style={{ ...tagStyle("ok"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                                  {t(lang, "Ready to use", "可直接使用")}
                                </span>
                              )}
                            </td>
                            <td>
                              <form action={deletePaymentRecordAction}>
                                <input type="hidden" name="packageId" value={packageIdFilter} />
                                <input type="hidden" name="recordId" value={r.id} />
                                <input type="hidden" name="nextHref" value={selectedRepairReturnHref} />
                                <button type="submit">{t(lang, "Delete", "删除")}</button>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </details>

            <details open={workflowStep === "create"}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {t(lang, "3) Create Receipt", "3）创建收据")}
              </summary>
              <div style={{ marginTop: 8, marginBottom: 8, border: "1px dashed #d1d5db", borderRadius: 8, background: "#f8fafc", padding: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t(lang, "Before create: check key fields", "创建前请确认关键字段")}</div>
                <div style={{ color: "#374151", fontSize: 13 }}>
                  {t(lang, "Source invoice, Received From, Paid By, and Amount Received must be correct.", "请确认来源发票、收款对象、付款方式与实收金额。")}
                </div>
              </div>
              <form method="get" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, display: "grid", gap: 8 }}>
                <input type="hidden" name="packageId" value={packageIdFilter} />
                {monthFilter ? <input type="hidden" name="month" value={monthFilter} /> : null}
                {viewMode !== "ALL" ? <input type="hidden" name="view" value={viewMode} /> : null}
                <input type="hidden" name="step" value="create" />
                {queueFilter !== "ALL" ? <input type="hidden" name="queueFilter" value={queueFilter} /> : null}
                {queueBucket !== "ALL" ? <input type="hidden" name="queueBucket" value={queueBucket} /> : null}
                {selectedType ? <input type="hidden" name="selectedType" value={selectedType} /> : null}
                {selectedId ? <input type="hidden" name="selectedId" value={selectedId} /> : null}
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t(lang, "Smart fill source", "智能带入来源")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                  <label>{t(lang, "Invoice", "发票")}
                    <select name="invoiceId" defaultValue={selectedCreateInvoice?.id ?? ""} style={{ width: "100%" }}>
                      <option value="">{t(lang, "(auto first available)", "（默认首个可用）")}</option>
                      {availableInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>{inv.invoiceNo} / {money(inv.totalAmount)}</option>
                      ))}
                    </select>
                  </label>
                  <label>{t(lang, "Payment Record", "付款记录")}
                    <select name="paymentRecordId" defaultValue={selectedCreatePaymentRecord?.id ?? ""} style={{ width: "100%" }}>
                      <option value="">{t(lang, "(optional)", "（可选）")}</option>
                      {selectedBilling.paymentRecords.map((r) => (
                        <option key={r.id} value={r.id}>{formatBusinessDateOnly(new Date(r.uploadedAt))} - {r.originalFileName}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <button type="submit">{t(lang, "Apply smart defaults", "应用智能默认值")}</button>
                </div>
              </form>
              <form action={createReceiptAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 8 }}>
              <input type="hidden" name="packageId" value={packageIdFilter} />
              <input type="hidden" name="nextHref" value={selectedRepairReturnHref} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                <label>{t(lang, "Source Invoice", "来源发票")}
                  <select name="invoiceId" defaultValue={selectedCreateInvoice?.id ?? ""} required style={{ width: "100%" }}>
                    <option value="" disabled>{availableInvoices.length === 0 ? t(lang, "(No available invoice)", "（无可用发票）") : t(lang, "Select an invoice", "请选择发票")}</option>
                    {availableInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>{inv.invoiceNo} / {money(inv.totalAmount)}</option>
                    ))}
                  </select>
                </label>
                <label>{t(lang, "Receipt No.", "收据号")}
                  <input name="receiptNo" placeholder={t(lang, "Leave blank to auto-generate: InvoiceNo-RC", "留空自动生成：InvoiceNo-RC")} pattern="^$|^RGT-[0-9]{6}-[0-9]{4}-RC$" title="RGT-yyyymm-xxxx-RC" style={{ width: "100%" }} />
                  <div style={{ fontSize: 12, color: "#666" }}>{t(lang, 'Must match selected invoice number + "-RC"', '必须与选中发票号加上 "-RC" 一致')}</div>
                </label>
                <label>{t(lang, "Receipt Date", "收据日期")}<input name="receiptDate" type="date" defaultValue={defaultReceiptDate} style={{ width: "100%" }} /></label>
                <label>{t(lang, "Received From", "收款对象")} *<input name="receivedFrom" required defaultValue={defaultReceivedFrom} placeholder={t(lang, "Please enter payer name", "请输入付款方名称")} style={{ width: "100%" }} /></label>
                <label>{t(lang, "Paid By", "付款方式")}
                  <select name="paidBy" required defaultValue={defaultPaidBy} style={{ width: "100%" }}>
                    <option value="Paynow">Paynow</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank transfer">{t(lang, "Bank transfer", "银行转账")}</option>
                  </select>
                </label>
                <label>{t(lang, "Quantity", "数量")}<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
                <label>{t(lang, "Amount", "金额")}<input name="amount" type="number" step="0.01" defaultValue={defaultAmount} style={{ width: "100%" }} /></label>
                <label>{t(lang, "GST", "消费税")}<input name="gstAmount" type="number" step="0.01" defaultValue={defaultGst} style={{ width: "100%" }} /></label>
                <label>{t(lang, "Total", "合计")}<input name="totalAmount" type="number" step="0.01" defaultValue={defaultTotal} style={{ width: "100%" }} /></label>
                <label>{t(lang, "Amount Received", "实收金额")} *<input name="amountReceived" required type="number" min={0} step="0.01" defaultValue={defaultAmountReceived} style={{ width: "100%" }} /></label>
                <label>{t(lang, "Payment Record", "付款记录")}
                  <select
                    name="paymentRecordId"
                    defaultValue={selectedCreatePaymentRecord?.id ?? ""}
                    required={selectedBilling.paymentRecords.length > 0}
                    style={{ width: "100%" }}
                  >
                    <option value="">
                      {selectedBilling.paymentRecords.length > 0
                        ? t(lang, "Please select a payment record", "请选择付款记录")
                        : t(lang, "(none)", "（无）")}
                    </option>
                    {selectedBilling.paymentRecords.map((r) => (
                      <option key={r.id} value={r.id}>{formatBusinessDateOnly(new Date(r.uploadedAt))} - {r.originalFileName}</option>
                    ))}
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>{t(lang, "Description", "描述")}
                  <input
                    value={selectedCreateInvoice ? `${t(lang, "For Invoice no.", "对应发票号")} ${selectedCreateInvoice.invoiceNo}` : t(lang, "Auto generated from linked invoice number", "由关联发票号自动生成")}
                    readOnly
                    style={{ width: "100%", color: "#666", background: "#f9fafb" }}
                  />
                </label>
                {selectedCreatePaymentRecord ? (
                  <label style={{ gridColumn: "1 / -1" }}>
                    {t(lang, "Selected payment record", "已选择付款记录")}
                    <input
                      value={`${selectedCreatePaymentRecord.originalFileName} | ${normalizeDateOnly(selectedCreatePaymentRecord.paymentDate) ?? "-"} | ${selectedCreatePaymentRecord.paymentMethod ?? "-"}`}
                      readOnly
                      style={{ width: "100%", color: "#666", background: "#f9fafb" }}
                    />
                  </label>
                ) : null}
                <label style={{ gridColumn: "1 / -1" }}>{t(lang, "Note", "备注")}
                  <input name="note" style={{ width: "100%" }} />
                </label>
              </div>
              {amountDiffVsInvoice > 0.01 ? (
                <div style={{ marginTop: 8, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
                  {t(lang, "Warning: amount received differs from invoice total.", "警告：实收金额与发票总额存在差异。")}
                  {" "}
                  {t(lang, "Please double-check before create.", "请创建前再次确认。")}
                </div>
              ) : null}
              {selectedBilling && selectedBilling.paymentRecords.length > 0 && !selectedCreatePaymentRecord ? (
                <div style={{ marginTop: 8, color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 8px", fontSize: 12 }}>
                  {t(lang, "No usable payment record selected. Please select one to keep proof image linked to receipt.", "当前未选择可用付款记录。请选择一条，确保收据能关联缴费图片。")}
                </div>
              ) : null}
              <div style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                {t(lang, "Required fields are marked with *.", "带 * 的字段为必填。")}
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="submit" disabled={availableInvoices.length === 0}>{t(lang, "Create Receipt", "创建收据")}</button>
                {availableInvoices.length === 0 ? (
                  <span style={{ marginLeft: 8, color: "#92400e" }}>{t(lang, "All invoices already have linked receipts.", "所有发票都已关联收据。")}</span>
                ) : null}
              </div>
            </form>
            </details>
          </details>
        )}
      </div>

      <style>{`
        .receipt-workspace { display: grid; grid-template-columns: 1fr; gap: 12px; align-items: start; }
        .receipt-workspace > div { min-width: 0; }
        .receipt-queue-pane { display: grid; gap: 12px; }
        @media (min-width: 1500px) {
          .receipt-workspace { grid-template-columns: minmax(460px, 0.92fr) minmax(540px, 1.08fr); }
        }
        .receipt-actions form {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .receipt-actions input[type="text"],
        .receipt-actions input[name="reason"] {
          min-width: 240px;
          flex: 1 1 240px;
        }
        .receipt-primary-actions {
          display: grid;
          gap: 10px;
        }
        .receipt-primary-actions > div {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px;
          background: #fff;
        }
      `}</style>
      <div className="receipt-workspace">
      <details
        open={!packageWorkspaceMode || workflowStep === "review"}
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}
      >
        <summary style={{ cursor: "pointer", fontWeight: 700, marginBottom: 8 }}>
          {packageWorkspaceMode
            ? t(lang, "Global receipt queue", "全局收据队列")
            : t(lang, "Unified Receipt Queue", "统一收据队列")}
        </summary>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Unified Receipt Queue", "统一收据队列")}</h3>
        <div style={{ marginBottom: 8, color: "#475569", fontSize: 13 }}>
          {packageWorkspaceMode
            ? t(lang, "This is the global queue. It stays available for cross-package review, but the package workspace above is now your main focus.", "这里是全局队列，仍可用于跨课包查看；但你当前的主要工作区是上方课包模式。")
            : t(lang, "Choose one receipt from the queue, then complete the main review action on the right.", "先从队列中选择一张收据，再在右侧完成主要审核动作。")}
        </div>
        <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...tagStyle(mineQueue.length > 0 ? "ok" : "muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
            {bilingualLabel("My next actions", "我待处理的")}: {mineQueue.length}
          </span>
          <span style={{ ...tagStyle(otherQueue.length > 0 ? "warn" : "muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
            {bilingualLabel("Other open items", "其他待处理项")}: {otherQueue.length}
          </span>
          <span style={{ ...tagStyle(completedQueue.length > 0 ? "muted" : "muted"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
            {bilingualLabel("Completed history", "已完成历史")}: {completedQueue.length}
          </span>
        </div>
        <details open={queueBucket !== "ALL" || queueFilter !== "ALL"} style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
            {t(lang, "Queue display controls", "队列显示控制")}
          </summary>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                ["ALL", t(lang, "Show all buckets", "显示全部分组")],
                ["MINE", t(lang, "Only my actions", "只看我待处理的")],
                ["OPEN", t(lang, "Only open work", "只看未完成")],
                ["HISTORY", t(lang, "Only completed history", "只看已完成历史")],
              ] as const).map(([bucket, label]) => (
                <a
                  key={bucket}
                  href={queueBucketHref(bucket)}
                  style={{
                    border: queueBucket === bucket ? "1px solid #2563eb" : "1px solid #d1d5db",
                    background: queueBucket === bucket ? "#eff6ff" : "#fff",
                    color: queueBucket === bucket ? "#1d4ed8" : "#374151",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                ["ALL", t(lang, "All", "全部")],
                ["PENDING", t(lang, "Pending", "待审批")],
                ["REJECTED", t(lang, "Rejected", "已驳回")],
                ["COMPLETED", t(lang, "Completed", "已完成")],
                ["NO_PAYMENT_RECORD", t(lang, "No Payment Record", "无付款记录")],
                ["FILE_ISSUE", t(lang, "Proof or file issues", "凭证或文件异常")],
                ["TODAY_MINE", t(lang, "Today Mine", "今天我处理的")],
              ] as const).map(([filter, label]) => (
                <a
                  key={filter}
                  href={queueFilterHref(filter)}
                  style={{
                    border: queueFilter === filter ? "1px solid #2563eb" : "1px solid #d1d5db",
                    background: queueFilter === filter ? "#eff6ff" : "#fff",
                    color: queueFilter === filter ? "#1d4ed8" : "#374151",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </details>
        {unifiedQueue.length === 0 ? (
          <div style={{ color: "#64748b", display: "grid", gap: 8, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
            <div style={{ fontWeight: 700, color: "#334155" }}>{t(lang, "No receipts match the current queue filters", "当前队列筛选下没有收据")}</div>
            <div>{t(lang, "Try switching the queue bucket, clearing the queue filter, or opening a package workspace to create or repair receipts.", "可以切换队列分组、清空筛选，或进入课包工作区创建/修复收据。")}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={queueFilterHref("ALL")}>{t(lang, "Back to all queue items", "返回全部队列")}</a>
              <a href="/admin/recovery/uploads?source=package_payment">{t(lang, "Open attachment health desk", "打开附件异常总览")}</a>
            </div>
          </div>
        ) : (
          <div className="receipt-queue-pane">
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {t(
                lang,
                "Queue cards now show only the essentials. Open one item to read invoice, payment proof, timeline, and review controls on the right.",
                "队列卡片现在只保留核心信息。点开任一项目后，可在右侧查看发票、缴费记录、时间线和审批操作。"
              )}
            </div>
            {renderQueueSection(visibleMineQueue, {
              heading: bilingualLabel("My next actions", "我待处理的"),
              count: visibleMineQueue.length,
              tone: "ok",
              lang,
              selectedRow,
              roleCfg,
              openHref,
            })}
            {renderQueueSection(visibleOtherQueue, {
              heading: bilingualLabel("Other open items", "其他待处理项"),
              count: visibleOtherQueue.length,
              tone: "warn",
              lang,
              selectedRow,
              roleCfg,
              openHref,
            })}
            {visibleCompletedQueue.length > 0 ? (
              <details open={queueBucket === "HISTORY"}>
                <summary style={{ cursor: "pointer", listStyle: "none", background: "#f8fafc", fontWeight: 700, color: "#64748b", padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  {bilingualLabel("Completed history", "已完成历史")} ({visibleCompletedQueue.length})
                </summary>
                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {renderQueueCards(visibleCompletedQueue, lang, selectedRow, roleCfg, openHref)}
                </div>
              </details>
            ) : null}
          </div>
        )}
      </details>

      <div className="receipt-actions" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Selected Receipt Details & Actions", "选中收据详情与审批操作")}</h3>
        {!selectedRow ? (
          <div style={{ color: "#64748b", display: "grid", gap: 8, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
            <div style={{ fontWeight: 700, color: "#334155" }}>{t(lang, "No receipt is selected yet", "当前还没有选中收据")}</div>
            <div>{t(lang, "Choose one item from the queue above to review it here. If the queue is empty, switch filters or open the repair workspace.", "请先从上方队列选择一条；如果队列为空，可切换筛选或打开修复工作区。")}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={queueFilterHref("ALL")}>{t(lang, "Back to all queue items", "返回全部队列")}</a>
              <a href="/admin/recovery/uploads?source=package_payment">{t(lang, "Open attachment health desk", "打开附件异常总览")}</a>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10, color: "#475569", fontSize: 13 }}>
              {bilingualLabel("Action focus", "当前操作焦点")}: <b>{currentRoleFocus}</b>
            </div>
            <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #dbeafe", background: "#f8fbff" }}>
              <div style={{ fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
                {t(lang, "You are reviewing", "当前正在处理")}
              </div>
              <div style={{ color: "#334155" }}>
                {queueTypeLabel(lang, selectedRow.type)} | {selectedRow.receiptNo} | {selectedRow.partyName}
              </div>
            </div>
            {selectedRiskMessages.length > 0 ? (
              <div style={{ marginBottom: 10, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{t(lang, "Risk checks", "风险检查")}</div>
                <div style={{ display: "grid", gap: 2 }}>
                  {selectedRiskMessages.map((line, idx) => (
                    <div key={idx}>- {line}</div>
                  ))}
                  {selectedRiskActions.map((line, idx) => (
                    <div key={`action-${idx}`} style={{ color: "#7c2d12", fontWeight: 600 }}>
                      {idx === 0 ? t(lang, "Recommended action", "建议操作") : t(lang, "Also check", "也请检查")}: {line}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 10, color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px" }}>
                {t(lang, "No risk detected for this receipt.", "该收据未发现风险项。")}
              </div>
            )}
            {!selectedRow.paymentRecord || selectedRow.paymentFileMissing ? (
              <div style={{ marginBottom: 10, display: "grid", gap: 8, color: "#7f1d1d", background: "#fff7f7", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontWeight: 700 }}>{t(lang, "Proof repair path", "凭证修复路径")}</div>
                <div style={{ fontSize: 13 }}>
                  {selectedRow.paymentRecord
                    ? t(lang, "The receipt already points to a proof record, but the file is missing on the server. Open the fix tools first, then return here to continue review.", "当前收据已经关联了缴费记录，但服务器上缺少文件。请先打开修复工具处理，再回到这里继续审核。")
                    : t(lang, "This receipt has no usable payment proof yet. Open the fix tools to upload or relink a proof before continuing review.", "当前收据还没有可用的缴费凭证。请先打开修复工具上传或重新关联凭证，再继续审核。")}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a href={queueFilterHref("FILE_ISSUE")}>{t(lang, "Open proof or file issues", "查看凭证或文件异常")}</a>
                  <a href="/admin/recovery/uploads?source=package_payment">{t(lang, "Open attachment health desk", "打开附件异常总览")}</a>
                  {selectedRow.type === "PARENT" ? (
                    <>
                      <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(selectedRow.packageId)}&step=create&selectedType=PARENT&selectedId=${encodeURIComponent(selectedRow.id)}`}>
                        {t(lang, "Open fix tools", "打开修复工具")}
                      </a>
                      <a href={`/admin/packages/${encodeURIComponent(selectedRow.packageId)}/billing`}>
                        {t(lang, "Open package billing", "打开课包账单页")}
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Receipt status", "收据状态")}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ ...tagStyle(queueStatusKind(selectedRow.status)), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                    {queueStatusLabel(lang, selectedRow.status)}
                  </span>
                </div>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Type", "类型")}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{queueTypeLabel(lang, selectedRow.type)}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{selectedRow.invoiceNo}</div>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Proof status", "凭证状态")}</div>
                <div style={{ marginTop: 4 }}>
                  <span style={{ ...tagStyle(selectedRow.paymentRecord && !selectedRow.paymentFileMissing ? "ok" : "err"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                    {selectedRow.paymentRecord && !selectedRow.paymentFileMissing
                      ? t(lang, "Linked and usable", "已关联且可用")
                      : t(lang, "Need proof fix", "需要修复凭证")}
                  </span>
                </div>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Risk count", "风险数量")}</div>
                <div style={{ fontWeight: 700, marginTop: 4, color: selectedRiskMessages.length > 0 ? "#b45309" : "#166534" }}>
                  {selectedRiskMessages.length}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{currentRoleFocus}</div>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <b>{t(lang, "Type", "类型")}:</b> {queueTypeLabel(lang, selectedRow.type)} |{" "}
              <b>{t(lang, "Receipt No.", "收据号")}:</b> {selectedRow.receiptNo} | <b>{t(lang, "Invoice No.", "发票号")}:</b> {selectedRow.invoiceNo}
            </div>
            <div style={{ marginBottom: 10 }}>
              <b>{t(lang, "Payment Record", "缴费记录")}:</b>{" "}
              {selectedRow.paymentRecord ? (
                <a href={selectedRow.paymentRecord.path} target="_blank" rel="noreferrer">{selectedRow.paymentRecord.name}</a>
              ) : (
                <span style={{ color: "#6b7280" }}>{t(lang, "(none)", "（无）")}</span>
              )}
            </div>
            <div style={{ marginBottom: 10, border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fafafa" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{bilingualLabel("Timeline", "时间线")}</div>
              <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#374151" }}>
                <div>
                  {t(lang, "Created", "创建")}: {formatBusinessDateTime(new Date(selectedRow.createdAt))} · {selectedRow.createdBy}
                </div>
                {selectedRow.approval.managerApprovedBy.length > 0 ? (
                  <div>
                    {t(lang, "Manager approved by", "管理已批准")}: {selectedRow.approval.managerApprovedBy.join(", ")}
                  </div>
                ) : null}
                {"managerRejectedAt" in selectedRow.approval && selectedRow.approval.managerRejectedAt ? (
                  <div>
                    {t(lang, "Manager rejected", "管理已驳回")}: {formatBusinessDateTime(new Date(selectedRow.approval.managerRejectedAt))} · {selectedRow.approval.managerRejectedBy ?? "-"}
                  </div>
                ) : null}
                {selectedRow.approval.financeApprovedBy.length > 0 ? (
                  <div>
                    {t(lang, "Finance approved by", "财务已批准")}: {selectedRow.approval.financeApprovedBy.join(", ")}
                  </div>
                ) : null}
                {"financeRejectedAt" in selectedRow.approval && selectedRow.approval.financeRejectedAt ? (
                  <div>
                    {t(lang, "Finance rejected", "财务已驳回")}: {formatBusinessDateTime(new Date(selectedRow.approval.financeRejectedAt))} · {selectedRow.approval.financeRejectedBy ?? "-"}
                  </div>
                ) : null}
              </div>
            </div>
            {selectedRow.approval.managerRejectReason ? <div style={{ color: "#b00", marginBottom: 6 }}>{t(lang, "Manager Rejected:", "管理驳回：")} {selectedRow.approval.managerRejectReason}</div> : null}
            {selectedRow.approval.financeRejectReason ? <div style={{ color: "#b00", marginBottom: 6 }}>{t(lang, "Finance Rejected:", "财务驳回：")} {selectedRow.approval.financeRejectReason}</div> : null}
            <div id="receipt-primary-actions" className="receipt-primary-actions">
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARENT" && isManagerApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Manager review", "管理审核")}</div>
                  <form action={managerApproveReceiptAction}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    <button type="submit" style={primaryButtonStyle}>{approveAndNextLabel}</button>
                  </form>
                  <form action={managerRejectReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    {renderRejectReasonFields(lang, `parent-manager-${selectedRow.id}`)}
                    <button type="submit" style={dangerButtonStyle}>{rejectAndNextLabel}</button>
                  </form>
                </div>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARENT" && isFinanceApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Finance review", "财务审核")}</div>
                  <form action={financeApproveReceiptAction}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    <button type="submit" style={primaryButtonStyle}>{approveAndNextLabel}</button>
                  </form>
                  <form action={financeRejectReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    {renderRejectReasonFields(lang, `parent-finance-${selectedRow.id}`)}
                    <button type="submit" style={dangerButtonStyle}>{rejectAndNextLabel}</button>
                  </form>
                </div>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARTNER" && isManagerApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Manager review", "管理审核")}</div>
                  <form action={managerApprovePartnerReceiptAction}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    <button type="submit" style={primaryButtonStyle}>{approveAndNextLabel}</button>
                  </form>
                  <form action={managerRejectPartnerReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    {renderRejectReasonFields(lang, `partner-manager-${selectedRow.id}`)}
                    <button type="submit" style={dangerButtonStyle}>{rejectAndNextLabel}</button>
                  </form>
                </div>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARTNER" && isFinanceApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Finance review", "财务审核")}</div>
                  <form action={financeApprovePartnerReceiptAction}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    <button type="submit" style={primaryButtonStyle}>{approveAndNextLabel}</button>
                  </form>
                  <form action={financeRejectPartnerReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                    {renderRejectReasonFields(lang, `partner-finance-${selectedRow.id}`)}
                    <button type="submit" style={dangerButtonStyle}>{rejectAndNextLabel}</button>
                  </form>
                </div>
              ) : null}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Receipt file", "收据文件")}</div>
                <b>PDF:</b>{" "}
                {selectedRow.status === "COMPLETED" ? (
                  <a href={selectedRow.exportHref}>{t(lang, "Export PDF", "导出PDF")}</a>
                ) : (
                  <span style={{ color: "#b45309" }}>{t(lang, "Pending approval", "等待审批")}</span>
                )}
              </div>

              <details style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fafafa" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  {t(lang, "More actions", "更多操作")}
                </summary>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {selectedRow.type === "PARENT" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(selectedRow.packageId)}&step=create&selectedType=PARENT&selectedId=${encodeURIComponent(selectedRow.id)}`}>
                        {t(lang, "Open fix tools", "打开修复工具")}
                      </a>
                      <a href={`/admin/packages/${encodeURIComponent(selectedRow.packageId)}/billing`}>
                        {t(lang, "Open package billing", "打开课包账单页")}
                      </a>
                    </div>
                  ) : null}
                  {canSuperRevoke && selectedRow.type === "PARENT" ? (
                    <form action={revokeParentReceiptForRedoAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="packageId" value={selectedRow.packageId} />
                      <input type="hidden" name="receiptId" value={selectedRow.id} />
                      <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                      <input name="reasonDetail" placeholder={t(lang, "Revoke reason (optional)", "撤回原因（可选）")} />
                      <button type="submit" style={secondaryButtonStyle}>{t(lang, "Revoke to redo", "撤回重做")}</button>
                    </form>
                  ) : null}
                  {canSuperRevoke && selectedRow.type === "PARTNER" ? (
                    <form action={revokePartnerReceiptForRedoAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="receiptId" value={selectedRow.id} />
                      <input type="hidden" name="nextHref" value={selectedActionNextHref} />
                      <input name="reasonDetail" placeholder={t(lang, "Revoke reason (optional)", "撤回原因（可选）")} />
                      <button type="submit" style={secondaryButtonStyle}>{t(lang, "Revoke to redo", "撤回重做")}</button>
                    </form>
                  ) : null}
                </div>
              </details>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
