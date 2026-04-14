import { cache } from "react";
import { ExpenseClaimStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { areAllApproversConfirmed, getApprovalRoleConfig, isRoleApprover } from "@/lib/approval-flow";
import { getExpenseApprovalConfig } from "@/lib/expense-claims";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import { listPartnerBilling } from "@/lib/partner-billing";
import { listAllParentBilling } from "@/lib/student-parent-billing";

const SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";
const APPROVAL_OVERDUE_HOURS = 24;

export type ApprovalInboxLane = "MANAGER" | "FINANCE" | "EXPENSE";
export type ApprovalInboxType = "PARENT_RECEIPT" | "PARTNER_RECEIPT" | "EXPENSE_CLAIM";

export type ApprovalInboxItem = {
  id: string;
  key: string;
  type: ApprovalInboxType;
  lane: ApprovalInboxLane;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  waitingHours: number;
  overdue: boolean;
  createdAt: string;
  href: string;
  statusText: string;
  riskText: string | null;
};

export type ApprovalInboxSummary = {
  total: number;
  overdue: number;
  manager: number;
  finance: number;
  expense: number;
};

export type ApprovalInboxData = {
  items: ApprovalInboxItem[];
  summary: ApprovalInboxSummary;
  visibility: {
    manager: boolean;
    finance: boolean;
    expense: boolean;
  };
};

function normalizeEmail(email: string | null | undefined) {
  return String(email ?? "").trim().toLowerCase();
}

function hoursSince(iso: string | Date | null | undefined) {
  const time = new Date(iso ?? 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 3600000));
}

function compareInboxItems(a: ApprovalInboxItem, b: ApprovalInboxItem) {
  if (Number(b.overdue) !== Number(a.overdue)) return Number(b.overdue) - Number(a.overdue);
  if (b.waitingHours !== a.waitingHours) return b.waitingHours - a.waitingHours;
  if (b.amount !== a.amount) return b.amount - a.amount;
  return +new Date(b.createdAt) - +new Date(a.createdAt);
}

