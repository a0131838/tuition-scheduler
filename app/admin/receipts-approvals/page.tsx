import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import path from "path";
import { access, mkdir, unlink, writeFile } from "fs/promises";
import crypto from "crypto";
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
import { formatBusinessDateOnly, formatBusinessDateTime, formatDateOnly, monthKeyFromDateOnly, normalizeDateOnly } from "@/lib/date-only";

const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";

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
  if (status === "COMPLETED") return t(lang, "Completed / ready to archive", "已完成 / 可归档");
  if (status === "REJECTED") return t(lang, "Rejected / needs fix", "已驳回 / 需修复");
  return t(lang, "Pending / waiting for review", "待审批 / 等待审核");
}

function queueStatusKind(status: "COMPLETED" | "REJECTED" | "PENDING") {
  if (status === "COMPLETED") return "ok" as const;
  if (status === "REJECTED") return "err" as const;
  return "warn" as const;
}

function queueTypeLabel(lang: "BILINGUAL" | "ZH" | "EN", type: "PARENT" | "PARTNER") {
  return type === "PARENT" ? t(lang, "Parent", "家长") : t(lang, "Partner", "合作方");
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

async function uploadPaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) {
    redirect("/admin/receipts-approvals?err=Only+finance+can+manage+payment+records");
  }
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) redirect("/admin/receipts-approvals?err=Missing+package+id");

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true },
  });
  if (!pkg) redirect(withQuery("/admin/receipts-approvals?err=Package+not+found", packageId));

  const file = formData.get("paymentProof");
  if (!(file instanceof File) || !file.size) {
    redirect(withQuery("/admin/receipts-approvals?err=Please+choose+a+file", packageId));
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect(withQuery("/admin/receipts-approvals?err=File+too+large+(max+10MB)", packageId));
  }

  const ext = path.extname(file.name || "").slice(0, 10) || ".bin";
  const safeExt = /^[.a-zA-Z0-9]+$/.test(ext) ? ext : ".bin";
  const storeName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${safeExt}`;
  const relDir = path.join("uploads", "payment-proofs", packageId);
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  const absPath = path.join(absDir, storeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);
  const relPath = `/${path.posix.join("uploads", "payment-proofs", packageId, storeName)}`;
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
        storedFileName: storeName,
        relativePath: relPath,
        note: paymentNote,
        uploadedBy: admin.email,
      });
      if (oldItem.relativePath?.startsWith("/")) {
        const oldAbsPath = path.join(
          process.cwd(),
          "public",
          oldItem.relativePath.replace(/^\//, "").replace(/\//g, path.sep),
        );
        await unlink(oldAbsPath).catch(() => {});
      }
      redirect(withQuery("/admin/receipts-approvals?msg=Payment+record+replaced", packageId));
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      await unlink(absPath).catch(() => {});
      const msg = e instanceof Error ? e.message : "Replace payment record failed";
      redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent(msg)}`, packageId));
    }
  }

  await addParentPaymentRecord({
    packageId,
    studentId: pkg.studentId,
    paymentDate,
    paymentMethod,
    referenceNo,
    originalFileName: file.name || "payment-proof",
    storedFileName: storeName,
    relativePath: relPath,
    note: paymentNote,
    uploadedBy: admin.email,
  });

  redirect(withQuery("/admin/receipts-approvals?msg=Payment+record+uploaded", packageId));
}

