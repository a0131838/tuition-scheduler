import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import path from "path";
import { mkdir, unlink, writeFile } from "fs/promises";
import crypto from "crypto";
import {
  addParentPaymentRecord,
  buildParentReceiptNoForInvoice,
  createParentReceipt,
  deleteParentPaymentRecord,
  getParentInvoiceById,
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

const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";

function canFinanceOperate(email: string, role: string) {
  const e = String(email ?? "").trim().toLowerCase();
  return role === "FINANCE" || e === SUPER_ADMIN_EMAIL;
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

function isImageFile(pathOrName: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(pathOrName);
}

function withQuery(base: string, packageId?: string) {
  if (!packageId) return base;
  const q = `packageId=${encodeURIComponent(packageId)}`;
  return base.includes("?") ? `${base}&${q}` : `${base}?${q}`;
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
      paymentRecordId: String(formData.get("paymentRecordId") ?? "").trim() || null,
      receiptNo,
      receiptDate: String(formData.get("receiptDate") ?? "").trim() || new Date().toISOString(),
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
  searchParams?: Promise<{ msg?: string; err?: string; packageId?: string; month?: string; view?: string; selectedType?: string; selectedId?: string }>;
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
  const selectedTypeRaw = String(sp?.selectedType ?? "").trim().toUpperCase();
  const selectedType = selectedTypeRaw === "PARENT" || selectedTypeRaw === "PARTNER" ? selectedTypeRaw : "";
  const selectedId = String(sp?.selectedId ?? "").trim();

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
  const today = ymd(new Date());

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

  let rows = packageIdFilter
    ? all.receipts.filter((x) => x.packageId === packageIdFilter)
    : all.receipts;
  if (monthFilter) {
    rows = rows.filter((x) => {
      const d = new Date(x.receiptDate);
      if (Number.isNaN(+d)) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === monthFilter;
    });
  }
  rows = rows.sort((a, b) => {
    const tb = +new Date(b.receiptDate);
    const ta = +new Date(a.receiptDate);
    return tb - ta;
  });
  const approvalMap = await getParentReceiptApprovalMap(rows.map((x) => x.id));
  const parentPaymentRecordMap = new Map(all.paymentRecords.map((x) => [x.id, x]));
  let partnerRows = partnerAll.receipts;
  if (monthFilter) {
    partnerRows = partnerRows.filter((x) => {
      const d = new Date(x.receiptDate);
      if (Number.isNaN(+d)) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === monthFilter;
    });
  }
  partnerRows = partnerRows.sort((a, b) => +new Date(b.receiptDate) - +new Date(a.receiptDate));
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
  const availableInvoices = selectedBilling
    ? selectedBilling.invoices.filter((inv) => !selectedBilling.receipts.some((r) => r.invoiceId === inv.id))
    : [];

  const baseQuery = new URLSearchParams();
  if (packageIdFilter) baseQuery.set("packageId", packageIdFilter);
  if (monthFilter) baseQuery.set("month", monthFilter);
  if (viewMode !== "ALL") baseQuery.set("view", viewMode);
  const openHref = (type: "PARENT" | "PARTNER", id: string) => {
    const q = new URLSearchParams(baseQuery.toString());
    q.set("selectedType", type);
    q.set("selectedId", id);
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
      approval,
      status,
      paymentRecord: pay ? { id: pay.id, name: pay.originalFileName, path: pay.relativePath, date: pay.paymentDate } : null,
      packageId: r.packageId,
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
      approval,
      status,
      paymentRecord: pay ? { id: pay.id, name: pay.originalFileName, path: pay.relativePath, date: pay.paymentDate } : null,
      packageId: "",
      exportHref: `/api/exports/partner-receipt/${encodeURIComponent(r.id)}`,
    };
  });

  let unifiedQueue = viewMode === "PARENT" ? parentQueue : viewMode === "PARTNER" ? partnerQueue : [...parentQueue, ...partnerQueue];
  unifiedQueue = unifiedQueue.sort((a, b) => +new Date(b.receiptDate) - +new Date(a.receiptDate));
  const selectedRow = unifiedQueue.find((x) => x.type === selectedType && x.id === selectedId) ?? unifiedQueue[0] ?? null;

  return (
    <div>
      <h2>{t(lang, "Receipt Approval Center", "收据审批中心")}</h2>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <form method="get" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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

            <details style={{ marginBottom: 10 }}>
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
                  <label>Payment Date<input name="paymentDate" type="date" style={{ width: "100%" }} /></label>
                  <label>Payment Method
                    <select name="paymentMethod" defaultValue="" style={{ width: "100%" }}>
                      <option value="">(optional)</option>
                      <option value="Paynow">Paynow</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank transfer">Bank transfer</option>
                    </select>
                  </label>
                  <label>Reference No.<input name="referenceNo" placeholder="UTR / Txn Id" style={{ width: "100%" }} /></label>
                  <label>Replace Existing
                    <select name="replacePaymentRecordId" defaultValue="" style={{ width: "100%" }}>
                      <option value="">(new record)</option>
                      {selectedBilling.paymentRecords.map((r) => (
                        <option key={r.id} value={r.id}>
                          {new Date(r.uploadedAt).toLocaleDateString()} - {r.originalFileName}
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

            <details style={{ marginBottom: 10 }}>
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
                        <th align="left">Time</th>
                        <th align="left">Payment Date</th>
                        <th align="left">Method</th>
                        <th align="left">Reference</th>
                        <th align="left">File</th>
                        <th align="left">Preview</th>
                        <th align="left">Note</th>
                        <th align="left">By</th>
                        <th align="left">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBilling.paymentRecords.map((r) => (
                        <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                          <td>{new Date(r.uploadedAt).toLocaleString()}</td>
                          <td>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "-"}</td>
                          <td>{r.paymentMethod || "-"}</td>
                          <td>{r.referenceNo || "-"}</td>
                          <td>
                            <a href={r.relativePath} target="_blank" rel="noreferrer">
                              Open File
                            </a>
                          </td>
                          <td>
                            {isImageFile(r.relativePath) || isImageFile(r.originalFileName) ? (
                              <a href={r.relativePath} target="_blank" rel="noreferrer">
                                <img
                                  src={r.relativePath}
                                  alt={r.originalFileName}
                                  style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid #ddd", borderRadius: 4 }}
                                />
                              </a>
                            ) : (
                              <span style={{ color: "#666" }}>No preview</span>
                            )}
                          </td>
                          <td>{r.note ?? "-"}</td>
                          <td>{r.uploadedBy}</td>
                          <td>
                            <form action={deletePaymentRecordAction}>
                              <input type="hidden" name="packageId" value={packageIdFilter} />
                              <input type="hidden" name="recordId" value={r.id} />
                              <button type="submit">Delete</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>

            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {t(lang, "3) Create Receipt", "3）创建收据")}
              </summary>
              <form action={createReceiptAction} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginTop: 8 }}>
              <input type="hidden" name="packageId" value={packageIdFilter} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 8 }}>
                <label>Source Invoice
                  <select name="invoiceId" defaultValue={availableInvoices[0]?.id ?? ""} required style={{ width: "100%" }}>
                    <option value="" disabled>{availableInvoices.length === 0 ? "(No available invoice)" : "Select an invoice"}</option>
                    {availableInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>{inv.invoiceNo} / {money(inv.totalAmount)}</option>
                    ))}
                  </select>
                </label>
                <label>Receipt No.
                  <input name="receiptNo" placeholder="Leave blank to auto-generate: InvoiceNo-RC" style={{ width: "100%" }} />
                  <div style={{ fontSize: 12, color: "#666" }}>Must match selected invoice number + "-RC"</div>
                </label>
                <label>Receipt Date<input name="receiptDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
                <label>Received From<input name="receivedFrom" required placeholder="Please enter payer name" style={{ width: "100%" }} /></label>
                <label>Paid By
                  <select name="paidBy" required defaultValue="Paynow" style={{ width: "100%" }}>
                    <option value="Paynow">Paynow</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank transfer">Bank transfer</option>
                  </select>
                </label>
                <label>Quantity<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
                <label>Amount<input name="amount" type="number" step="0.01" defaultValue={selectedPackage.paidAmount ?? ""} style={{ width: "100%" }} /></label>
                <label>GST<input name="gstAmount" type="number" step="0.01" defaultValue={0} style={{ width: "100%" }} /></label>
                <label>Total<input name="totalAmount" type="number" step="0.01" defaultValue={selectedPackage.paidAmount ?? ""} style={{ width: "100%" }} /></label>
                <label>Amount Received<input name="amountReceived" type="number" step="0.01" defaultValue={selectedPackage.paidAmount ?? ""} style={{ width: "100%" }} /></label>
                <label>Payment Record
                  <select name="paymentRecordId" defaultValue="" style={{ width: "100%" }}>
                    <option value="">(none)</option>
                    {selectedBilling.paymentRecords.map((r) => (
                      <option key={r.id} value={r.id}>{new Date(r.uploadedAt).toLocaleDateString()} - {r.originalFileName}</option>
                    ))}
                  </select>
                </label>
                <label style={{ gridColumn: "span 4" }}>Description
                  <input
                    value={availableInvoices[0] ? `For Invoice no. ${availableInvoices[0].invoiceNo}` : "Auto generated from linked invoice number"}
                    readOnly
                    style={{ width: "100%", color: "#666", background: "#f9fafb" }}
                  />
                </label>
                <label style={{ gridColumn: "span 4" }}>Note
                  <input name="note" style={{ width: "100%" }} />
                </label>
              </div>
              <div style={{ marginTop: 8 }}>
                <button type="submit" disabled={availableInvoices.length === 0}>Create Receipt</button>
                {availableInvoices.length === 0 ? (
                  <span style={{ marginLeft: 8, color: "#92400e" }}>All invoices already have linked receipts.</span>
                ) : null}
              </div>
            </form>
            </details>
          </details>
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Unified Receipt Queue", "统一收据队列")}</h3>
        {unifiedQueue.length === 0 ? (
          <div style={{ color: "#666" }}>{t(lang, "No receipts found.", "暂无收据")}</div>
        ) : (
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th align="left">{t(lang, "Type", "类型")}</th>
                <th align="left">{t(lang, "Receipt No.", "收据号")}</th>
                <th align="left">{t(lang, "Date", "日期")}</th>
                <th align="left">{t(lang, "Invoice No.", "发票号")}</th>
                <th align="left">{t(lang, "Name / Party", "学生/对象")}</th>
                <th align="left">{t(lang, "Payment Record", "缴费记录")}</th>
                <th align="left">{t(lang, "Amount", "金额")}</th>
                <th align="left">{t(lang, "Manager", "管理")}</th>
                <th align="left">{t(lang, "Finance", "财务")}</th>
                <th align="left">{t(lang, "Status", "状态")}</th>
                <th align="left">{t(lang, "Open", "打开")}</th>
              </tr>
            </thead>
            <tbody>
              {unifiedQueue.map((x) => (
                <tr
                  key={`${x.type}-${x.id}`}
                  style={{ borderTop: "1px solid #eee", background: selectedRow?.type === x.type && selectedRow?.id === x.id ? "#f9fafb" : undefined }}
                >
                  <td>{x.type === "PARENT" ? t(lang, "Parent", "家长") : t(lang, "Partner", "合作方")}</td>
                  <td>{x.receiptNo}</td>
                  <td>{new Date(x.receiptDate).toLocaleDateString()}</td>
                  <td>{x.invoiceNo}</td>
                  <td>{x.partyName}</td>
                  <td>
                    {x.paymentRecord ? (
                      <a href={x.paymentRecord.path} target="_blank" rel="noreferrer">{x.paymentRecord.name}</a>
                    ) : (
                      <span style={{ color: "#6b7280" }}>{t(lang, "(none)", "（无）")}</span>
                    )}
                  </td>
                  <td>{money(x.amountReceived)}</td>
                  <td>
                    {roleCfg.managerApproverEmails.length === 0
                      ? t(lang, "No config", "未配置")
                      : `${x.approval.managerApprovedBy.length}/${roleCfg.managerApproverEmails.length}`}
                  </td>
                  <td>
                    {roleCfg.financeApproverEmails.length === 0
                      ? t(lang, "No config", "未配置")
                      : `${x.approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`}
                  </td>
                  <td>
                    {x.status === "COMPLETED" ? (
                      <span style={{ color: "#166534", fontWeight: 600 }}>{t(lang, "Completed", "已完成")}</span>
                    ) : x.status === "REJECTED" ? (
                      <span style={{ color: "#b00", fontWeight: 600 }}>{t(lang, "Rejected", "已驳回")}</span>
                    ) : (
                      <span style={{ color: "#b45309", fontWeight: 600 }}>{t(lang, "Pending", "待审批")}</span>
                    )}
                  </td>
                  <td>
                    <a href={openHref(x.type, x.id)}>{t(lang, "Open", "打开")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t(lang, "Selected Receipt Details & Actions", "选中收据详情与审批操作")}</h3>
        {!selectedRow ? (
          <div style={{ color: "#666" }}>{t(lang, "Please select one row from the queue above.", "请从上方队列选择一条记录。")}</div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <b>{t(lang, "Type", "类型")}:</b> {selectedRow.type === "PARENT" ? t(lang, "Parent", "家长") : t(lang, "Partner", "合作方")} |{" "}
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

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARENT" && isManagerApprover ? (
                <>
                  <form action={managerApproveReceiptAction}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Manager Approve", "管理审批通过")}</button>
                  </form>
                  <form action={managerRejectReceiptAction} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Manager reject reason", "管理驳回原因")} />
                    <button type="submit">{t(lang, "Manager Reject", "管理驳回")}</button>
                  </form>
                </>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARENT" && isFinanceApprover ? (
                <>
                  <form action={financeApproveReceiptAction}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Finance Approve", "财务审批通过")}</button>
                  </form>
                  <form action={financeRejectReceiptAction} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="packageId" value={selectedRow.packageId} />
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Finance reject reason", "财务驳回原因")} />
                    <button type="submit">{t(lang, "Finance Reject", "财务驳回")}</button>
                  </form>
                </>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARTNER" && isManagerApprover ? (
                <>
                  <form action={managerApprovePartnerReceiptAction}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Manager Approve", "管理审批通过")}</button>
                  </form>
                  <form action={managerRejectPartnerReceiptAction} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Manager reject reason", "管理驳回原因")} />
                    <button type="submit">{t(lang, "Manager Reject", "管理驳回")}</button>
                  </form>
                </>
              ) : null}
              {selectedRow.status !== "COMPLETED" && selectedRow.type === "PARTNER" && isFinanceApprover ? (
                <>
                  <form action={financeApprovePartnerReceiptAction}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <button type="submit">{t(lang, "Finance Approve", "财务审批通过")}</button>
                  </form>
                  <form action={financeRejectPartnerReceiptAction} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="receiptId" value={selectedRow.id} />
                    <input name="reason" placeholder={t(lang, "Finance reject reason", "财务驳回原因")} />
                    <button type="submit">{t(lang, "Finance Reject", "财务驳回")}</button>
                  </form>
                </>
              ) : null}
              {canSuperRevoke && selectedRow.type === "PARENT" ? (
                <form action={revokeParentReceiptForRedoAction} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="packageId" value={selectedRow.packageId} />
                  <input type="hidden" name="receiptId" value={selectedRow.id} />
                  <input name="reason" placeholder={t(lang, "Revoke reason (optional)", "撤回原因（可选）")} />
                  <button type="submit">{t(lang, "Revoke To Redo", "撤回重做")}</button>
                </form>
              ) : null}
              {canSuperRevoke && selectedRow.type === "PARTNER" ? (
                <form action={revokePartnerReceiptForRedoAction} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="receiptId" value={selectedRow.id} />
                  <input name="reason" placeholder={t(lang, "Revoke reason (optional)", "撤回原因（可选）")} />
                  <button type="submit">{t(lang, "Revoke To Redo", "撤回重做")}</button>
                </form>
              ) : null}
              <div>
                <b>PDF:</b>{" "}
                {selectedRow.status === "COMPLETED" ? (
                  <a href={selectedRow.exportHref}>{t(lang, "Export PDF", "导出PDF")}</a>
                ) : (
                  <span style={{ color: "#b45309" }}>{t(lang, "Pending approval", "等待审批")}</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