export const getApprovalInboxData = cache(async function getApprovalInboxData(
  actorEmailRaw: string | null | undefined,
  actorRoleRaw: string | null | undefined,
): Promise<ApprovalInboxData> {
  const actorEmail = normalizeEmail(actorEmailRaw);
  const actorRole = String(actorRoleRaw ?? "").trim().toUpperCase();
  const isSuperAdmin = actorEmail === SUPER_ADMIN_EMAIL;

  const [roleCfg, expenseCfg, parentAll, partnerAll, expenseClaims] = await Promise.all([
    getApprovalRoleConfig(),
    getExpenseApprovalConfig(),
    listAllParentBilling(),
    listPartnerBilling(),
    prisma.expenseClaim.findMany({
      where: { status: ExpenseClaimStatus.SUBMITTED },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        claimRefNo: true,
        submitterName: true,
        amountCents: true,
        currencyCode: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  const canSeeManager = isSuperAdmin || isRoleApprover(actorEmail, roleCfg.managerApproverEmails);
  const canSeeFinance = isSuperAdmin || actorRole === "FINANCE" || isRoleApprover(actorEmail, roleCfg.financeApproverEmails);
  const canSeeExpense = isSuperAdmin || isRoleApprover(actorEmail, expenseCfg.approverEmails);

  const packageIds = Array.from(
    new Set(parentAll.receipts.map((receipt) => String(receipt.packageId || "").trim()).filter(Boolean)),
  );
  const packages = packageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIds } },
        include: { student: true, course: true },
      })
    : [];
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]));
  const parentInvoiceMap = new Map(parentAll.invoices.map((invoice) => [invoice.id, invoice]));
  const parentApprovalMap = await getParentReceiptApprovalMap(parentAll.receipts.map((receipt) => receipt.id));

  const partnerInvoiceMap = new Map(partnerAll.invoices.map((invoice) => [invoice.id, invoice]));
  const partnerApprovalMap = await getPartnerReceiptApprovalMap(partnerAll.receipts.map((receipt) => receipt.id));

  const items: ApprovalInboxItem[] = [];

  if (canSeeManager || canSeeFinance) {
    for (const receipt of parentAll.receipts) {
      const approval = parentApprovalMap.get(receipt.id) ?? {
        managerApprovedBy: [],
        financeApprovedBy: [],
        managerRejectReason: null,
        financeRejectReason: null,
      };
      const managerDone = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
      const financeDone = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
      const lane: ApprovalInboxLane | null = !managerDone ? "MANAGER" : !financeDone ? "FINANCE" : null;
      if (!lane) continue;
      if (lane === "MANAGER" && !canSeeManager) continue;
      if (lane === "FINANCE" && !canSeeFinance) continue;
      const invoice = receipt.invoiceId ? parentInvoiceMap.get(receipt.invoiceId) : null;
      const pkg = packageMap.get(receipt.packageId);
      const waitingHours = hoursSince(receipt.createdAt);
      items.push({
        id: receipt.id,
        key: `parent-${receipt.id}`,
        type: "PARENT_RECEIPT",
        lane,
        title: `${pkg?.student?.name ?? "Parent"} | ${invoice?.invoiceNo ?? receipt.receiptNo}`,
        subtitle: `${pkg?.course?.name ?? "Package"} | ${receipt.receiptNo}`,
        amount: Number(receipt.amountReceived ?? 0) || 0,
        currency: "SGD",
        waitingHours,
        overdue: waitingHours >= APPROVAL_OVERDUE_HOURS,
        createdAt: receipt.createdAt,
        href: `/admin/receipts-approvals/queue?selectedType=PARENT&selectedId=${encodeURIComponent(receipt.id)}`,
        statusText: lane === "MANAGER" ? "Manager action needed" : "Finance action needed",
        riskText: receipt.paymentRecordId ? null : "Missing linked payment proof",
      });
    }

    for (const receipt of partnerAll.receipts) {
      const approval = partnerApprovalMap.get(receipt.id) ?? {
        managerApprovedBy: [],
        financeApprovedBy: [],
        managerRejectReason: null,
        financeRejectReason: null,
      };
      const managerDone = areAllApproversConfirmed(approval.managerApprovedBy, roleCfg.managerApproverEmails);
      const financeDone = areAllApproversConfirmed(approval.financeApprovedBy, roleCfg.financeApproverEmails);
      const lane: ApprovalInboxLane | null = !managerDone ? "MANAGER" : !financeDone ? "FINANCE" : null;
      if (!lane) continue;
      if (lane === "MANAGER" && !canSeeManager) continue;
      if (lane === "FINANCE" && !canSeeFinance) continue;
      const invoice = partnerInvoiceMap.get(receipt.invoiceId);
      const waitingHours = hoursSince(receipt.createdAt);
      items.push({
        id: receipt.id,
        key: `partner-${receipt.id}`,
        type: "PARTNER_RECEIPT",
        lane,
        title: `${invoice?.partnerName ?? receipt.receivedFrom} | ${invoice?.invoiceNo ?? receipt.receiptNo}`,
        subtitle: `${invoice?.mode ?? receipt.mode} | ${receipt.receiptNo}`,
        amount: Number(receipt.amountReceived ?? 0) || 0,
        currency: "SGD",
        waitingHours,
        overdue: waitingHours >= APPROVAL_OVERDUE_HOURS,
        createdAt: receipt.createdAt,
        href: `/admin/receipts-approvals/queue?view=PARTNER&selectedType=PARTNER&selectedId=${encodeURIComponent(receipt.id)}`,
        statusText: lane === "MANAGER" ? "Manager action needed" : "Finance action needed",
        riskText: receipt.paymentRecordId ? null : "Missing linked payment proof",
      });
    }
  }

  if (canSeeExpense) {
    for (const claim of expenseClaims) {
      const waitingHours = hoursSince(claim.createdAt);
      items.push({
        id: claim.id,
        key: `expense-${claim.id}`,
        type: "EXPENSE_CLAIM",
        lane: "EXPENSE",
        title: `${claim.submitterName} | ${claim.claimRefNo}`,
        subtitle: claim.description,
        amount: (Number(claim.amountCents ?? 0) || 0) / 100,
        currency: claim.currencyCode || "SGD",
        waitingHours,
        overdue: waitingHours >= APPROVAL_OVERDUE_HOURS,
        createdAt: claim.createdAt.toISOString(),
        href: `/admin/expense-claims?claimId=${encodeURIComponent(claim.id)}`,
        statusText: "Approval action needed",
        riskText: null,
      });
    }
  }

  items.sort(compareInboxItems);

  const summary: ApprovalInboxSummary = {
    total: items.length,
    overdue: items.filter((item) => item.overdue).length,
    manager: items.filter((item) => item.lane === "MANAGER").length,
    finance: items.filter((item) => item.lane === "FINANCE").length,
    expense: items.filter((item) => item.lane === "EXPENSE").length,
  };

  return {
    items,
    summary,
    visibility: {
      manager: canSeeManager,
      finance: canSeeFinance,
      expense: canSeeExpense,
    },
  };
});