async function deletePaymentRecordAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) {
    redirect("/admin/receipts-approvals?err=Only+finance+can+delete+payment+records");
  }
  const packageId = String(formData.get("packageId") ?? "").trim();
  const recordId = String(formData.get("recordId") ?? "").trim();
  if (!packageId || !recordId) {
    redirect(withQuery("/admin/receipts-approvals?err=Missing+payment+record+id", packageId));
  }
  try {
    const row = await deleteParentPaymentRecord({ recordId, actorEmail: admin.email });
    if (row.relativePath?.startsWith("/")) {
      const absPath = path.join(process.cwd(), "public", row.relativePath.replace(/^\//, "").replace(/\//g, path.sep));
      await unlink(absPath).catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete payment record failed";
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent(msg)}`, packageId));
  }
  redirect(withQuery("/admin/receipts-approvals?msg=Payment+record+deleted", packageId));
}

async function createReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  if (!canFinanceOperate(admin.email, admin.role)) {
    redirect("/admin/receipts-approvals?err=Only+finance+can+create+receipts");
  }
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) redirect("/admin/receipts-approvals?err=Missing+package+id");

  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });
  if (!pkg) redirect(withQuery("/admin/receipts-approvals?err=Package+not+found", packageId));

  const amount = parseNum(formData.get("amount"), 0);
  const gstAmount = parseNum(formData.get("gstAmount"), 0);
  const totalAmountRaw = parseNum(formData.get("totalAmount"), Number.NaN);
  const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : amount + gstAmount;
  const amountReceivedRaw = parseNum(formData.get("amountReceived"), Number.NaN);
  const amountReceived = Number.isFinite(amountReceivedRaw) ? amountReceivedRaw : totalAmount;
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) {
    redirect(withQuery("/admin/receipts-approvals?err=Please+select+an+invoice+for+this+receipt", packageId));
  }
  const linkedInvoice = await getParentInvoiceById(invoiceId);
  if (!linkedInvoice) {
    redirect(withQuery("/admin/receipts-approvals?err=Selected+invoice+not+found", packageId));
  }
  const billing = await listParentBillingForPackage(packageId);
  const hasAnyPaymentRecords = billing.paymentRecords.length > 0;
  const paymentRecordId = String(formData.get("paymentRecordId") ?? "").trim() || null;
  if (hasAnyPaymentRecords && !paymentRecordId) {
    redirect(withQuery("/admin/receipts-approvals?err=Please+select+a+payment+record+before+creating+receipt", packageId));
  }
  if (paymentRecordId) {
    const paymentRecord = await getParentPaymentRecordById(paymentRecordId);
    if (!paymentRecord || paymentRecord.packageId !== packageId) {
      redirect(withQuery("/admin/receipts-approvals?err=Selected+payment+record+not+found+for+this+package", packageId));
    }
  }
  const receiptNoInput = String(formData.get("receiptNo") ?? "").trim();
  let receiptNo = receiptNoInput;
  if (!receiptNo) {
    try {
      receiptNo = await buildParentReceiptNoForInvoice(invoiceId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate receipt no";
      redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent(msg)}`, packageId));
    }
  }
  const receivedFrom = String(formData.get("receivedFrom") ?? "").trim();
  const paidBy = String(formData.get("paidBy") ?? "").trim();
  if (!receivedFrom) {
    redirect(withQuery("/admin/receipts-approvals?err=Received+From+is+required", packageId));
  }
  if (!paidBy) {
    redirect(withQuery("/admin/receipts-approvals?err=Paid+By+is+required", packageId));
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
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent(msg)}`, packageId));
  }

  redirect(withQuery("/admin/receipts-approvals?msg=Receipt+created", packageId));
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
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Not allowed")}`, packageId));
  }
  await managerApproveParentReceipt(receiptId, actorEmail);
  redirect(withQuery("/admin/receipts-approvals?msg=Manager+approved", packageId));
}

async function managerRejectReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Reject reason required")}`, packageId));
  }
  await managerRejectParentReceipt(receiptId, actorEmail, reason);
  redirect(withQuery("/admin/receipts-approvals?msg=Manager+rejected", packageId));
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
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Not allowed")}`, packageId));
  }
  const approvalMap = await getParentReceiptApprovalMap([receiptId]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  if (!managerReady) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Manager approval is required first")}`, packageId));
  }
  await financeApproveParentReceipt(receiptId, actorEmail);
  redirect(withQuery("/admin/receipts-approvals?msg=Finance+approved", packageId));
}

