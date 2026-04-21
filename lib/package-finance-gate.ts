import { PackageFinanceGateStatus, PackageInvoiceApprovalStatus, type PartnerSettlementMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";

export function isPartnerSettlementPackage(settlementMode: PartnerSettlementMode | null | undefined) {
  return settlementMode === "ONLINE_PACKAGE_END" || settlementMode === "OFFLINE_MONTHLY";
}

export function shouldRequirePackageInvoiceGate(input: {
  settlementMode: PartnerSettlementMode | null | undefined;
  invoiceGateExempt?: boolean | null | undefined;
}) {
  return !isPartnerSettlementPackage(input.settlementMode) && !Boolean(input.invoiceGateExempt);
}

export function packageFinanceGateLabel(status: PackageFinanceGateStatus) {
  switch (status) {
    case "INVOICE_PENDING_MANAGER":
      return "Invoice pending manager approval";
    case "SCHEDULABLE":
      return "Schedulable";
    case "BLOCKED":
      return "Blocked";
    default:
      return "Exempt";
  }
}

export function packageFinanceGateLabelZh(status: PackageFinanceGateStatus) {
  switch (status) {
    case "INVOICE_PENDING_MANAGER":
      return "发票待管理审批";
    case "SCHEDULABLE":
      return "可排课";
    case "BLOCKED":
      return "已阻塞";
    default:
      return "例外放行";
  }
}

export function packageFinanceGateTone(status: PackageFinanceGateStatus): "neutral" | "warn" | "success" | "error" {
  switch (status) {
    case "INVOICE_PENDING_MANAGER":
      return "warn";
    case "SCHEDULABLE":
      return "success";
    case "BLOCKED":
      return "error";
    default:
      return "neutral";
  }
}

export function buildPackageFinanceGateReason(input: {
  status: PackageFinanceGateStatus;
  invoiceNo?: string | null;
  rejectReason?: string | null;
  settlementMode?: PartnerSettlementMode | null;
}) {
  if (input.status === "EXEMPT") {
    if (isPartnerSettlementPackage(input.settlementMode)) {
      return "Partner settlement package stays outside direct-billing invoice gate.";
    }
    return "Package is exempt from direct-billing invoice gate.";
  }
  if (input.status === "INVOICE_PENDING_MANAGER") {
    return input.invoiceNo
      ? `Invoice ${input.invoiceNo} is waiting for manager approval.`
      : "Invoice is waiting for manager approval.";
  }
  if (input.status === "BLOCKED") {
    return input.rejectReason
      ? `Manager rejected invoice approval: ${input.rejectReason}`
      : "Manager rejected invoice approval.";
  }
  return input.invoiceNo
    ? `Invoice ${input.invoiceNo} is manager-approved and package is schedulable.`
    : "Manager-approved invoice gate completed. Package is schedulable.";
}

export async function createPackageInvoiceApproval(input: {
  packageId: string;
  invoiceId: string;
  submittedBy: string;
}) {
  return prisma.packageInvoiceApproval.create({
    data: {
      packageId: input.packageId,
      invoiceId: input.invoiceId,
      status: PackageInvoiceApprovalStatus.PENDING_MANAGER,
      submittedBy: input.submittedBy.trim().toLowerCase(),
    },
  });
}

export async function getLatestPackageInvoiceApproval(packageId: string) {
  return prisma.packageInvoiceApproval.findFirst({
    where: { packageId },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
  });
}

export async function assertActorCanManagePackageInvoiceApproval(actorEmail: string) {
  const cfg = await getApprovalRoleConfig();
  const normalized = actorEmail.trim().toLowerCase();
  if (!isRoleApprover(normalized, cfg.managerApproverEmails)) {
    throw new Error("Only manager approvers can act on package invoice gate approvals");
  }
  return cfg;
}

export async function approvePackageInvoiceApproval(input: {
  approvalId: string;
  actorEmail: string;
}) {
  await assertActorCanManagePackageInvoiceApproval(input.actorEmail);
  const approval = await prisma.packageInvoiceApproval.findUnique({
    where: { id: input.approvalId },
    include: { package: true },
  });
  if (!approval) throw new Error("Package invoice approval not found");
  if (approval.status !== "PENDING_MANAGER") throw new Error("Package invoice approval is no longer pending");
  const actor = input.actorEmail.trim().toLowerCase();
  const reason = buildPackageFinanceGateReason({
    status: "SCHEDULABLE",
  });
  await prisma.$transaction([
    prisma.packageInvoiceApproval.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        managerApprovedBy: actor,
        managerApprovedAt: new Date(),
        managerRejectReason: null,
      },
    }),
    prisma.coursePackage.update({
      where: { id: approval.packageId },
      data: {
        financeGateStatus: "SCHEDULABLE",
        financeGateReason: reason,
        financeGateUpdatedAt: new Date(),
        financeGateUpdatedBy: actor,
      },
    }),
  ]);
}

export async function rejectPackageInvoiceApproval(input: {
  approvalId: string;
  actorEmail: string;
  rejectReason: string;
}) {
  await assertActorCanManagePackageInvoiceApproval(input.actorEmail);
  const approval = await prisma.packageInvoiceApproval.findUnique({
    where: { id: input.approvalId },
    include: { package: true },
  });
  if (!approval) throw new Error("Package invoice approval not found");
  if (approval.status !== "PENDING_MANAGER") throw new Error("Package invoice approval is no longer pending");
  const actor = input.actorEmail.trim().toLowerCase();
  const rejectReason = input.rejectReason.trim();
  if (!rejectReason) throw new Error("Reject reason is required");
  await prisma.$transaction([
    prisma.packageInvoiceApproval.update({
      where: { id: approval.id },
      data: {
        status: "REJECTED",
        managerApprovedBy: null,
        managerApprovedAt: null,
        managerRejectReason: rejectReason,
      },
    }),
    prisma.coursePackage.update({
      where: { id: approval.packageId },
      data: {
        financeGateStatus: "BLOCKED",
        financeGateReason: buildPackageFinanceGateReason({
          status: "BLOCKED",
          rejectReason,
        }),
        financeGateUpdatedAt: new Date(),
        financeGateUpdatedBy: actor,
      },
    }),
  ]);
}
