import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLang, t } from "@/lib/i18n";
import { redirect } from "next/navigation";
import {
  createParentInvoice,
  deleteParentInvoice,
  deleteParentReceipt,
  getParentInvoiceById,
  listParentBillingForPackage,
} from "@/lib/student-parent-billing";
import {
  assertGlobalInvoiceNoAvailable,
  getNextGlobalInvoiceNo,
  parseInvoiceNoParts,
  resequenceGlobalInvoiceNumbersForMonth,
} from "@/lib/global-invoice-sequence";
import {
  deleteParentReceiptApproval,
  getParentReceiptApprovalMap,
} from "@/lib/parent-receipt-approval";
import {
  getApprovalRoleConfig,
  isRoleApprover,
} from "@/lib/approval-flow";
import {
  getReceiptApprovalStatus,
  isReceiptFinanceApproved,
  isReceiptRejected,
} from "@/lib/receipt-approval-policy";
import { formatDateOnly, normalizeDateOnly } from "@/lib/date-only";
import WorkflowSourceBanner from "@/app/admin/_components/WorkflowSourceBanner";
import WorkbenchStatusChip from "@/app/admin/_components/WorkbenchStatusChip";
import CopyTextButton from "@/app/admin/_components/CopyTextButton";
import {
  approvePackageInvoiceApproval,
  getLatestPackageInvoiceApproval,
  isPartnerSettlementPackage,
  packageFinanceGateLabel,
  packageFinanceGateLabelZh,
  packageFinanceGateTone,
  rejectPackageInvoiceApproval,
} from "@/lib/package-finance-gate";
import {
  buildStudentContractIntakePath,
  buildStudentContractSignPath,
  createStudentContractDraft,
  deleteVoidStudentContractDraft,
  listStudentContractsForPackage,
  hasReusableStudentContractParentInfo,
  prepareStudentContractForSigning,
  refreshStudentContractIntakeLink,
  refreshStudentContractSignLink,
  saveStudentContractBusinessDraft,
  studentContractFlowLabel,
  studentContractFlowLabelZh,
  studentContractStatusLabel,
  studentContractStatusLabelZh,
  voidStudentContract,
} from "@/lib/student-contract";

function billingSummaryCardStyle(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 14,
    background,
    display: "grid",
    gap: 6,
    alignContent: "start",
  } as const;
}

function billingSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 170,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

function parseNum(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function roundMoney(v: number | null | undefined) {
  return Math.round((Number(v ?? 0) + Number.EPSILON) * 100) / 100;
}

function nextParentReceiptNo(invoiceNo: string, receiptNos: string[]) {
  const normalizedInvoiceNo = String(invoiceNo ?? "").trim();
  if (!normalizedInvoiceNo) return "RC";
  const escapedInvoiceNo = normalizedInvoiceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let maxOrdinal = 0;
  for (const receiptNo of receiptNos) {
    const normalizedReceiptNo = String(receiptNo ?? "").trim();
    if (!normalizedReceiptNo) continue;
    if (normalizedReceiptNo === `${normalizedInvoiceNo}-RC`) {
      maxOrdinal = Math.max(maxOrdinal, 1);
      continue;
    }
    const match = normalizedReceiptNo.match(new RegExp(`^${escapedInvoiceNo}-RC([2-9]\\d*)$`));
    if (!match) continue;
    const ordinal = Number(match[1]);
    if (Number.isInteger(ordinal) && ordinal >= 2) {
      maxOrdinal = Math.max(maxOrdinal, ordinal);
    }
  }
  return maxOrdinal + 1 <= 1 ? `${normalizedInvoiceNo}-RC` : `${normalizedInvoiceNo}-RC${maxOrdinal + 1}`;
}

function displayCreator(
  creatorRaw: string | null | undefined,
  userMap: Map<string, { name: string | null; email: string }>
) {
  const creator = String(creatorRaw ?? "").trim().toLowerCase();
  if (!creator) return "-";
  const user = userMap.get(creator);
  if (!user) return creatorRaw ?? "-";
  if (user.name && user.name.trim() && user.name.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    return `${user.name} (${user.email})`;
  }
  return user.email;
}

function normalizePackageBillingSource(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "receipts" ? "receipts" : "";
}

function sanitizeReceiptsBack(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/admin/receipts-approvals")) return "/admin/receipts-approvals";
  return normalized.slice(0, 2000);
}

function buildPackageBillingHref(
  packageId: string,
  options?: {
    sourceWorkflow?: string;
    receiptsBack?: string;
    msg?: string;
    err?: string;
  }
) {
  const params = new URLSearchParams();
  if (options?.sourceWorkflow === "receipts") {
    params.set("source", "receipts");
    params.set("receiptsBack", sanitizeReceiptsBack(options.receiptsBack));
  }
  if (options?.msg) params.set("msg", options.msg);
  if (options?.err) params.set("err", options.err);
  const query = params.toString();
  return `/admin/packages/${encodeURIComponent(packageId)}/billing${query ? `?${query}` : ""}`;
}

function buildReceiptsCenterHref(
  packageId: string,
  options?: {
    sourceWorkflow?: string;
    receiptsBack?: string;
    step?: string;
    invoiceId?: string;
    paymentRecordId?: string;
  }
) {
  const params = new URLSearchParams();
  params.set("packageId", packageId);
  if (options?.step) params.set("step", options.step);
  if (options?.invoiceId) params.set("invoiceId", options.invoiceId);
  if (options?.paymentRecordId) params.set("paymentRecordId", options.paymentRecordId);
  if (options?.sourceWorkflow === "receipts") {
    params.set("source", "receipts");
    params.set("receiptsBack", sanitizeReceiptsBack(options.receiptsBack));
  }
  return `/admin/receipts-approvals?${params.toString()}`;
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
}

function contractTone(status: string): "neutral" | "warn" | "success" | "error" {
  switch (status) {
    case "INFO_PENDING":
    case "INTAKE_PENDING":
    case "INTAKE_SUBMITTED":
    case "CONTRACT_DRAFT":
      return "warn";
    case "READY_TO_SIGN":
    case "SIGNED":
    case "INVOICE_CREATED":
      return "success";
    case "EXPIRED":
    case "VOID":
      return "error";
    default:
      return "neutral";
  }
}

function contractNeedsParentInfo(status: string) {
  return status === "INFO_PENDING" || status === "INTAKE_PENDING";
}

function contractCanEditDraft(status: string) {
  return (
    status === "INTAKE_SUBMITTED" ||
    status === "INFO_SUBMITTED" ||
    status === "CONTRACT_DRAFT" ||
    status === "READY_TO_SIGN" ||
    status === "EXPIRED"
  );
}

function contractIsTerminal(status: string) {
  return status === "SIGNED" || status === "INVOICE_CREATED" || status === "VOID";
}

function contractCanDeleteVoidDraft(contract: {
  status: string;
  signedAt: Date | null;
  invoiceId: string | null;
  invoiceNo: string | null;
  invoiceCreatedAt: Date | null;
}) {
  return (
    contract.status === "VOID" &&
    !contract.signedAt &&
    !contract.invoiceId &&
    !contract.invoiceNo &&
    !contract.invoiceCreatedAt
  );
}

function packageReceiptApprovalStateLabel(
  lang: "BILINGUAL" | "ZH" | "EN",
  approval: {
    managerApprovedBy: string[];
    financeApprovedBy: string[];
    managerRejectReason?: string | null;
    financeRejectReason?: string | null;
  },
  roleCfg: { managerApproverEmails: string[]; financeApproverEmails: string[] }
) {
  const financeReady = isReceiptFinanceApproved(approval, roleCfg);
  if (isReceiptRejected(approval)) return t(lang, "Rejected", "已驳回");
  if (!financeReady) return t(lang, "Finance action needed", "等待财务处理");
  return t(lang, "Finance approved", "财务已审批");
}

async function createInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId) redirect("/admin/packages?err=Missing+package+id");
  const pkg = await prisma.coursePackage.findUnique({
    where: { id: packageId },
    include: { student: true, course: true },
  });
  if (!pkg) redirect(`/admin/packages?err=Package+not+found`);

  const amount = parseNum(formData.get("amount"), 0);
  const gstAmount = parseNum(formData.get("gstAmount"), 0);
  const totalAmountRaw = parseNum(formData.get("totalAmount"), NaN);
  const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : amount + gstAmount;
  const issueDate = normalizeDateOnly(String(formData.get("issueDate") ?? "").trim(), new Date()) ?? formatDateOnly(new Date());
  const invoiceNoInput = String(formData.get("invoiceNo") ?? "").trim();
  const invoiceNo = invoiceNoInput || (await getNextGlobalInvoiceNo(issueDate));

  try {
    await assertGlobalInvoiceNoAvailable(invoiceNo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invoice No. already exists";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }

  try {
    await createParentInvoice({
      packageId,
      studentId: pkg.studentId,
      invoiceNo,
      issueDate,
      dueDate: normalizeDateOnly(String(formData.get("dueDate") ?? "").trim(), new Date()) ?? issueDate,
      courseStartDate: String(formData.get("courseStartDate") ?? "").trim() || null,
      courseEndDate: String(formData.get("courseEndDate") ?? "").trim() || null,
      billTo: String(formData.get("billTo") ?? "").trim() || pkg.student.name,
      quantity: Math.max(1, Math.floor(parseNum(formData.get("quantity"), 1))),
      description:
        String(formData.get("description") ?? "").trim() ||
        `Course Fees for ${pkg.student.name} (${Math.floor((pkg.totalMinutes ?? 0) / 60)} hours)`,
      amount,
      gstAmount,
      totalAmount,
      paymentTerms: String(formData.get("paymentTerms") ?? "").trim() || "Immediate",
      note: String(formData.get("note") ?? "").trim() || null,
      createdBy: admin.email,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create invoice failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }

  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Invoice created" }));
}


async function deleteInvoiceAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !invoiceId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing invoice id" }));
  }
  try {
    const existing = await getParentInvoiceById(invoiceId);
    await deleteParentInvoice({ invoiceId, actorEmail: admin.email });
    const mk = existing ? parseInvoiceNoParts(existing.invoiceNo)?.monthKey : null;
    if (mk) {
      await resequenceGlobalInvoiceNumbersForMonth(mk);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete invoice failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Invoice deleted" }));
}

async function deleteReceiptAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const receiptId = String(formData.get("receiptId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !receiptId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing receipt id" }));
  }
  try {
    await deleteParentReceipt({ receiptId, actorEmail: admin.email });
    await deleteParentReceiptApproval(receiptId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete receipt failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Receipt deleted" }));
}

async function approveInvoiceGateAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const approvalId = String(formData.get("approvalId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !approvalId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing package invoice approval id" }));
  }
  try {
    await approvePackageInvoiceApproval({ approvalId, actorEmail: admin.email });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Approve package invoice gate failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Package invoice approved and package is now schedulable" }));
}