async function financeRejectReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect(withQuery(`/admin/receipts-approvals?err=${encodeURIComponent("Reject reason required")}`, packageId));
  }
  await financeRejectParentReceipt(receiptId, actorEmail, reason);
  redirect(withQuery("/admin/receipts-approvals?msg=Finance+rejected", packageId));
}

async function revokeParentReceiptForRedoAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = (current?.email ?? admin.email).trim().toLowerCase();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (actorEmail !== SUPER_ADMIN_EMAIL || !receiptId) {
    redirect(withQuery("/admin/receipts-approvals?err=Not+allowed", packageId));
  }
  await revokeParentReceiptApprovalForRedo(receiptId, actorEmail, reason || "Super admin revoke to redo");
  redirect(withQuery("/admin/receipts-approvals?msg=Receipt+reopened+for+redo", packageId));
}

async function managerApprovePartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect("/admin/receipts-approvals?err=Not+allowed");
  }
  await managerApprovePartnerReceipt(receiptId, actorEmail);
  redirect("/admin/receipts-approvals?msg=Partner+manager+approved");
}

async function managerRejectPartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.managerApproverEmails)) {
    redirect("/admin/receipts-approvals?err=Partner+reject+reason+required");
  }
  await managerRejectPartnerReceipt(receiptId, actorEmail, reason);
  redirect("/admin/receipts-approvals?msg=Partner+manager+rejected");
}

async function financeApprovePartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect("/admin/receipts-approvals?err=Not+allowed");
  }
  const approvalMap = await getPartnerReceiptApprovalMap([receiptId]);
  const approval = approvalMap.get(receiptId) ?? { managerApprovedBy: [], financeApprovedBy: [] };
  const managerReady = areAllApproversConfirmed(approval.managerApprovedBy, cfg.managerApproverEmails);
  if (!managerReady) {
    redirect("/admin/receipts-approvals?err=Partner+manager+approval+is+required+first");
  }
  await financeApprovePartnerReceipt(receiptId, actorEmail);
  redirect("/admin/receipts-approvals?msg=Partner+finance+approved");
}

async function financeRejectPartnerReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = current?.email ?? admin.email;
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const cfg = await getApprovalRoleConfig();
  if (!receiptId || !reason || !isRoleApprover(actorEmail, cfg.financeApproverEmails)) {
    redirect("/admin/receipts-approvals?err=Partner+reject+reason+required");
  }
  await financeRejectPartnerReceipt(receiptId, actorEmail, reason);
  redirect("/admin/receipts-approvals?msg=Partner+finance+rejected");
}

async function revokePartnerReceiptForRedoAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const actorEmail = (current?.email ?? admin.email).trim().toLowerCase();
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (actorEmail !== SUPER_ADMIN_EMAIL || !receiptId) {
    redirect("/admin/receipts-approvals?err=Not+allowed");
  }
  await revokePartnerReceiptApprovalForRedo(receiptId, actorEmail, reason || "Super admin revoke to redo");
  redirect("/admin/receipts-approvals?msg=Partner+receipt+reopened+for+redo");
}

