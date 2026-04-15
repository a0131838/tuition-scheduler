import { areAllApproversConfirmed } from "@/lib/approval-flow";

export type ReceiptApprovalLike = {
  managerApprovedBy?: string[] | null;
  financeApprovedBy?: string[] | null;
  managerRejectReason?: string | null;
  financeRejectReason?: string | null;
};

export type ReceiptApprovalRoleConfig = {
  financeApproverEmails: string[];
};

export function isReceiptRejected(approval: ReceiptApprovalLike | null | undefined) {
  return Boolean(approval?.managerRejectReason || approval?.financeRejectReason);
}

export function isReceiptFinanceApproved(
  approval: ReceiptApprovalLike | null | undefined,
  roleCfg: ReceiptApprovalRoleConfig
) {
  return areAllApproversConfirmed(approval?.financeApprovedBy ?? [], roleCfg.financeApproverEmails);
}

export function getReceiptApprovalStatus(
  approval: ReceiptApprovalLike | null | undefined,
  roleCfg: ReceiptApprovalRoleConfig
): "COMPLETED" | "REJECTED" | "PENDING" {
  if (isReceiptRejected(approval)) return "REJECTED";
  return isReceiptFinanceApproved(approval, roleCfg) ? "COMPLETED" : "PENDING";
}