async function rejectInvoiceGateAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const approvalId = String(formData.get("approvalId") ?? "").trim();
  const rejectReason = String(formData.get("rejectReason") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !approvalId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing package invoice approval id" }));
  }
  try {
    await rejectPackageInvoiceApproval({ approvalId, actorEmail: admin.email, rejectReason });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Reject package invoice gate failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Package invoice gate marked as blocked" }));
}

async function createContractDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const flowTypeRaw = String(formData.get("flowType") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !studentId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract target" }));
  }
  try {
    await createStudentContractDraft({
      packageId,
      studentId,
      createdByUserId: admin.id,
      flowType: flowTypeRaw === "RENEWAL" ? "RENEWAL" : "NEW_PURCHASE",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Create contract draft failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(
    buildPackageBillingHref(packageId, {
      sourceWorkflow,
      receiptsBack,
      msg: flowTypeRaw === "RENEWAL" ? "Renewal contract draft created" : "Parent info link created",
    })
  );
}

async function resendContractIntakeAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await refreshStudentContractIntakeLink({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Refresh intake link failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Parent info link refreshed" }));
}

async function resendContractSignAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await refreshStudentContractSignLink({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Refresh sign link failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Contract sign link refreshed" }));
}

async function saveContractBusinessDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await saveStudentContractBusinessDraft({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
      businessInfo: {
        totalMinutes: Number(String(formData.get("totalMinutes") ?? "").trim() || 0),
        feeAmount: Number(String(formData.get("feeAmount") ?? "").trim() || 0),
        billTo: String(formData.get("billTo") ?? "").trim(),
        agreementDateIso: String(formData.get("agreementDateIso") ?? "").trim(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Save contract draft failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Contract draft updated" }));
}

async function prepareContractSignAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await prepareStudentContractForSigning({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Prepare sign link failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Formal contract link is ready" }));
}

async function voidContractAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await voidStudentContract({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
      reason,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Void contract failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Contract marked as void" }));
}

async function deleteVoidContractDraftAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const sourceWorkflow = normalizePackageBillingSource(String(formData.get("source") ?? ""));
  const receiptsBack = sanitizeReceiptsBack(String(formData.get("receiptsBack") ?? ""));
  if (!packageId || !contractId) {
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: "Missing contract id" }));
  }
  try {
    await deleteVoidStudentContractDraft({
      contractId,
      actorUserId: admin.id,
      actorLabel: admin.email,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Delete void contract draft failed";
    redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, err: msg }));
  }
  redirect(buildPackageBillingHref(packageId, { sourceWorkflow, receiptsBack, msg: "Void draft deleted" }));
}

export default async function PackageBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string; err?: string; source?: string; receiptsBack?: string }>;
}) {
  await requireAdmin();
  const { id: packageId } = await params;
  const sp = await searchParams;
  const msg = sp?.msg ? decodeURIComponent(sp.msg) : "";
  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const sourceWorkflow = normalizePackageBillingSource(sp?.source);
  const receiptsBack = sanitizeReceiptsBack(sp?.receiptsBack);
  const lang = await getLang();
  const currentUser = await getCurrentUser();

  const [pkg, data, roleCfg, latestInvoiceApproval, packageContracts, hasRenewalContractParentInfo, latestParentIntakeForPackage] = await Promise.all([
    prisma.coursePackage.findUnique({
      where: { id: packageId },
      include: { student: true, course: true },
    }),
    listParentBillingForPackage(packageId),
    getApprovalRoleConfig(),
    getLatestPackageInvoiceApproval(packageId),
    listStudentContractsForPackage(packageId),
    prisma.coursePackage
      .findUnique({
        where: { id: packageId },
        select: { studentId: true },
      })
      .then((row) => (row ? hasReusableStudentContractParentInfo(row.studentId, packageId) : false)),
    prisma.studentParentIntake.findFirst({
      where: { packageId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);
  if (!pkg) redirect("/admin/packages?err=Package+not+found");
  const latestContract =
    packageContracts.find((contract) => contract.status !== "VOID") ??
    null;
  const voidContracts = packageContracts.filter((contract) => contract.status === "VOID");
  const deletableVoidContracts = voidContracts.filter((contract) => contractCanDeleteVoidDraft(contract));
  const archivedVoidContracts = voidContracts.filter((contract) => !contractCanDeleteVoidDraft(contract));
  const approvalMap = await getParentReceiptApprovalMap(data.receipts.map((x) => x.id));
  const canManagerApproveInvoiceGate = isRoleApprover(currentUser?.email, roleCfg.managerApproverEmails);
  const invoiceApprovalInvoice = latestInvoiceApproval?.invoiceId
    ? data.invoices.find((invoice) => invoice.id === latestInvoiceApproval.invoiceId) ?? null
    : null;
  const linkedPaymentRecordIdSet = new Set(
    data.receipts.map((receipt) => String(receipt.paymentRecordId ?? "").trim()).filter(Boolean)
  );
  const unlinkedPaymentRecords = data.paymentRecords
    .filter((record) => !linkedPaymentRecordIdSet.has(record.id))
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  const soleSuggestedPaymentRecord = unlinkedPaymentRecords.length === 1 ? unlinkedPaymentRecords[0] : null;
  const totalInvoiceAmount = roundMoney(data.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0));
  const totalReceiptedAmount = roundMoney(data.receipts.reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0));
  const today = formatDateOnly(new Date());
  const defaultInvoiceNo = await getNextGlobalInvoiceNo(today);
  const invoiceMap = new Map(data.invoices.map((x) => [x.id, x]));
  const receiptProgressMap = new Map(
    data.invoices.map((invoice) => {
      const linkedReceipts = data.receipts.filter((receipt) => receipt.invoiceId === invoice.id);
      let approvedAmount = 0;
      let pendingAmount = 0;
      let rejectedAmount = 0;
      for (const receipt of linkedReceipts) {
        const approval = approvalMap.get(receipt.id) ?? {
          managerApprovedBy: [],
          financeApprovedBy: [],
          managerRejectReason: null,
          financeRejectReason: null,
        };
        const amount = roundMoney(receipt.amountReceived);
        const status = getReceiptApprovalStatus(approval, roleCfg);
        if (status === "REJECTED") {
          rejectedAmount += amount;
        } else if (status === "COMPLETED") {
          approvedAmount += amount;
        } else {
          pendingAmount += amount;
        }
      }
      const createdAmount = roundMoney(linkedReceipts.reduce((sum, receipt) => sum + Number(receipt.amountReceived || 0), 0));
      const remainingAmount = Math.max(0, roundMoney(invoice.totalAmount - createdAmount));
      return [
        invoice.id,
        {
          receiptCount: linkedReceipts.length,
          createdAmount,
          approvedAmount: roundMoney(approvedAmount),
          pendingAmount: roundMoney(pendingAmount),
          rejectedAmount: roundMoney(rejectedAmount),
          remainingAmount,
          nextReceiptNo: nextParentReceiptNo(invoice.invoiceNo, linkedReceipts.map((receipt) => receipt.receiptNo)),
          status:
            linkedReceipts.length === 0
              ? t(lang, "Receipt action needed", "待创建收据")
              : remainingAmount > 0.01
                ? t(lang, "Receipting in progress", "收据处理中")
                : t(lang, "Receipting complete", "收据已完成"),
        },
      ] as const;
    })
  );
  const totalRemainingAmount = roundMoney(
    Array.from(receiptProgressMap.values()).reduce((sum, progress) => sum + Number(progress.remainingAmount || 0), 0)
  );
  const totalPendingApprovalAmount = roundMoney(
    Array.from(receiptProgressMap.values()).reduce((sum, progress) => sum + Number(progress.pendingAmount || 0), 0)
  );
  const creatorEmails = Array.from(
    new Set(
      data.invoices
        .map((invoice) => String(invoice.createdBy ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const creatorUserMap = creatorEmails.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { email: { in: creatorEmails } },
            select: { name: true, email: true },
          })
        ).map((user) => [user.email.trim().toLowerCase(), { name: user.name, email: user.email }] as const)
      )
    : new Map<string, { name: string | null; email: string }>();
  const receiptsCenterHref = buildReceiptsCenterHref(packageId, { sourceWorkflow, receiptsBack });
  const baseUrl = appBaseUrl();
  const usesStudentContractFlow = !isPartnerSettlementPackage(pkg.settlementMode);
  const contractIntakePath =
    latestContract?.intakeToken ? buildStudentContractIntakePath(latestContract.intakeToken) : "";
  const contractSignPath =
    latestContract?.signToken ? buildStudentContractSignPath(latestContract.signToken) : "";
  const contractIntakeHref = contractIntakePath;
  const contractSignHref = contractSignPath;
  const contractIntakeShare = contractIntakePath ? `${baseUrl}${contractIntakePath}` || contractIntakePath : "";
  const contractSignShare = contractSignPath ? `${baseUrl}${contractSignPath}` || contractSignPath : "";
  const contractBusinessInfo = latestContract?.businessInfo ?? null;
  const contractParentInfo = latestContract?.parentInfo ?? null;
  const likelyLegacyNoContract =
    usesStudentContractFlow &&
    !latestContract &&
    Boolean(
      data.invoices.length > 0 ||
      data.receipts.length > 0 ||
      pkg.paid ||
      pkg.paidAt ||
      (pkg.totalMinutes ?? 0) > (pkg.remainingMinutes ?? 0)
    );
  const contractFromParentIntake =
    Boolean(latestContract && latestParentIntakeForPackage && latestParentIntakeForPackage.contractId === latestContract.id);
  const currentBillingFocusTitle =
    usesStudentContractFlow && !latestContract
      ? t(lang, "Start with contract intake", "先开始合同资料流程")
      : usesStudentContractFlow &&
        latestContract &&
        latestContract.status !== "INVOICE_CREATED" &&
        latestContract.status !== "SIGNED"
      ? t(lang, "Finish the contract first", "先完成合同流程")
      : data.invoices.length === 0
      ? t(lang, "Create the first invoice", "先创建第一张发票")
      : totalRemainingAmount > 0.01
      ? t(lang, "Continue receipting", "继续处理收据")
      : totalPendingApprovalAmount > 0.01
      ? t(lang, "Wait for finance approval", "等待财务审批")
      : t(lang, "Billing is balanced", "账务已平衡");
  const currentBillingFocusDetail =
    usesStudentContractFlow && !latestContract
      ? t(lang, "For direct-billing students, start by sending the parent info link or creating a renewal contract before touching invoicing.", "对于直客课包，先发家长资料链接或创建续费合同，再进入发票与收费流程。")
      : usesStudentContractFlow &&
        latestContract &&
        latestContract.status !== "INVOICE_CREATED" &&
        latestContract.status !== "SIGNED"
      ? t(lang, "This package is still in the contract lane. Complete parent intake, fee details, and signature first; the invoice draft will follow automatically.", "当前课包还在合同流程中。请先完成家长资料、课时费用和签字，系统之后会自动生成发票草稿。")
      : data.invoices.length === 0
      ? t(lang, "This package has no invoice yet, so the invoice form is the first action that unlocks the rest of the workflow.", "这个课包还没有发票，所以第一步应该先开票，后面的收据流转才有入口。")
      : totalRemainingAmount > 0.01
      ? t(lang, "There is still invoice value not covered by created receipts. Stay on receipt progress first.", "当前还有发票金额未被已创建收据覆盖，建议先处理收据进度。")
      : totalPendingApprovalAmount > 0.01
      ? t(lang, "Receipts are already created, but some value is still waiting in finance approval.", "收据已经创建，但仍有一部分金额卡在财务审批中。")
      : t(lang, "Invoices and receipts are aligned. Use this page mainly for confirmation, exports, or cleanup.", "当前发票和收据已经基本对齐，这一页主要用于确认、导出或收尾处理。");
  const billingSummaryCards = [
    {
      title: t(lang, "Package gate", "课包闸门"),
      value: `${packageFinanceGateLabel(pkg.financeGateStatus)} / ${packageFinanceGateLabelZh(pkg.financeGateStatus)}`,
      detail: pkg.financeGateReason || t(lang, "No finance gate note yet.", "当前还没有财务闸门说明。"),
      background:
        pkg.financeGateStatus === "BLOCKED"
          ? "#fff1f2"
          : pkg.financeGateStatus === "INVOICE_PENDING_MANAGER"
          ? "#fff7ed"
          : pkg.financeGateStatus === "SCHEDULABLE"
          ? "#f0fdf4"
          : "#f8fafc",
      border:
        pkg.financeGateStatus === "BLOCKED"
          ? "#fda4af"
          : pkg.financeGateStatus === "INVOICE_PENDING_MANAGER"
          ? "#fdba74"
          : pkg.financeGateStatus === "SCHEDULABLE"
          ? "#86efac"
          : "#dbe4f0",
    },
    {
      title: t(lang, "Current focus", "当前建议起点"),
      value: currentBillingFocusTitle,
      detail: currentBillingFocusDetail,
      background: data.invoices.length === 0 ? "#fff7ed" : totalRemainingAmount > 0.01 ? "#fffbeb" : "#f0fdf4",
      border: data.invoices.length === 0 ? "#fdba74" : totalRemainingAmount > 0.01 ? "#fde68a" : "#86efac",
    },
    {
      title: t(lang, "Package", "当前课包"),
      value: `${pkg.student.name} · ${pkg.course.name}`,
      detail: t(lang, `${data.invoices.length} invoice(s) and ${data.receipts.length} receipt(s) are already on this package.`, `当前已有 ${data.invoices.length} 张发票和 ${data.receipts.length} 张收据。`),
      background: "#eff6ff",
      border: "#bfdbfe",
    },
    {
      title: t(lang, "Receipting gap", "收据缺口"),
      value: money(totalRemainingAmount),
      detail: t(lang, `Still waiting for finance action: ${money(totalPendingApprovalAmount)}`, `仍待财务处理：${money(totalPendingApprovalAmount)}`),
      background: totalRemainingAmount > 0.01 || totalPendingApprovalAmount > 0.01 ? "#fffaf0" : "#f8fafc",
      border: totalRemainingAmount > 0.01 || totalPendingApprovalAmount > 0.01 ? "#fde68a" : "#dbe4f0",
    },
    {
      title: t(lang, "Receipt proof shortcut", "收据快捷入口"),
      value: soleSuggestedPaymentRecord
        ? soleSuggestedPaymentRecord.originalFileName
        : t(lang, "No single suggested proof", "当前没有唯一推荐凭证"),
      detail: soleSuggestedPaymentRecord
        ? t(lang, "The next receipt shortcut can carry this proof automatically.", "下一张收据快捷入口可以直接自动带上这条凭证。")
        : t(lang, "Open the receipt center when you need proof repair, queue work, or a manual receipt choice.", "如果要修补凭证、处理审批队列或手动选收据，请打开收据中心。"),
      background: soleSuggestedPaymentRecord ? "#eff6ff" : "#f8fafc",
      border: soleSuggestedPaymentRecord ? "#bfdbfe" : "#dbe4f0",
    },
  ];
  const billingSectionLinks = [
    {
      href: "#create-invoice",
      label: t(lang, "Create invoice", "创建发票"),
      detail: data.invoices.length === 0 ? t(lang, "Recommended first step now", "当前最推荐的第一步") : t(lang, "Open only when a new invoice is needed", "只在需要新发票时打开"),
      background: data.invoices.length === 0 ? "#fff7ed" : "#ffffff",
      border: data.invoices.length === 0 ? "#fdba74" : "#dbe4f0",
    },
    ...(usesStudentContractFlow
      ? [{
      href: "#contract-flow",
      label: t(lang, "Contract", "合同"),
      detail: latestContract
        ? `${studentContractFlowLabel(latestContract.flowType)} / ${studentContractFlowLabelZh(latestContract.flowType)} · ${studentContractStatusLabel(latestContract.status)} / ${studentContractStatusLabelZh(latestContract.status)}`
        : t(lang, "Send parent info link or create renewal contract", "发送家长资料链接或创建续费合同"),
      background:
        contractNeedsParentInfo(latestContract?.status ?? "")
          ? "#fff7ed"
          : latestContract?.status === "READY_TO_SIGN" || latestContract?.status === "INVOICE_CREATED"
          ? "#f0fdf4"
          : "#ffffff",
      border:
        contractNeedsParentInfo(latestContract?.status ?? "")
          ? "#fdba74"
          : latestContract?.status === "READY_TO_SIGN" || latestContract?.status === "INVOICE_CREATED"
          ? "#86efac"
          : "#dbe4f0",
    }]
      : []),
    {
      href: "#receipt-finance-processing",
      label: t(lang, "Receipt finance", "收据财务处理"),
      detail: t(lang, "Use this to jump into the finance receipt center", "从这里进入收据中心继续处理"),
      background: totalRemainingAmount > 0.01 ? "#fffbeb" : "#ffffff",
      border: totalRemainingAmount > 0.01 ? "#fde68a" : "#dbe4f0",
    },
    {
      href: "#invoices",
      label: t(lang, "Invoices", "发票"),
      detail: t(lang, `${data.invoices.length} invoice(s)`, `${data.invoices.length} 张发票`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#receipts",
      label: t(lang, "Receipts", "收据"),
      detail: t(lang, `${data.receipts.length} receipt(s)`, `${data.receipts.length} 张收据`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: receiptsCenterHref,
      label: t(lang, "Receipt center", "收据中心"),
      detail: t(lang, "Approval queue, proof repair, and receipt creation", "审批队列、凭证修补和收据创建都在这里"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
  ];

  return (
    <div>
      <h2>{t(lang, "Package Billing", "课包账单")}</h2>
      <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a href="/admin/packages">← {t(lang, "Back to Packages", "返回课包列表")}</a>
        {sourceWorkflow === "receipts" ? (
          <>
            <span style={{ color: "#94a3b8" }}>·</span>
            <a href={receiptsBack} style={{ fontWeight: 700 }}>
              {t(lang, "Back to Receipt Queue", "返回收据审批队列")}
            </a>
          </>
        ) : null}
      </div>
      {err ? <div style={{ marginBottom: 12, color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <div
        id="invoice-gate"
        style={{
          marginBottom: 14,
          padding: 14,
          borderRadius: 14,
          border:
            pkg.financeGateStatus === "BLOCKED"
              ? "1px solid #fda4af"
              : pkg.financeGateStatus === "INVOICE_PENDING_MANAGER"
              ? "1px solid #fdba74"
              : "1px solid #dbe4f0",
          background:
            pkg.financeGateStatus === "BLOCKED"
              ? "#fff1f2"
              : pkg.financeGateStatus === "INVOICE_PENDING_MANAGER"
              ? "#fffaf0"
              : "#f8fafc",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Package invoice gate", "课包发票闸门")}</div>
          <WorkbenchStatusChip
            label={`${packageFinanceGateLabel(pkg.financeGateStatus)} / ${packageFinanceGateLabelZh(pkg.financeGateStatus)}`}
            tone={packageFinanceGateTone(pkg.financeGateStatus)}
            strong={pkg.financeGateStatus === "INVOICE_PENDING_MANAGER" || pkg.financeGateStatus === "BLOCKED"}
          />
        </div>
        <div style={{ color: "#475569", fontSize: 13 }}>
          {pkg.financeGateReason || t(lang, "No finance gate note yet.", "当前还没有财务闸门说明。")}
        </div>
        {latestInvoiceApproval ? (
          <div style={{ fontSize: 13, color: "#334155" }}>
            {t(lang, "Latest approval item", "最新审批项")}:
            {" "}
            <strong>{latestInvoiceApproval.status}</strong>
            {invoiceApprovalInvoice ? ` · ${invoiceApprovalInvoice.invoiceNo}` : ""}
          </div>
        ) : null}
        {latestInvoiceApproval?.status === "PENDING_MANAGER" && canManagerApproveInvoiceGate ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <form action={approveInvoiceGateAction}>
              <input type="hidden" name="packageId" value={packageId} />
              <input type="hidden" name="approvalId" value={latestInvoiceApproval.id} />
              <input type="hidden" name="source" value={sourceWorkflow} />
              <input type="hidden" name="receiptsBack" value={receiptsBack} />
              <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 700 }}>
                {t(lang, "Approve invoice gate", "批准发票闸门")}
              </button>
            </form>
            <form action={rejectInvoiceGateAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input type="hidden" name="packageId" value={packageId} />
              <input type="hidden" name="approvalId" value={latestInvoiceApproval.id} />
              <input type="hidden" name="source" value={sourceWorkflow} />
              <input type="hidden" name="receiptsBack" value={receiptsBack} />
              <input
                name="rejectReason"
                placeholder={t(lang, "Reject reason", "驳回原因")}
                style={{ minWidth: 240, padding: "8px 10px", borderRadius: 10, border: "1px solid #fda4af" }}
              />
              <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e11d48", background: "#fff1f2", color: "#be123c", fontWeight: 700 }}>
                {t(lang, "Reject and block", "驳回并阻塞")}
              </button>
            </form>
          </div>
        ) : latestInvoiceApproval?.status === "PENDING_MANAGER" ? (
          <div style={{ fontSize: 13, color: "#92400e" }}>
            {t(lang, "This item is waiting in the manager approval lane. A configured manager approver must approve it here before scheduling can continue.", "这个项目正在等待管理审批。需要配置中的管理审批人在这里通过后，排课才能继续。")}
          </div>
        ) : null}
      </div>

      {usesStudentContractFlow ? (
        <div
          id="contract-flow"
          style={{
            marginBottom: 14,
            padding: 14,
            borderRadius: 14,
            border: "1px solid #dbeafe",
            background: "#f8fbff",
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 800 }}>{t(lang, "Contract flow", "合同流程")}</div>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {t(
                  lang,
                  "First purchase: send a parent info link, then complete the commercial details here before sending the formal sign link. Renewal: skip intake, draft the new contract here, and signing will auto-create the invoice draft and add the renewal hours to the package.",
                  "首购：先发家长资料链接，再由教务在这里补课时和费用后生成正式签字链接。续费：直接在这里起草续费合同，家长签字后系统会自动生成发票草稿，并把续费课时加回课包。"
                )}
              </div>
            </div>
            {latestContract ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <WorkbenchStatusChip
                  label={`${studentContractStatusLabel(latestContract.status)} / ${studentContractStatusLabelZh(latestContract.status)}`}
                  tone={contractTone(latestContract.status)}
                  strong={contractNeedsParentInfo(latestContract.status) || latestContract.status === "READY_TO_SIGN"}
                />
                <WorkbenchStatusChip
                  label={`${studentContractFlowLabel(latestContract.flowType)} / ${studentContractFlowLabelZh(latestContract.flowType)}`}
                  tone="neutral"
                />
              </div>
            ) : (
              <WorkbenchStatusChip label={t(lang, "No contract yet / 尚无合同", "No contract yet / 尚无合同")} tone="neutral" />
            )}
          </div>

          {latestContract ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Current stage", "当前阶段")}</div>
                  <div style={{ fontWeight: 800 }}>
                    {studentContractStatusLabel(latestContract.status)} / {studentContractStatusLabelZh(latestContract.status)}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569" }}>
                    {contractNeedsParentInfo(latestContract.status)
                      ? t(lang, "Waiting for the parent to submit their profile details.", "正在等待家长提交资料。")
                      : latestContract.status === "INTAKE_SUBMITTED"
                        ? t(lang, "Parent details are in. The school team should complete fee and hours before sending the formal contract.", "家长资料已到位，接下来请教务补充课时与费用，再发送正式合同。")
                          : latestContract.status === "CONTRACT_DRAFT"
                            ? t(lang, "Commercial details are editable here. Save changes, then generate the formal sign link.", "课时和费用可以在这里修改。保存后再生成正式签字链接。")
                          : latestContract.status === "READY_TO_SIGN"
                            ? t(lang, "The formal sign link is ready. If you change the draft below, the sign link will be regenerated.", "正式签字链接已准备好。如果修改下方合同内容，需要重新生成签字链接。")
                          : latestContract.status === "INVOICE_CREATED"
                              ? latestContract.flowType === "RENEWAL"
                                ? t(lang, "Parent signing is complete. The renewal hours have been added to the package and the linked invoice draft is ready for billing.", "家长签字已完成，续费课时已经加回课包，对应发票草稿也已生成，可以继续后续收费流程。")
                                : t(lang, "Parent signing is complete and the linked invoice draft is ready for the billing workflow.", "家长签字已完成，对应发票草稿也已生成，可以继续后续收费流程。")
                              : t(lang, "This contract is archived or closed. Create a new one only if a new contract version is truly needed.", "当前合同已经完成或关闭。只有确实需要新版本时，才重新创建。")}
                  </div>
                </div>

                {latestContract.flowType === "NEW_PURCHASE" ? (
                  <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {contractFromParentIntake ? t(lang, "Parent intake record", "家长资料记录") : t(lang, "Parent info link", "家长资料链接")}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {contractFromParentIntake
                        ? t(lang, "Submitted before student creation", "已在建学生前提交")
                        : latestContract.intakeExpiresAt
                          ? t(lang, `Expires ${latestContract.intakeExpiresAt.toLocaleString("en-SG")}`, `有效至 ${latestContract.intakeExpiresAt.toLocaleString("zh-CN")}`)
                          : t(lang, "No expiry", "无过期时间")}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      {contractNeedsParentInfo(latestContract.status)
                        ? t(lang, "Waiting for the parent to finish the profile form. Resend only if the link expires or the parent cannot find it.", "正在等待家长完成资料表。只有链接过期或家长找不到时才需要重发。")
                        : t(lang, "Parent details are already on file, so the school team can move on to lesson hours and fee details.", "家长资料已经在系统里，教务现在可以继续补课时和费用。")}
                    </div>
                    {!contractFromParentIntake ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {contractIntakeHref ? (
                          <>
                            <a href={contractIntakeHref} target="_blank" rel="noreferrer">
                              {t(lang, "Open info link", "打开资料链接")}
                            </a>
                            <CopyTextButton
                              text={contractIntakeShare}
                              label={t(lang, "Copy info link", "复制资料链接")}
                              copiedLabel={t(lang, "Copied", "已复制")}
                              style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 10px", fontWeight: 700 }}
                            />
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {contractParentInfo ? (
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                        {contractParentInfo.parentFullNameEn} · {contractParentInfo.phone} · {contractParentInfo.email}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#475569" }}>
                        {t(lang, "Keep the form simple for parents: name, phone, email, address, and relationship only.", "家长只需要填写基础资料：姓名、手机、邮箱、地址和关系。")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Renewal contract mode", "续费合同模式")}</div>
                    <div style={{ fontWeight: 700 }}>
                      {t(lang, "Parent profile reused", "复用家长资料")}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                      {contractParentInfo
                        ? `${contractParentInfo.parentFullNameEn} · ${contractParentInfo.phone} · ${contractParentInfo.email}`
                        : t(lang, "This renewal contract reuses the latest signed parent profile on the student record.", "当前续费合同会复用该学生最近一次已确认的家长资料。")}
                      <br />
                      {t(lang, "After the parent signs, the system will auto-create the invoice draft and add the renewal hours to this package.", "家长签字后，系统会自动生成发票草稿，并把这次续费课时加入当前课包。")}
                    </div>
                  </div>
                )}

                <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#fff", padding: "12px 14px", display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Formal sign link", "正式签字链接")}</div>
                  <div style={{ fontWeight: 700 }}>
                    {latestContract.signToken
                      ? latestContract.signExpiresAt
                        ? t(lang, `Expires ${latestContract.signExpiresAt.toLocaleString("en-SG")}`, `有效至 ${latestContract.signExpiresAt.toLocaleString("zh-CN")}`)
                        : t(lang, "Ready to sign", "可签署")
                      : t(lang, "Not generated yet", "尚未生成")}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                    {latestContract.status === "READY_TO_SIGN"
                      ? latestContract.signViewedAt
                        ? t(
                            lang,
                            `Viewed by parent on ${latestContract.signViewedAt.toLocaleString("en-SG")}. Resend only if the link has expired or the business details changed.`,
                            `家长已于 ${latestContract.signViewedAt.toLocaleString("zh-CN")} 打开过签字链接。只有链接过期或商务信息变化时，才需要重发。`
                          )
                        : t(lang, "Waiting for the parent to open and sign the formal agreement.", "正在等待家长打开并签署正式合同。")
                      : latestContract.signToken
                        ? t(lang, "This contract version already has a formal sign link attached.", "这份合同版本已经带有正式签字链接。")
                        : t(lang, "Generate the formal sign link after the school checks lesson hours and fee details.", "教务确认课时和费用后，再生成正式签字链接。")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {contractSignHref ? (
                      <>
                        <a href={contractSignHref} target="_blank" rel="noreferrer">
                          {t(lang, "Open sign link", "打开签字链接")}
                        </a>
                        <CopyTextButton
                          text={contractSignShare}
                          label={t(lang, "Copy sign link", "复制签字链接")}
                          copiedLabel={t(lang, "Copied", "已复制")}
                          style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", padding: "6px 10px", fontWeight: 700 }}
                        />
                      </>
                    ) : null}
                    {latestContract.contractSnapshot ? (
                      <a href={`/api/exports/student-contract/${encodeURIComponent(latestContract.id)}`} target="_blank" rel="noreferrer">
                        {t(lang, "Preview contract PDF", "预览合同 PDF")}
                      </a>
                    ) : null}
                    {latestContract.signedPdfPath ? (
                      <a href={`/api/exports/student-contract/${encodeURIComponent(latestContract.id)}?download=1`}>
                        {t(lang, "Download signed PDF", "下载已签署 PDF")}
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {contractCanEditDraft(latestContract.status) && (latestContract.flowType === "RENEWAL" || contractParentInfo) ? (
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", padding: 14, display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 800 }}>{t(lang, "Contract draft details", "合同草稿信息")}</div>
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      {t(
                        lang,
                        "Only keep the business fields here: lesson hours, fee amount, bill-to, and agreement date. If you edit them after generating the sign link, save the draft again and regenerate the formal link.",
                        "这里只保留教务需要补充的业务字段：课时、费用、开票对象和合同日期。如果生成正式链接后又修改了这些内容，请先保存草稿，再重新生成签字链接。"
                      )}
                    </div>
                  </div>
                  <form action={saveContractBusinessDraftAction} style={{ display: "grid", gap: 12 }}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="contractId" value={latestContract.id} />
                    <input type="hidden" name="source" value={sourceWorkflow} />
                    <input type="hidden" name="receiptsBack" value={receiptsBack} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Total minutes / 总课时分钟", "Total minutes / 总课时分钟")}</span>
                        <input name="totalMinutes" type="number" min={0} defaultValue={contractBusinessInfo?.totalMinutes ?? pkg.totalMinutes ?? ""} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Fee amount / 合同金额", "Fee amount / 合同金额")}</span>
                        <input name="feeAmount" type="number" min={0} step="0.01" defaultValue={contractBusinessInfo?.feeAmount ?? pkg.paidAmount ?? ""} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Bill to / 开票对象", "Bill to / 开票对象")}</span>
                        <input name="billTo" defaultValue={contractBusinessInfo?.billTo ?? pkg.student.name} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{t(lang, "Agreement date / 合同日期", "Agreement date / 合同日期")}</span>
                        <input name="agreementDateIso" type="date" defaultValue={contractBusinessInfo?.agreementDateIso ?? today} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#fff", color: "#2563eb", fontWeight: 700 }}>
                        {t(lang, "Save contract draft", "保存合同草稿")}
                      </button>
                    </div>
                  </form>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <form action={prepareContractSignAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="contractId" value={latestContract.id} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 700 }}>
                        {t(lang, "Generate formal contract link", "生成正式合同链接")}
                      </button>
                    </form>
                    {latestContract.status === "READY_TO_SIGN" ? (
                      <form action={resendContractSignAction}>
                        <input type="hidden" name="packageId" value={packageId} />
                        <input type="hidden" name="contractId" value={latestContract.id} />
                        <input type="hidden" name="source" value={sourceWorkflow} />
                        <input type="hidden" name="receiptsBack" value={receiptsBack} />
                        <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #16a34a", background: "#fff", color: "#166534", fontWeight: 700 }}>
                          {t(lang, "Refresh sign link", "刷新签字链接")}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {latestContract.invoiceNo || latestContract.status === "INVOICE_CREATED" ? (
                <div style={{ border: "1px solid #bbf7d0", borderRadius: 12, background: "#f0fdf4", padding: 14, display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800, color: "#166534" }}>{t(lang, "Signed result", "签署完成结果")}</div>
                  <div style={{ color: "#166534", fontSize: 13 }}>
                    {t(
                      lang,
                      "The parent has finished signing. The billing lane now has a linked invoice draft for the next finance steps.",
                      "家长已经完成签字，系统也已经把对应发票草稿接回当前课包的收费流程。"
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#166534" }}>
                    <span>{t(lang, `Invoice / 发票: ${latestContract.invoiceNo ?? "-"}`, `Invoice / 发票: ${latestContract.invoiceNo ?? "-"}`)}</span>
                    {latestContract.invoiceCreatedAt ? (
                      <span>
                        {t(
                          lang,
                          `Created ${latestContract.invoiceCreatedAt.toLocaleString("en-SG")}`,
                          `创建于 ${latestContract.invoiceCreatedAt.toLocaleString("zh-CN")}`
                        )}
                      </span>
                    ) : null}
                    <span>{t(lang, `Invoice gate / 发票闸门: ${packageFinanceGateLabelZh(pkg.financeGateStatus)}`, `Invoice gate / 发票闸门: ${packageFinanceGateLabelZh(pkg.financeGateStatus)}`)}</span>
                    {latestInvoiceApproval ? (
                      <span>{t(lang, `Approval / 审批: ${latestInvoiceApproval.status}`, `Approval / 审批: ${latestInvoiceApproval.status}`)}</span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {latestContract.invoiceId ? (
                      <a href={`/api/exports/parent-invoice/${encodeURIComponent(latestContract.invoiceId)}`} target="_blank" rel="noreferrer">
                        {t(lang, "Open invoice PDF", "打开对应发票 PDF")}
                      </a>
                    ) : null}
                    <a href="#invoices">{t(lang, "Open invoice lane", "打开发票区")}</a>
                    {latestInvoiceApproval ? <a href="#invoice-gate">{t(lang, "Open approval status", "查看审批状态")}</a> : null}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                {latestContract.flowType === "NEW_PURCHASE" && !contractIsTerminal(latestContract.status) && !contractFromParentIntake ? (
                  <form action={resendContractIntakeAction}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="contractId" value={latestContract.id} />
                    <input type="hidden" name="source" value={sourceWorkflow} />
                    <input type="hidden" name="receiptsBack" value={receiptsBack} />
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#fff", color: "#2563eb", fontWeight: 700 }}>
                      {t(lang, "Resend parent info link", "重发资料链接")}
                    </button>
                  </form>
                ) : null}
                {!contractIsTerminal(latestContract.status) ? (
                  <form action={voidContractAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="contractId" value={latestContract.id} />
                    <input type="hidden" name="source" value={sourceWorkflow} />
                    <input type="hidden" name="receiptsBack" value={receiptsBack} />
                    <input name="reason" placeholder={t(lang, "Void reason", "作废原因")} style={{ minWidth: 220, padding: "8px 10px", borderRadius: 10, border: "1px solid #fca5a5" }} />
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #dc2626", background: "#fff1f2", color: "#b91c1c", fontWeight: 700 }}>
                      {t(lang, "Void contract", "作废合同")}
                    </button>
                  </form>
                ) : null}
              </div>
              {contractIsTerminal(latestContract.status) ? (
                <div style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fff7f7", padding: 14, display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 800, color: "#991b1b" }}>
                    {t(lang, "Need a corrected contract version?", "需要更正这份合同吗？")}
                  </div>
                  <div style={{ color: "#7f1d1d", fontSize: 13, lineHeight: 1.6 }}>
                    {t(
                      lang,
                      "Signed or invoiced contracts stay in history. Instead of editing the old one, create a replacement version and send the new sign link to the parent.",
                      "已经签过或开过票的合同会保留在历史中。不要直接修改旧合同，请新建一份更正版本，再把新的签字链接发给家长。"
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <form action={createContractDraftAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="studentId" value={pkg.studentId} />
                      <input type="hidden" name="flowType" value={latestContract.flowType} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #991b1b", background: "#991b1b", color: "#fff", fontWeight: 700 }}>
                        {latestContract.flowType === "RENEWAL"
                          ? t(lang, "Create replacement renewal contract", "创建新的续费合同版本")
                          : t(lang, "Create replacement first-purchase contract", "创建新的首购合同版本")}
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {t(
                  lang,
                  "Use first-purchase flow when the parent still needs to submit profile details. Use renewal only when the student already has a confirmed parent profile from an earlier contract.",
                  "如果家长资料还没收集，请走首购流程；只有学生已经有上一份确认过的家长资料时，才直接走续费合同。"
                )}
              </div>
              {likelyLegacyNoContract ? (
                <div style={{ border: "1px solid #fed7aa", borderRadius: 12, background: "#fff7ed", padding: 12, color: "#9a3412", fontSize: 13, lineHeight: 1.6 }}>
                  {t(
                    lang,
                    "Legacy direct-billing package without contract history detected. The current package can continue, but the next renewal should use the renewal contract flow instead of manual top-up.",
                    "系统识别到这像是一条历史存量直客课包，目前还没有合同历史。当前课包可继续使用，但下一次续费应改走续费合同流程，而不是手工 top-up。"
                  )}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <form action={createContractDraftAction}>
                  <input type="hidden" name="packageId" value={packageId} />
                  <input type="hidden" name="studentId" value={pkg.studentId} />
                  <input type="hidden" name="flowType" value="NEW_PURCHASE" />
                  <input type="hidden" name="source" value={sourceWorkflow} />
                  <input type="hidden" name="receiptsBack" value={receiptsBack} />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2563eb", background: "#2563eb", color: "#fff", fontWeight: 700 }}>
                    {t(lang, "Send parent info link", "发送家长资料链接")}
                  </button>
                </form>
                {hasRenewalContractParentInfo ? (
                  <form action={createContractDraftAction}>
                    <input type="hidden" name="packageId" value={packageId} />
                    <input type="hidden" name="studentId" value={pkg.studentId} />
                    <input type="hidden" name="flowType" value="RENEWAL" />
                    <input type="hidden" name="source" value={sourceWorkflow} />
                    <input type="hidden" name="receiptsBack" value={receiptsBack} />
                    <button type="submit" style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #16a34a", background: "#fff", color: "#166534", fontWeight: 700 }}>
                      {t(lang, "Create renewal contract", "创建续费合同")}
                    </button>
                  </form>
                ) : (
                  <div style={{ fontSize: 13, color: "#475569" }}>
                    {t(lang, "No reusable parent profile yet, so renewal contract is hidden until the first purchase intake has been completed once.", "当前还没有可复用的家长资料，所以在首购资料流程至少完成一次前，不展示续费合同入口。")}
                  </div>
                )}
              </div>
            </div>
          )}

          {voidContracts.length > 0 ? (
            <details style={{ border: "1px dashed #cbd5e1", borderRadius: 12, background: "#fff", padding: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {t(
                  lang,
                  `Void history (${voidContracts.length})`,
                  `作废历史（${voidContracts.length}）`
                )}
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {t(
                    lang,
                    "Only void drafts that were never signed and never generated an invoice can be deleted. Signed or invoiced void contracts stay here as history.",
                    "只有未签字、未开票的作废草稿可以删除。已经签过或开过票的作废合同会保留在这里作为历史记录。"
                  )}
                </div>
                {deletableVoidContracts.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#991b1b" }}>{t(lang, "Void drafts you can delete", "可删除的作废草稿")}</div>
                    {deletableVoidContracts.map((contract) => (
                      <div
                        key={contract.id}
                        style={{
                          border: "1px solid #fecaca",
                          borderRadius: 12,
                          background: "#fff7f7",
                          padding: 12,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <WorkbenchStatusChip
                            label={`${studentContractFlowLabel(contract.flowType)} / ${studentContractFlowLabelZh(contract.flowType)}`}
                            tone="neutral"
                          />
                          <WorkbenchStatusChip
                            label={`${studentContractStatusLabel(contract.status)} / ${studentContractStatusLabelZh(contract.status)}`}
                            tone="error"
                            strong
                          />
                        </div>
                        <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>
                          {t(lang, "This void draft never reached signature or invoice creation, so it can be safely deleted.", "这份作废草稿还没进入签字和开票阶段，因此可以安全删除。")}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {contract.contractSnapshot ? (
                            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}`} target="_blank" rel="noreferrer">
                              {t(lang, "Preview PDF", "预览 PDF")}
                            </a>
                          ) : null}
                          <form action={deleteVoidContractDraftAction}>
                            <input type="hidden" name="packageId" value={packageId} />
                            <input type="hidden" name="contractId" value={contract.id} />
                            <input type="hidden" name="source" value={sourceWorkflow} />
                            <input type="hidden" name="receiptsBack" value={receiptsBack} />
                            <button
                              type="submit"
                              style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                border: "1px solid #dc2626",
                                background: "#fff1f2",
                                color: "#b91c1c",
                                fontWeight: 700,
                              }}
                            >
                              {t(lang, "Delete void draft", "删除作废草稿")}
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {archivedVoidContracts.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#475569" }}>{t(lang, "Archived contract history", "已归档的合同历史")}</div>
                    {archivedVoidContracts.map((contract) => (
                      <div
                        key={contract.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          background: "#f8fafc",
                          padding: 12,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <WorkbenchStatusChip
                            label={`${studentContractFlowLabel(contract.flowType)} / ${studentContractFlowLabelZh(contract.flowType)}`}
                            tone="neutral"
                          />
                          <WorkbenchStatusChip
                            label={`${studentContractStatusLabel(contract.status)} / ${studentContractStatusLabelZh(contract.status)}`}
                            tone="error"
                            strong
                          />
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            {t(
                              lang,
                              `Created ${contract.createdAt.toLocaleString("en-SG")}`,
                              `创建于 ${contract.createdAt.toLocaleString("zh-CN")}`
                            )}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                          {contract.signedAt
                            ? t(
                                lang,
                                `Signed on ${contract.signedAt.toLocaleString("en-SG")} and kept here as history.`,
                                `已于 ${contract.signedAt.toLocaleString("zh-CN")} 签署，作为历史保留。`
                              )
                            : contract.invoiceNo
                              ? t(
                                  lang,
                                  `Linked invoice ${contract.invoiceNo} keeps this void record in history.`,
                                  `已关联发票 ${contract.invoiceNo}，因此这条作废记录会保留在历史中。`
                                )
                              : t(
                                  lang,
                                  "This contract stays here for audit or later renewal reference.",
                                  "这条记录会保留在这里，供审计或后续续费参考。"
                                )}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {contract.contractSnapshot ? (
                            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}`} target="_blank" rel="noreferrer">
                              {t(lang, "Preview PDF", "预览 PDF")}
                            </a>
                          ) : null}
                          {contract.signedPdfPath ? (
                            <a href={`/api/exports/student-contract/${encodeURIComponent(contract.id)}?download=1`}>
                              {t(lang, "Download signed PDF", "下载已签署 PDF")}
                            </a>
                          ) : null}
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            {t(lang, "History kept for audit or renewal reference", "因审计或续费参考需要保留历史")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <div
          id="contract-flow"
          style={{
            marginBottom: 14,
            padding: 14,
            borderRadius: 14,
            border: "1px solid #dbe4f0",
            background: "#f8fafc",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>{t(lang, "Contract flow", "合同流程")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              "Partner settlement packages stay outside the student contract workflow, so no contract draft or signing link is used here.",
              "合作方课包不走学生合同流程，所以这里不会使用合同草稿或家长签字链接。"
            )}
          </div>
        </div>
      )}

      {sourceWorkflow === "receipts" ? (
        <WorkflowSourceBanner
          tone="blue"
          title={t(lang, "From Receipt Queue", "来自收据审批队列")}
          description={t(
            lang,
            "You opened this package from the receipt queue to inspect billing context. Review the invoice and receipt progress here, then jump back to the same queue when you are ready for the next item.",
            "你是从收据审批队列进入当前课包账单页的。可以先在这里核对发票和收据进度，处理完再回到原来的队列继续下一条。"
          )}
          primaryHref={receiptsBack}
          primaryLabel={t(lang, "Back to Receipt Queue", "返回收据审批队列")}
          secondaryActions={
            <a href={receiptsCenterHref} style={{ fontWeight: 700 }}>
              {t(lang, "Open this package in Receipt Center", "在收据中心打开当前课包")}
            </a>
          }
        />
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 }}>
        {billingSummaryCards.map((card) => (
          <div key={card.title} style={billingSummaryCardStyle(card.background, card.border)}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: 0.2 }}>{card.title}</div>
            <div style={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{card.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 14, marginBottom: 14, background: "#f8fbff", display: "grid", gap: 12, position: "sticky", top: 12, zIndex: 4, boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 800, color: "#1d4ed8" }}>{t(lang, "Package billing workspace", "课包账单工作台")}</div>
            <div style={{ color: "#475569", fontSize: 13 }}>
              {t(
                lang,
                "Keep the top strip for billing context and receipt progress. Open the invoice form only when you need to create a new invoice.",
                "首屏先看账单上下文和收据进度；只有需要新建发票时，再展开下方发票表单。"
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/api/exports/parent-statement/${encodeURIComponent(packageId)}`}>
              {t(lang, "Export Statement of Account PDF", "导出对账单 PDF")}
            </a>
            <a href={receiptsCenterHref}>
              {t(lang, "Open Receipt Center", "打开收据中心")}
            </a>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", letterSpacing: 0.2 }}>
            {t(lang, "Jump by section", "按区块跳转")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {billingSectionLinks.map((link) => (
              <a key={link.href + link.label} href={link.href} style={billingSectionLinkStyle(link.background, link.border)}>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{link.label}</span>
                <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{link.detail}</span>
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Package", "课包")}</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{pkg.student.name}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{pkg.course.name}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Invoice total", "发票总额")}</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{money(totalInvoiceAmount)}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{data.invoices.length} {t(lang, "invoice(s)", "张发票")}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Receipted", "已开收据")}</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{money(totalReceiptedAmount)}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{data.receipts.length} {t(lang, "receipt(s)", "张收据")}</div>
          </div>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#fff", padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Still waiting", "仍待处理")}</div>
            <div style={{ fontWeight: 800, marginTop: 4, color: totalRemainingAmount > 0.01 ? "#b45309" : "#166534" }}>{money(totalRemainingAmount)}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
              {t(lang, "Approval action needed", "等待审批处理")}: {money(totalPendingApprovalAmount)}
            </div>
          </div>
        </div>
      </div>

      <details
        id="create-invoice"
        open={data.invoices.length === 0 && (!usesStudentContractFlow || !latestContract || latestContract.status === "INVOICE_CREATED" || latestContract.status === "SIGNED")}
        style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}
      >
        <summary style={{ cursor: "pointer", listStyle: "none", padding: "12px 14px", fontWeight: 800 }}>
          {t(lang, "Create Invoice", "创建 Invoice")}
        </summary>
        <form action={createInvoiceAction} style={{ borderTop: "1px solid #e5e7eb", padding: 12 }}>
          <input type="hidden" name="packageId" value={packageId} />
          <input type="hidden" name="source" value={sourceWorkflow} />
          <input type="hidden" name="receiptsBack" value={receiptsBack} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            <label>Invoice No.
              <input name="invoiceNo" defaultValue={defaultInvoiceNo} style={{ width: "100%" }} />
              <div style={{ fontSize: 12, color: "#666" }}>Format: RGT-yyyymm-xxxx (editable)</div>
            </label>
            <label>Issue Date<input name="issueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
            <label>Due Date<input name="dueDate" type="date" defaultValue={today} style={{ width: "100%" }} /></label>
            <label>Payment Terms<input name="paymentTerms" defaultValue="Immediate" style={{ width: "100%" }} /></label>
            <label>Course Start<input name="courseStartDate" type="date" style={{ width: "100%" }} /></label>
            <label>Course End<input name="courseEndDate" type="date" style={{ width: "100%" }} /></label>
            <label>Quantity<input name="quantity" type="number" min={1} defaultValue={1} style={{ width: "100%" }} /></label>
            <label>Bill To<input name="billTo" defaultValue={pkg.student.name} style={{ width: "100%" }} /></label>
            <label>Amount<input name="amount" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
            <label>GST<input name="gstAmount" type="number" step="0.01" defaultValue={0} style={{ width: "100%" }} /></label>
            <label>Total<input name="totalAmount" type="number" step="0.01" defaultValue={pkg.paidAmount ?? ""} style={{ width: "100%" }} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Description
              <input name="description" defaultValue={`Course Fees for ${pkg.student.name}`} style={{ width: "100%" }} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>Note
              <input name="note" style={{ width: "100%" }} />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit">{t(lang, "Create Invoice", "创建 Invoice")}</button>
          </div>
        </form>
      </details>

      <h3 id="receipt-finance-processing">{t(lang, "Receipt Finance Processing", "收据财务处理")}</h3>
      <div style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#fafafa" }}>
        <div style={{ marginBottom: 8, color: "#374151" }}>
          Payment records and receipt creation are handled in the finance center with receipt approvals.
        </div>
        {soleSuggestedPaymentRecord ? (
          <div style={{ marginBottom: 8, color: "#1e40af", fontSize: 12 }}>
            {t(lang, "Only one unlinked payment proof is currently available, so the next-receipt shortcut will carry it automatically.", "当前只有一条未绑定付款凭证，下一张收据快捷入口会自动带上它。")}
            {" "}
            {soleSuggestedPaymentRecord.originalFileName} {soleSuggestedPaymentRecord.paymentAmount == null ? "" : `(${money(soleSuggestedPaymentRecord.paymentAmount)})`}
          </div>
        ) : null}
        <a href={receiptsCenterHref}>
          Open Finance Receipt Center
        </a>
      </div>

      <h3 id="invoices">{t(lang, "Invoices", "Invoices")}</h3>
      {data.invoices.length === 0 ? (
        <div style={{ marginBottom: 16, border: "1px solid #fde68a", borderRadius: 12, padding: "10px 12px", background: "#fffbeb", color: "#92400e", display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "No invoice has been created for this package yet", "这个课包还没有创建发票")}</div>
          <div style={{ fontSize: 13 }}>
            {t(lang, "Open the Create Invoice section above when finance is ready to issue the first invoice.", "财务准备开第一张发票时，展开上方创建发票区块即可。")}
          </div>
        </div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 16 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Invoice No.</th>
              <th align="left">Issue</th>
              <th align="left">Due</th>
              <th align="left">Total</th>
              <th align="left">{t(lang, "Receipt progress", "收据进度")}</th>
              <th align="left">{t(lang, "Approval snapshot", "审批快照")}</th>
              <th align="left">By</th>
              <th align="left">{t(lang, "Action", "操作")}</th>
              <th align="left">PDF</th>
              <th align="left">Delete</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((r) => {
              const progress = receiptProgressMap.get(r.id) ?? {
                receiptCount: 0,
                createdAmount: 0,
                approvedAmount: 0,
                pendingAmount: 0,
                rejectedAmount: 0,
                remainingAmount: roundMoney(r.totalAmount),
                nextReceiptNo: `${r.invoiceNo}-RC`,
                status: t(lang, "Receipt action needed", "待创建收据"),
              };
              const nextReceiptLabel = progress.nextReceiptNo.split("-").pop() ?? progress.nextReceiptNo;
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{r.invoiceNo}</td>
                  <td>{normalizeDateOnly(r.issueDate) ?? "-"}</td>
                  <td>{normalizeDateOnly(r.dueDate) ?? "-"}</td>
                  <td>{money(r.totalAmount)}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{progress.status}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {progress.receiptCount} {t(lang, "receipt(s)", "张收据")} · {t(lang, "created", "已建")}: {money(progress.createdAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: progress.remainingAmount > 0.01 ? "#b45309" : "#166534" }}>
                      {t(lang, "remaining", "剩余")}: {money(progress.remainingAmount)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: "#334155" }}>
                      {t(lang, "Approved", "已批准")}: {money(progress.approvedAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: progress.pendingAmount > 0.01 ? "#92400e" : "#64748b" }}>
                      {t(lang, "Approval action needed", "等待审批处理")}: {money(progress.pendingAmount)}
                    </div>
                    {progress.rejectedAmount > 0.01 ? (
                      <div style={{ fontSize: 12, color: "#b91c1c" }}>
                        {t(lang, "Rejected", "已驳回")}: {money(progress.rejectedAmount)}
                      </div>
                    ) : null}
                  </td>
                  <td>{displayCreator(r.createdBy, creatorUserMap)}</td>
                  <td>
                    <a
                      href={buildReceiptsCenterHref(packageId, {
                        sourceWorkflow,
                        receiptsBack,
                        step: "create",
                        invoiceId: r.id,
                        paymentRecordId: soleSuggestedPaymentRecord && progress.remainingAmount > 0.01 ? soleSuggestedPaymentRecord.id : "",
                      })}
                    >
                      {progress.remainingAmount > 0.01
                        ? t(lang, `Create ${nextReceiptLabel}`, `创建 ${nextReceiptLabel}`)
                        : t(lang, "Review receipts", "查看收据")}
                    </a>
                    {progress.remainingAmount > 0.01 ? (
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4, display: "grid", gap: 2 }}>
                        <div>
                        {t(lang, "Next receipt", "下一张收据")}: {progress.nextReceiptNo}
                        </div>
                        {soleSuggestedPaymentRecord ? (
                          <div>
                            {t(lang, "Suggested proof", "推荐凭证")}: {soleSuggestedPaymentRecord.originalFileName} {soleSuggestedPaymentRecord.paymentAmount == null ? "" : `(${money(soleSuggestedPaymentRecord.paymentAmount)})`}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                  <td><a href={`/api/exports/parent-invoice/${encodeURIComponent(r.id)}`}>Export PDF</a></td>
                  <td>
                    <form action={deleteInvoiceAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="invoiceId" value={r.id} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <button type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h3 id="receipts">{t(lang, "Receipts", "收据")}</h3>
      <div style={{ marginBottom: 8 }}>
        <a href={receiptsCenterHref}>
          {t(lang, "Open Receipt Approval Center", "打开收据审批中心")}
        </a>
      </div>
      {data.receipts.length === 0 ? (
        <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 12px", background: "#f8fbff", color: "#1d4ed8", display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "No receipt has been created yet", "还没有创建收据")}</div>
          <div style={{ fontSize: 13 }}>
            {data.invoices.length === 0
              ? t(lang, "Create an invoice first, then return here or the receipt center to create the receipt.", "请先创建发票，然后回到这里或收据中心创建收据。")
              : t(lang, "Use the invoice action above or open the receipt center to create the first receipt.", "可使用上方发票操作，或打开收据中心创建第一张收据。")}
          </div>
        </div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Receipt No.</th>
              <th align="left">Invoice No.</th>
              <th align="left">Date</th>
              <th align="left">Received From</th>
              <th align="left">Amount Received</th>
              <th align="left">{t(lang, "Invoice progress", "发票进度")}</th>
              <th align="left">Finance</th>
              <th align="left">Approval</th>
              <th align="left">PDF</th>
              <th align="left">Delete</th>
            </tr>
          </thead>
          <tbody>
            {data.receipts.map((r) => {
              const approval = approvalMap.get(r.id) ?? {
                managerApprovedBy: [],
                financeApprovedBy: [],
                managerRejectReason: null,
                financeRejectReason: null,
              };
              const exportReady = isReceiptFinanceApproved(approval, roleCfg);
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{r.receiptNo}</td>
                  <td>{r.invoiceId ? (invoiceMap.get(r.invoiceId)?.invoiceNo ?? "-") : "-"}</td>
                  <td>{normalizeDateOnly(r.receiptDate) ?? "-"}</td>
                  <td>{r.receivedFrom}</td>
                  <td>{money(r.amountReceived)}</td>
                  <td>
                    {r.invoiceId ? (() => {
                      const progress = receiptProgressMap.get(r.invoiceId);
                      if (!progress) return "-";
                      return (
                        <>
                          <div style={{ fontSize: 12, color: "#334155" }}>
                            {progress.receiptCount} {t(lang, "receipt(s)", "张收据")} · {t(lang, "created", "已建")}: {money(progress.createdAmount)}
                          </div>
                          <div style={{ fontSize: 12, color: progress.remainingAmount > 0.01 ? "#b45309" : "#166534" }}>
                            {t(lang, "remaining", "剩余")}: {money(progress.remainingAmount)}
                          </div>
                        </>
                      );
                    })() : "-"}
                  </td>
                  <td>
                    {roleCfg.financeApproverEmails.length === 0
                      ? "No approver config"
                      : `${approval.financeApprovedBy.length}/${roleCfg.financeApproverEmails.length}`}
                    {approval.financeRejectReason ? <div style={{ color: "#b00" }}>Rejected: {approval.financeRejectReason}</div> : null}
                    {approval.managerRejectReason ? <div style={{ color: "#b00" }}>Legacy manager rejected: {approval.managerRejectReason}</div> : null}
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                        {packageReceiptApprovalStateLabel(lang, approval, roleCfg)}
                      </div>
                      <a href={receiptsCenterHref}>Go to Approval</a>
                    </div>
                  </td>
                  <td>
                    {exportReady ? (
                      <a href={`/api/exports/parent-receipt/${encodeURIComponent(r.id)}`}>Export PDF</a>
                    ) : (
                      <span style={{ color: "#b45309" }}>
                        {t(lang, "Receipt PDF available after finance approval", "收据 PDF 需财务审批完成后导出")}
                      </span>
                    )}
                  </td>
                  <td>
                    <form action={deleteReceiptAction}>
                      <input type="hidden" name="packageId" value={packageId} />
                      <input type="hidden" name="receiptId" value={r.id} />
                      <input type="hidden" name="source" value={sourceWorkflow} />
                      <input type="hidden" name="receiptsBack" value={receiptsBack} />
                      <button type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