export default async function ReceiptsApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    msg?: string;
    err?: string;
    packageId?: string;
    month?: string;
    view?: string;
    selectedType?: string;
    selectedId?: string;
    step?: string;
    queueFilter?: string;
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
  const monthRaw = sp?.month ? String(sp.month).trim() : "";
  const monthFilter = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : "";
  const viewRaw = String(sp?.view ?? "ALL").trim().toUpperCase();
  const viewMode = viewRaw === "PARENT" || viewRaw === "PARTNER" ? viewRaw : "ALL";
  const stepRaw = String(sp?.step ?? "upload").trim().toLowerCase();
  const workflowStep = (["upload", "records", "create", "review"] as const).includes(stepRaw as any)
    ? (stepRaw as "upload" | "records" | "create" | "review")
    : "upload";
  const queueFilterRaw = String(sp?.queueFilter ?? "ALL").trim().toUpperCase();
  const queueFilter = (
    ["ALL", "PENDING", "REJECTED", "COMPLETED", "NO_PAYMENT_RECORD", "TODAY_MINE"] as const
  ).includes(queueFilterRaw as any)
    ? (queueFilterRaw as "ALL" | "PENDING" | "REJECTED" | "COMPLETED" | "NO_PAYMENT_RECORD" | "TODAY_MINE")
    : "ALL";
  const selectedTypeRaw = String(sp?.selectedType ?? "").trim().toUpperCase();
  const selectedType = selectedTypeRaw === "PARENT" || selectedTypeRaw === "PARTNER" ? selectedTypeRaw : "";
  const selectedId = String(sp?.selectedId ?? "").trim();
  const preferredPaymentRecordId = String(sp?.paymentRecordId ?? "").trim();
  const preferredInvoiceId = String(sp?.invoiceId ?? "").trim();

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
            if (!record.relativePath?.startsWith("/")) return [record.id, false] as const;
            const absPath = path.join(process.cwd(), "public", record.relativePath.replace(/^\//, "").replace(/\//g, path.sep));
            try {
              await access(absPath);
              return [record.id, true] as const;
            } catch {
              return [record.id, false] as const;
            }
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
  if (preferredPaymentRecordId) baseQuery.set("paymentRecordId", preferredPaymentRecordId);
  if (preferredInvoiceId) baseQuery.set("invoiceId", preferredInvoiceId);
  const openHref = (type: "PARENT" | "PARTNER", id: string) => {
    const q = new URLSearchParams(baseQuery.toString());
    q.set("selectedType", type);
    q.set("selectedId", id);
    return `/admin/receipts-approvals?${q.toString()}`;
  };
  const stepHref = (step: "upload" | "records" | "create" | "review") => {
    const q = new URLSearchParams(baseQuery.toString());
    q.set("step", step);
    return `/admin/receipts-approvals?${q.toString()}`;
  };
  const queueFilterHref = (
    filter: "ALL" | "PENDING" | "REJECTED" | "COMPLETED" | "NO_PAYMENT_RECORD" | "TODAY_MINE"
  ) => {
    const q = new URLSearchParams(baseQuery.toString());
    if (filter === "ALL") q.delete("queueFilter");
    else q.set("queueFilter", filter);
    return `/admin/receipts-approvals?${q.toString()}`;
  };

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
  if (queueFilter === "TODAY_MINE") {
    const todayPrefix = `${today} `;
    unifiedQueue = unifiedQueue.filter((x: any) => {
      const createdBy = String(x.createdBy ?? "").trim().toLowerCase();
      const createdAt = String(x.createdAt ?? "");
      return createdBy === String(actorEmail).trim().toLowerCase() || createdAt.startsWith(todayPrefix) || createdAt.startsWith(today);
    });
  }
  unifiedQueue = unifiedQueue.sort((a, b) => (normalizeDateOnly(b.receiptDate) ?? "").localeCompare(normalizeDateOnly(a.receiptDate) ?? ""));
  const selectedRow = unifiedQueue.find((x) => x.type === selectedType && x.id === selectedId) ?? unifiedQueue[0] ?? null;
  const selectedRowAmountDiff =
    selectedRow ? Math.abs((Number(selectedRow.amountReceived) || 0) - (Number(selectedRow.invoiceTotalAmount) || 0)) : 0;
  const selectedRowPaymentFileMissing =
    selectedRow?.type === "PARENT" && selectedBilling && selectedRow.paymentRecord
      ? !(paymentRecordFileMap.get(selectedRow.paymentRecord.id) ?? false)
      : false;
  const selectedRiskMessages: string[] = [];
  if (selectedRow) {
    if (!selectedRow.paymentRecord) {
      selectedRiskMessages.push(t(lang, "No linked payment record.", "未绑定缴费记录。"));
    }
    if (selectedRowPaymentFileMissing) {
      selectedRiskMessages.push(t(lang, "Payment file is missing.", "缴费文件缺失。"));
    }
    if (selectedRowAmountDiff > 0.01) {
      selectedRiskMessages.push(
        t(lang, "Amount differs from invoice total.", "收据金额与发票总额不一致。")
      );
    }
  }
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

  return (
    <div>
      <h2>{t(lang, "Receipt Approval Center", "收据审批中心")}</h2>
      {err ? (
        <div style={{ marginBottom: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px" }}>
          {t(lang, "Error", "错误")}: {err}
        </div>
      ) : null}
      {msg ? (
        <div style={{ marginBottom: 12, color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px" }}>
          {t(lang, "Success", "成功")}: {msg}
        </div>
      ) : null}

      <form method="get" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
        <a href="/admin/receipts-approvals">{t(lang, "Reset", "重置")}</a>
      </form>
      {packageIdFilter ? (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
        <form
          method="get"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {viewMode !== "ALL" ? <input type="hidden" name="view" value={viewMode} /> : null}
          {monthFilter ? <input type="hidden" name="month" value={monthFilter} /> : null}
          <label>
            {t(lang, "Quick Select Package", "快捷选择课包")}
            <select name="packageId" defaultValue="" style={{ marginLeft: 6, minWidth: 420 }}>
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
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
              {t(lang, "Open Parent Finance Operations", "展开家长财务操作")}
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
            <div style={{ marginBottom: 10, display: "grid", gridTemplateColumns: "repeat(4, minmax(150px, 1fr))", gap: 8 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(180px, 1fr))", gap: 8 }}>
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
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t(lang, "Smart fill source", "智能带入来源")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(200px, 1fr))", gap: 8 }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
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
                <label style={{ gridColumn: "span 4" }}>{t(lang, "Description", "描述")}
                  <input
                    value={selectedCreateInvoice ? `${t(lang, "For Invoice no.", "对应发票号")} ${selectedCreateInvoice.invoiceNo}` : t(lang, "Auto generated from linked invoice number", "由关联发票号自动生成")}
                    readOnly
                    style={{ width: "100%", color: "#666", background: "#f9fafb" }}
                  />
                </label>
                {selectedCreatePaymentRecord ? (
                  <label style={{ gridColumn: "span 4" }}>
                    {t(lang, "Selected payment record", "已选择付款记录")}
                    <input
                      value={`${selectedCreatePaymentRecord.originalFileName} | ${normalizeDateOnly(selectedCreatePaymentRecord.paymentDate) ?? "-"} | ${selectedCreatePaymentRecord.paymentMethod ?? "-"}`}
                      readOnly
                      style={{ width: "100%", color: "#666", background: "#f9fafb" }}
                    />
                  </label>
                ) : null}
                <label style={{ gridColumn: "span 4" }}>{t(lang, "Note", "备注")}
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
        .receipt-table-wrap { overflow-x: auto; }
        @media (min-width: 1900px) {
          .receipt-workspace { grid-template-columns: minmax(900px, 1.25fr) minmax(520px, 1fr); }
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
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Unified Receipt Queue", "统一收据队列")}</h3>
        <div style={{ marginBottom: 8, color: "#475569", fontSize: 13 }}>
          {t(lang, "Choose one receipt from the queue, then complete the main review action on the right.", "先从队列中选择一张收据，再在右侧完成主要审核动作。")}
        </div>
        <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([
            ["ALL", t(lang, "All", "全部")],
            ["PENDING", t(lang, "Pending", "待审批")],
            ["REJECTED", t(lang, "Rejected", "已驳回")],
            ["COMPLETED", t(lang, "Completed", "已完成")],
            ["NO_PAYMENT_RECORD", t(lang, "No Payment Record", "无付款记录")],
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
        {unifiedQueue.length === 0 ? (
          <div style={{ color: "#666" }}>{t(lang, "No receipts found.", "暂无收据")}</div>
        ) : (
          <div className="receipt-table-wrap">
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th align="left">{t(lang, "Type", "类型")}</th>
                <th align="left">{t(lang, "Receipt No.", "收据号")}</th>
                <th align="left">{t(lang, "Date", "日期")}</th>
                <th align="left">{t(lang, "Invoice No.", "发票号")}</th>
                <th align="left">{t(lang, "Name / Party", "学生/对象")}</th>
                <th align="left">{t(lang, "Amount", "金额")}</th>
                <th align="left">{t(lang, "Status", "状态")}</th>
                <th align="left">{t(lang, "Review Progress", "审核进度")}</th>
                <th align="left">{t(lang, "Primary Action", "主要操作")}</th>
              </tr>
            </thead>
            <tbody>
              {unifiedQueue.map((x) => (
                <tr
                  key={`${x.type}-${x.id}`}
                  style={{ borderTop: "1px solid #eee", background: selectedRow?.type === x.type && selectedRow?.id === x.id ? "#f9fafb" : undefined }}
                >
                  <td>{queueTypeLabel(lang, x.type)}</td>
                  <td>{x.receiptNo}</td>
                  <td>{normalizeDateOnly(x.receiptDate) ?? "-"}</td>
                  <td>{x.invoiceNo}</td>
                  <td>{x.partyName}</td>
                  <td>{money(x.amountReceived)}</td>
                  <td>
                    <span style={{ ...tagStyle(queueStatusKind(x.status)), borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                      {queueStatusLabel(lang, x.status)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
                      <div>
                        {t(lang, "Manager", "管理")}:{" "}
                        {roleCfg.managerApproverEmails.length === 0
                          ? t(lang, "No config", "未配置")
                          : `${x.approval.managerApprovedBy.length}/${roleCfg.managerApproverEmails.length}`}
                      </div>
                      <div>
                        {t(lang, "Finance", "财务")}:{" "}
                        {roleCfg.financeApproverEmails.length === 0
                          ? t(lang, "No config", "未配置")
                          : `${x.approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`}
                      </div>
                      <div>
                        {t(lang, "Payment record", "缴费记录")}:{" "}
                        {x.paymentRecord ? x.paymentRecord.name : t(lang, "(none)", "（无）")}
                      </div>
                    </div>
                  </td>
                  <td>
                    <a href={openHref(x.type, x.id)}>
                      {x.status === "COMPLETED"
                        ? t(lang, "Open completed receipt", "打开已完成收据")
                        : x.status === "REJECTED"
                          ? t(lang, "Open and fix", "打开并修复")
                          : t(lang, "Open for review", "打开审核")}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="receipt-actions" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Selected Receipt Details & Actions", "选中收据详情与审批操作")}</h3>
        {!selectedRow ? (
          <div style={{ color: "#666" }}>{t(lang, "Please select one row from the queue above.", "请从上方队列选择一条记录。")}</div>
        ) : (
          <>
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
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 10, color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px" }}>
                {t(lang, "No risk detected for this receipt.", "该收据未发现风险项。")}
              </div>
            )}
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
            {selectedRow.approval.managerRejectReason ? <div style={{ color: "#b00", marginBottom: 6 }}>{t(lang, "Manager Rejected:", "管理驳回：")} {selectedRow.approval.managerRejectReason}</div> : null}
            {selectedRow.approval.financeRejectReason ? <div style={{ color: "#b00", marginBottom: 6 }}>{t(lang, "Finance Rejected:", "财务驳回：")} {selectedRow.approval.financeRejectReason}</div> : null}
            <div className="receipt-primary-actions">
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARENT" && isManagerApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Manager review / 管理审核", "Manager review / 管理审核")}</div>
                  <form action={managerApproveReceiptAction}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Approve this receipt / 批准这张收据", "Approve this receipt / 批准这张收据")}</button>
                  </form>
                  <form action={managerRejectReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Reject reason / 管理驳回原因", "Reject reason / 管理驳回原因")} />
                    <button type="submit">{t(lang, "Reject this receipt / 驳回这张收据", "Reject this receipt / 驳回这张收据")}</button>
                  </form>
                </div>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARENT" && isFinanceApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Finance review / 财务审核", "Finance review / 财务审核")}</div>
                  <form action={financeApproveReceiptAction}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Approve this receipt / 批准这张收据", "Approve this receipt / 批准这张收据")}</button>
                  </form>
                  <form action={financeRejectReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Reject reason / 财务驳回原因", "Reject reason / 财务驳回原因")} />
                    <button type="submit">{t(lang, "Reject this receipt / 驳回这张收据", "Reject this receipt / 驳回这张收据")}</button>
                  </form>
                </div>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARTNER" && isManagerApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Manager review / 管理审核", "Manager review / 管理审核")}</div>
                  <form action={managerApprovePartnerReceiptAction}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Approve this receipt / 批准这张收据", "Approve this receipt / 批准这张收据")}</button>
                  </form>
                  <form action={managerRejectPartnerReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Reject reason / 管理驳回原因", "Reject reason / 管理驳回原因")} />
                    <button type="submit">{t(lang, "Reject this receipt / 驳回这张收据", "Reject this receipt / 驳回这张收据")}</button>
                  </form>
                </div>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARTNER" && isFinanceApprover ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Finance review / 财务审核", "Finance review / 财务审核")}</div>
                  <form action={financeApprovePartnerReceiptAction}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Approve this receipt / 批准这张收据", "Approve this receipt / 批准这张收据")}</button>
                  </form>
                  <form action={financeRejectPartnerReceiptAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Reject reason / 财务驳回原因", "Reject reason / 财务驳回原因")} />
                    <button type="submit">{t(lang, "Reject this receipt / 驳回这张收据", "Reject this receipt / 驳回这张收据")}</button>
                  </form>
                </div>
              ) : null}
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t(lang, "Receipt file / 收据文件", "Receipt file / 收据文件")}</div>
                <b>PDF:</b>{" "}
                {selectedRow.status === "COMPLETED" ? (
                  <a href={selectedRow.exportHref}>{t(lang, "Export PDF", "导出PDF")}</a>
                ) : (
                  <span style={{ color: "#b45309" }}>{t(lang, "Pending approval", "等待审批")}</span>
                )}
              </div>

              <details style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fafafa" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  {t(lang, "More actions / 更多操作", "More actions / 更多操作")}
                </summary>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {selectedRow.type === "PARENT" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={`/admin/receipts-approvals?packageId=${encodeURIComponent(selectedRow.packageId)}&step=create&selectedType=PARENT&selectedId=${encodeURIComponent(selectedRow.id)}`}>
                        {t(lang, "Open fix tools / 打开修复工具", "Open fix tools / 打开修复工具")}
                      </a>
                      <a href={`/admin/packages/${encodeURIComponent(selectedRow.packageId)}/billing`}>
                        {t(lang, "Open package billing / 打开课包账单页", "Open package billing / 打开课包账单页")}
                      </a>
                    </div>
                  ) : null}
                  {canSuperRevoke && selectedRow.type === "PARENT" ? (
                    <form action={revokeParentReceiptForRedoAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="packageId" value={selectedRow.packageId} />
                      <input type="hidden" name="receiptId" value={selectedRow.id} />
                      <input name="reason" placeholder={t(lang, "Revoke reason (optional) / 撤回原因（可选）", "Revoke reason (optional) / 撤回原因（可选）")} />
                      <button type="submit">{t(lang, "Revoke to redo / 撤回重做", "Revoke to redo / 撤回重做")}</button>
                    </form>
                  ) : null}
                  {canSuperRevoke && selectedRow.type === "PARTNER" ? (
                    <form action={revokePartnerReceiptForRedoAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <input type="hidden" name="receiptId" value={selectedRow.id} />
                      <input name="reason" placeholder={t(lang, "Revoke reason (optional) / 撤回原因（可选）", "Revoke reason (optional) / 撤回原因（可选）")} />
                      <button type="submit">{t(lang, "Revoke to redo / 撤回重做", "Revoke to redo / 撤回重做")}</button>
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
