import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import {
  getReceiptApprovalStatus,
  isReceiptFinanceApproved,
  isReceiptRejected,
} from "@/lib/receipt-approval-policy";
import { listAllParentBilling } from "@/lib/student-parent-billing";
import { listPartnerBilling } from "@/lib/partner-billing";
import { formatDateOnly, monthKeyFromDateOnly, normalizeDateOnly } from "@/lib/date-only";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";
import { packageFinanceGateLabelZh } from "@/lib/package-finance-gate";

type WorkbenchStatus = "PENDING_RECEIPT" | "PARTIALLY_RECEIPTED" | "PENDING_APPROVAL" | "REJECTED" | "COMPLETED";
type ExceptionReason = "REJECTED_BY_APPROVER" | "OVERDUE_PENDING_RECEIPT" | "APPROVER_CONFIG_MISSING";
type ReminderTone = "SOFT" | "NORMAL" | "STRONG";
type ReminderTarget = "ALL" | "PENDING_RECEIPT" | "PARTIALLY_RECEIPTED" | "PENDING_APPROVAL" | "REJECTED";
type ViewMode = "OVERVIEW" | "EXCEPTIONS" | "REMINDERS" | "CLOSING";

type WorkbenchRow = {
  channel: "PARENT" | "PARTNER";
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  partyName: string;
  totalAmount: number;
  receiptNo: string | null;
  receiptCount: number;
  receiptedAmount: number;
  remainingAmount: number;
  nextReceiptNo: string | null;
  status: WorkbenchStatus;
  nextAction: string;
  approvalText: string;
  openHref: string;
  exceptionReasons: ExceptionReason[];
  isException: boolean;
};

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function roundMoney(v: number) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

function parseParentReceiptOrdinal(receiptNo: string, invoiceNo: string) {
  const normalizedReceiptNo = String(receiptNo ?? "").trim().toLowerCase();
  const normalizedInvoiceNo = String(invoiceNo ?? "").trim().toLowerCase();
  if (!normalizedReceiptNo || !normalizedInvoiceNo) return 0;
  const firstReceiptNo = `${normalizedInvoiceNo}-rc`;
  if (normalizedReceiptNo === firstReceiptNo) return 1;
  const match = normalizedReceiptNo.match(new RegExp(`^${normalizedInvoiceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-rc([2-9]\\d*)$`, "i"));
  if (!match) return 0;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal >= 2 ? ordinal : 0;
}

function buildParentReceiptNo(invoiceNo: string, ordinal: number) {
  return ordinal <= 1 ? `${invoiceNo}-RC` : `${invoiceNo}-RC${ordinal}`;
}

function statusLabel(lang: Lang, status: WorkbenchStatus) {
  if (status === "PENDING_RECEIPT") return t(lang, "Pending Receipt", "待创建收据");
  if (status === "PARTIALLY_RECEIPTED") return t(lang, "Partially Receipted", "部分已开收据");
  if (status === "PENDING_APPROVAL") return t(lang, "Pending Approval", "待审批");
  if (status === "REJECTED") return t(lang, "Rejected", "已驳回");
  return t(lang, "Completed", "已完成");
}

function statusColor(status: WorkbenchStatus) {
  if (status === "PENDING_RECEIPT") return "#92400e";
  if (status === "PARTIALLY_RECEIPTED") return "#c2410c";
  if (status === "PENDING_APPROVAL") return "#b45309";
  if (status === "REJECTED") return "#b91c1c";
  return "#166534";
}

function exceptionReasonLabel(lang: Lang, reason: ExceptionReason) {
  if (reason === "REJECTED_BY_APPROVER") return t(lang, "Rejected by approver", "审批驳回");
  if (reason === "OVERDUE_PENDING_RECEIPT") return t(lang, "Overdue: pending receipt", "逾期未创建收据");
  return t(lang, "Approver config missing", "审批人配置缺失");
}

function reminderToneLabel(lang: Lang, tone: ReminderTone) {
  if (tone === "SOFT") return t(lang, "Soft", "温和");
  if (tone === "STRONG") return t(lang, "Strong", "强提醒");
  return t(lang, "Normal", "标准");
}

function csvCell(v: string | number) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, "\"\"")}"`;
}

function financeWorkbenchSummaryCardStyle(background: string, border: string) {
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

function financeWorkbenchSectionLinkStyle(background: string, border: string) {
  return {
    display: "grid",
    gap: 4,
    minWidth: 180,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background,
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  } as const;
}

export default async function FinanceWorkbenchPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    status?: string;
    channel?: string;
    q?: string;
    exceptionOnly?: string;
    exceptionReason?: string;
    reminderTone?: string;
    reminderTarget?: string;
    view?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const monthRaw = String(sp?.month ?? "").trim();
  const monthFilter = /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : "";
  const statusRaw = String(sp?.status ?? "").trim().toUpperCase();
  const statusFilter = (
    ["PENDING_RECEIPT", "PARTIALLY_RECEIPTED", "PENDING_APPROVAL", "REJECTED", "COMPLETED"] as const
  ).includes(statusRaw as WorkbenchStatus)
    ? (statusRaw as WorkbenchStatus)
    : "";
  const channelRaw = String(sp?.channel ?? "").trim().toUpperCase();
  const channelFilter =
    channelRaw === "PARENT" || channelRaw === "PARTNER"
      ? (channelRaw as "PARENT" | "PARTNER")
      : "";
  const q = String(sp?.q ?? "").trim();
  const exceptionOnly = String(sp?.exceptionOnly ?? "").trim();
  const exceptionReasonRaw = String(sp?.exceptionReason ?? "").trim().toUpperCase();
  const exceptionReasonFilter = (
    ["REJECTED_BY_APPROVER", "OVERDUE_PENDING_RECEIPT", "APPROVER_CONFIG_MISSING"] as const
  ).includes(exceptionReasonRaw as ExceptionReason)
    ? (exceptionReasonRaw as ExceptionReason)
    : "";
  const reminderToneRaw = String(sp?.reminderTone ?? "").trim().toUpperCase();
  const reminderTone = (
    ["SOFT", "NORMAL", "STRONG"] as const
  ).includes(reminderToneRaw as ReminderTone)
    ? (reminderToneRaw as ReminderTone)
    : "NORMAL";
  const reminderTargetRaw = String(sp?.reminderTarget ?? "").trim().toUpperCase();
  const reminderTarget = (
    ["ALL", "PENDING_RECEIPT", "PARTIALLY_RECEIPTED", "PENDING_APPROVAL", "REJECTED"] as const
  ).includes(reminderTargetRaw as ReminderTarget)
    ? (reminderTargetRaw as ReminderTarget)
    : "ALL";
  const viewRaw = String(sp?.view ?? "").trim().toUpperCase();
  const viewMode = (
    ["OVERVIEW", "EXCEPTIONS", "REMINDERS", "CLOSING"] as const
  ).includes(viewRaw as ViewMode)
    ? (viewRaw as ViewMode)
    : "OVERVIEW";

  const [parentAll, partnerAll, roleCfg] = await Promise.all([
    listAllParentBilling(),
    listPartnerBilling(),
    getApprovalRoleConfig(),
  ]);

  const pendingPackageApprovals = await prisma.packageInvoiceApproval.findMany({
    where: { status: "PENDING_MANAGER" },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: 8,
    include: {
      package: {
        include: { student: true, course: true },
      },
    },
  });
  const packageIds = Array.from(new Set(parentAll.invoices.map((x) => x.packageId)));
  const packageMap = packageIds.length
    ? new Map(
        (
          await prisma.coursePackage.findMany({
            where: { id: { in: packageIds } },
            include: { student: true, course: true },
          })
        ).map((x) => [x.id, x] as const),
      )
    : new Map();

  const parentReceiptsByInvoiceId = new Map<string, typeof parentAll.receipts>();
  for (const receipt of parentAll.receipts) {
    if (!receipt.invoiceId) continue;
    const bucket = parentReceiptsByInvoiceId.get(String(receipt.invoiceId)) ?? [];
    bucket.push(receipt);
    parentReceiptsByInvoiceId.set(String(receipt.invoiceId), bucket);
  }
  const partnerReceiptByInvoiceId = new Map(partnerAll.receipts.map((x) => [x.invoiceId, x]));

  const [parentApprovalMap, partnerApprovalMap] = await Promise.all([
    getParentReceiptApprovalMap(parentAll.receipts.map((x) => x.id)),
    getPartnerReceiptApprovalMap(partnerAll.receipts.map((x) => x.id)),
  ]);

  const today = formatDateOnly(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDateOnly(yesterdayDate);
  const threeDaysLaterDate = new Date();
  threeDaysLaterDate.setDate(threeDaysLaterDate.getDate() + 3);
  const threeDaysLater = formatDateOnly(threeDaysLaterDate);
  const rows: WorkbenchRow[] = [];

  for (const inv of parentAll.invoices) {
    if (monthFilter && monthKeyFromDateOnly(inv.issueDate) !== monthFilter) continue;
    const receipts = parentReceiptsByInvoiceId.get(inv.id) ?? [];
    const receiptedAmount = roundMoney(
      receipts.reduce((sum, receipt) => sum + (Number(receipt.amountReceived) || 0), 0),
    );
    const remainingAmount = Math.max(0, roundMoney((Number(inv.totalAmount ?? 0) || 0) - receiptedAmount));
    const nextReceiptOrdinal = receipts.reduce((maxOrdinal, receipt) => {
      return Math.max(maxOrdinal, parseParentReceiptOrdinal(receipt.receiptNo, inv.invoiceNo));
    }, 0) + 1;
    const nextReceiptNo = buildParentReceiptNo(inv.invoiceNo, nextReceiptOrdinal);
    const rejectedReceipt =
      receipts.find((receipt) => {
        const approval = parentApprovalMap.get(receipt.id);
        return isReceiptRejected(approval);
      }) ?? null;
    const pendingReceipt =
      receipts.find((receipt) => {
        const approval = parentApprovalMap.get(receipt.id);
        const financeReady = approval ? isReceiptFinanceApproved(approval, roleCfg) : false;
        return !isReceiptRejected(approval) && !financeReady;
      }) ?? null;
    const latestReceipt = receipts[0] ?? null;
    const reviewReceipt = rejectedReceipt ?? pendingReceipt ?? latestReceipt;
    const approval = reviewReceipt ? parentApprovalMap.get(reviewReceipt.id) : null;
    const approvalStatus = getReceiptApprovalStatus(approval, roleCfg);

    let status: WorkbenchStatus = "PENDING_RECEIPT";
    let nextAction = t(lang, "Create receipt in Receipt Approvals", "去收据审批页创建收据");
    let approvalText = "-";
    let openHref = `/admin/receipts-approvals?packageId=${encodeURIComponent(inv.packageId)}&step=create&invoiceId=${encodeURIComponent(inv.id)}`;

    if (reviewReceipt) {
      approvalText = roleCfg.financeApproverEmails.length
        ? `${receipts.length} ${t(lang, "receipt(s)", "张收据")} · ${money(receiptedAmount)}/${money(inv.totalAmount)} · F ${approval?.financeApprovedBy.length ?? 0}/${roleCfg.financeApproverEmails.length}`
        : t(lang, "Approver config missing", "审批人配置缺失");
      openHref = `/admin/receipts-approvals?packageId=${encodeURIComponent(inv.packageId)}&selectedType=PARENT&selectedId=${encodeURIComponent(reviewReceipt.id)}`;
      if (approvalStatus === "REJECTED") {
        status = "REJECTED";
        nextAction = t(lang, "Fix and resubmit in Receipt Approvals", "去收据审批页修复并重提");
      } else if (approvalStatus !== "COMPLETED") {
        status = "PENDING_APPROVAL";
        nextAction = t(lang, "Awaiting finance approval", "等待财务审批");
      } else if (remainingAmount > 0.01) {
        status = "PARTIALLY_RECEIPTED";
        nextAction = t(
          lang,
          `Create ${nextReceiptNo.split("-").pop() ?? nextReceiptNo} for remaining amount`,
          `继续创建 ${nextReceiptNo.split("-").pop() ?? nextReceiptNo} 处理剩余金额`
        );
        approvalText = `${receipts.length} ${t(lang, "receipt(s)", "张收据")} · ${money(receiptedAmount)}/${money(inv.totalAmount)} · ${t(lang, "Remaining", "剩余")} ${money(remainingAmount)} · ${nextReceiptNo}`;
        openHref = `/admin/receipts-approvals?packageId=${encodeURIComponent(inv.packageId)}&step=create&invoiceId=${encodeURIComponent(inv.id)}`;
      } else {
        status = "COMPLETED";
        nextAction = t(lang, "Export receipt/invoice", "导出收据/发票");
        approvalText = `${receipts.length} ${t(lang, "receipt(s)", "张收据")} · ${money(receiptedAmount)}/${money(inv.totalAmount)}`;
      }
    }

    const pkg = packageMap.get(inv.packageId);
    const partyName = inv.billTo || pkg?.student?.name || "-";
    const dueDate = normalizeDateOnly(inv.dueDate) ?? "-";
    const exceptionReasons: ExceptionReason[] = [];
    if (status === "REJECTED") exceptionReasons.push("REJECTED_BY_APPROVER");
    if ((status === "PENDING_RECEIPT" || status === "PARTIALLY_RECEIPTED") && dueDate !== "-" && dueDate < today) {
      exceptionReasons.push("OVERDUE_PENDING_RECEIPT");
    }
    if (
      status === "PENDING_APPROVAL" &&
      !roleCfg.financeApproverEmails.length
    ) {
      exceptionReasons.push("APPROVER_CONFIG_MISSING");
    }
    const isException = exceptionReasons.length > 0;

    rows.push({
      channel: "PARENT",
      invoiceNo: inv.invoiceNo,
      issueDate: normalizeDateOnly(inv.issueDate) ?? "-",
      dueDate,
      partyName,
      totalAmount: Number(inv.totalAmount ?? 0),
      receiptNo: reviewReceipt?.receiptNo ?? null,
      receiptCount: receipts.length,
      receiptedAmount,
      remainingAmount,
      nextReceiptNo: remainingAmount > 0.01 ? nextReceiptNo : null,
      status,
      nextAction,
      approvalText,
      openHref,
      exceptionReasons,
      isException,
    });
  }

  for (const inv of partnerAll.invoices) {
    if (monthFilter && monthKeyFromDateOnly(inv.issueDate) !== monthFilter) continue;
    const receipt = partnerReceiptByInvoiceId.get(inv.id) ?? null;
    const approval = receipt ? partnerApprovalMap.get(receipt.id) : null;
    const approvalStatus = getReceiptApprovalStatus(approval, roleCfg);

    const month = inv.monthKey || monthKeyFromDateOnly(inv.issueDate);
    let status: WorkbenchStatus = "PENDING_RECEIPT";
    let nextAction = t(lang, "Create receipt in Partner Billing", "去合作方账单页创建收据");
    let approvalText = "-";
    let openHref = `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(inv.mode)}&month=${encodeURIComponent(month)}&tab=receipt`;

    if (receipt) {
      approvalText = roleCfg.financeApproverEmails.length
        ? `F ${approval?.financeApprovedBy.length ?? 0}/${roleCfg.financeApproverEmails.length}`
        : t(lang, "Approver config missing", "审批人配置缺失");
      openHref = `/admin/receipts-approvals?selectedType=PARTNER&selectedId=${encodeURIComponent(receipt.id)}`;
      if (approvalStatus === "REJECTED") {
        status = "REJECTED";
        nextAction = t(lang, "Fix and resubmit in Receipt Approvals", "去收据审批页修复并重提");
      } else if (approvalStatus === "COMPLETED") {
        status = "COMPLETED";
        nextAction = t(lang, "Export receipt/invoice", "导出收据/发票");
      } else {
        status = "PENDING_APPROVAL";
        nextAction = t(lang, "Awaiting finance approval", "等待财务审批");
      }
    }

    const dueDate = normalizeDateOnly(inv.dueDate) ?? "-";
    const exceptionReasons: ExceptionReason[] = [];
    if (status === "REJECTED") exceptionReasons.push("REJECTED_BY_APPROVER");
    if (status === "PENDING_RECEIPT" && dueDate !== "-" && dueDate < today) {
      exceptionReasons.push("OVERDUE_PENDING_RECEIPT");
    }
    if (
      status === "PENDING_APPROVAL" &&
      !roleCfg.financeApproverEmails.length
    ) {
      exceptionReasons.push("APPROVER_CONFIG_MISSING");
    }
    const isException = exceptionReasons.length > 0;

    rows.push({
      channel: "PARTNER",
      invoiceNo: inv.invoiceNo,
      issueDate: normalizeDateOnly(inv.issueDate) ?? "-",
      dueDate,
      partyName: inv.billTo || inv.partnerName || "-",
      totalAmount: Number(inv.totalAmount ?? 0),
      receiptNo: receipt?.receiptNo ?? null,
      receiptCount: receipt ? 1 : 0,
      receiptedAmount: Number(receipt?.amountReceived ?? 0) || 0,
      remainingAmount: receipt ? 0 : Number(inv.totalAmount ?? 0) || 0,
      nextReceiptNo: null,
      status,
      nextAction,
      approvalText,
      openHref,
      exceptionReasons,
      isException,
    });
  }

  rows.sort((a, b) => {
    if (a.issueDate !== b.issueDate) return a.issueDate < b.issueDate ? 1 : -1;
    return a.invoiceNo.localeCompare(b.invoiceNo) * -1;
  });

  function containsQuery(x: WorkbenchRow) {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      x.invoiceNo.toLowerCase().includes(needle) ||
      (x.receiptNo ?? "").toLowerCase().includes(needle) ||
      x.partyName.toLowerCase().includes(needle)
    );
  }

  function matchesCommonFilters(x: WorkbenchRow) {
    if (channelFilter && x.channel !== channelFilter) return false;
    if (!containsQuery(x)) return false;
    if (exceptionOnly === "1" && !x.isException) return false;
    if (exceptionOnly === "0" && x.isException) return false;
    if (exceptionReasonFilter && !x.exceptionReasons.includes(exceptionReasonFilter)) return false;
    return true;
  }

  const commonFilteredRows = rows.filter(matchesCommonFilters);
  const filteredRows = commonFilteredRows.filter((x) => {
    if (statusFilter && x.status !== statusFilter) return false;
    return true;
  });
  const exceptionRows = filteredRows.filter((x) => x.isException);
  const counts = {
    total: filteredRows.length,
    pendingReceipt: filteredRows.filter((x) => x.status === "PENDING_RECEIPT").length,
    partiallyReceipted: filteredRows.filter((x) => x.status === "PARTIALLY_RECEIPTED").length,
    pendingApproval: filteredRows.filter((x) => x.status === "PENDING_APPROVAL").length,
    rejected: filteredRows.filter((x) => x.status === "REJECTED").length,
    completed: filteredRows.filter((x) => x.status === "COMPLETED").length,
  };
  const channelCounts = {
    parent: filteredRows.filter((x) => x.channel === "PARENT").length,
    partner: filteredRows.filter((x) => x.channel === "PARTNER").length,
  };
  const exceptionReasonCounts: Record<ExceptionReason, number> = {
    REJECTED_BY_APPROVER: filteredRows.filter((x) => x.exceptionReasons.includes("REJECTED_BY_APPROVER")).length,
    OVERDUE_PENDING_RECEIPT: filteredRows.filter((x) => x.exceptionReasons.includes("OVERDUE_PENDING_RECEIPT")).length,
    APPROVER_CONFIG_MISSING: filteredRows.filter((x) => x.exceptionReasons.includes("APPROVER_CONFIG_MISSING")).length,
  };
  const reminderRows = filteredRows.filter((x) => {
    if (x.status === "COMPLETED") return false;
    if (reminderTarget === "ALL") return true;
    return x.status === reminderTarget;
  });
  const reminderRowsTop = reminderRows.slice(0, 30);
  function reminderMessage(x: WorkbenchRow) {
    const prefix =
      reminderTone === "SOFT"
        ? t(lang, "Hello, this is a friendly follow-up.", "您好，这里做一个温和跟进。")
        : reminderTone === "STRONG"
          ? t(lang, "Important reminder:", "重要提醒：")
          : t(lang, "Reminder:", "提醒：");
    const statusHint =
      x.status === "PENDING_RECEIPT"
        ? t(lang, "receipt not created", "收据尚未创建")
        : x.status === "PARTIALLY_RECEIPTED"
          ? t(lang, "remaining receipt still needs to be created", "还有剩余金额待创建收据")
        : x.status === "PENDING_APPROVAL"
          ? t(lang, "receipt pending approval", "收据待审批")
          : t(lang, "receipt was rejected and needs resubmission", "收据已驳回，需修复重提");
    const close =
      reminderTone === "STRONG"
        ? t(lang, "Please process today to avoid delays.", "请务必在今日处理，避免延误。")
        : t(lang, "Please help process when convenient. Thank you.", "请协助尽快处理，谢谢。");
    return `${prefix} ${t(lang, "Invoice", "发票")} ${x.invoiceNo}, ${t(lang, "Amount", "金额")} SGD ${money(x.totalAmount)}, ${t(lang, "Due", "到期")} ${x.dueDate}, ${statusHint}. ${close}`;
  }
  function reminderPriority(x: WorkbenchRow) {
    if (x.status === "REJECTED") return "P0";
    if (x.exceptionReasons.includes("OVERDUE_PENDING_RECEIPT")) return "P1";
    if (x.status === "PENDING_APPROVAL") return "P2";
    if (x.status === "PARTIALLY_RECEIPTED") return "P2";
    return "P3";
  }
  const reminderCsvHeader = [
    t(lang, "Priority", "优先级"),
    t(lang, "Channel", "渠道"),
    t(lang, "Invoice No.", "发票号"),
    t(lang, "Party", "对象"),
    t(lang, "Amount", "金额"),
    t(lang, "Due Date", "到期日"),
    t(lang, "Status", "状态"),
    t(lang, "Exception Reasons", "异常原因"),
    t(lang, "Open Link", "打开链接"),
    t(lang, "Reminder Message", "提醒文案"),
  ].map((x) => csvCell(x)).join(",");
  const reminderCsvRows = reminderRows.map((x) =>
    [
      reminderPriority(x),
      x.channel,
      x.invoiceNo,
      x.partyName,
      money(x.totalAmount),
      x.dueDate,
      statusLabel(lang, x.status),
      x.exceptionReasons.map((r) => exceptionReasonLabel(lang, r)).join(" / "),
      x.openHref,
      reminderMessage(x),
    ].map((v) => csvCell(v)).join(","),
  );
  const reminderCsv = [reminderCsvHeader, ...reminderCsvRows].join("\n");
  const reminderCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(reminderCsv)}`;
  const invoiceProgressCsvHeader = [
    t(lang, "Channel", "渠道"),
    t(lang, "Invoice No.", "发票号"),
    t(lang, "Party", "对象"),
    t(lang, "Issue Date", "开票日"),
    t(lang, "Due Date", "到期日"),
    t(lang, "Invoice Total", "发票总额"),
    t(lang, "Receipt Count", "收据数"),
    t(lang, "Receipted", "已开收据"),
    t(lang, "Remaining", "剩余"),
    t(lang, "Status", "状态"),
    t(lang, "Next Receipt No.", "下一张收据号"),
    t(lang, "Next Action", "下一步"),
    t(lang, "Open Link", "打开链接"),
  ].map((x) => csvCell(x)).join(",");
  const invoiceProgressCsvRows = commonFilteredRows
    .map((x) =>
      [
        x.channel,
        x.invoiceNo,
        x.partyName,
        x.issueDate,
        x.dueDate,
        money(x.totalAmount),
        x.receiptCount,
        money(x.receiptedAmount),
        money(x.remainingAmount),
        statusLabel(lang, x.status),
        x.nextReceiptNo ?? "",
        x.nextAction,
        x.openHref,
      ].map((v) => csvCell(v)).join(",")
    );
  const invoiceProgressCsv = [invoiceProgressCsvHeader, ...invoiceProgressCsvRows].join("\n");
  const invoiceProgressCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(invoiceProgressCsv)}`;
  const partialQueueRows = commonFilteredRows
    .filter((x) => x.status === "PARTIALLY_RECEIPTED")
    .sort((a, b) => {
      const aDue = a.dueDate === "-" ? "9999-99-99" : a.dueDate;
      const bDue = b.dueDate === "-" ? "9999-99-99" : b.dueDate;
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      if (a.remainingAmount !== b.remainingAmount) return b.remainingAmount - a.remainingAmount;
      return a.invoiceNo.localeCompare(b.invoiceNo);
    });
  const partialQueueTop = partialQueueRows.slice(0, 20);
  const partialQueueHref = (() => {
    const params = new URLSearchParams();
    if (monthFilter) params.set("month", monthFilter);
    if (channelFilter) params.set("channel", channelFilter);
    if (q) params.set("q", q);
    if (exceptionOnly) params.set("exceptionOnly", exceptionOnly);
    if (exceptionReasonFilter) params.set("exceptionReason", exceptionReasonFilter);
    if (reminderTone) params.set("reminderTone", reminderTone);
    if (reminderTarget) params.set("reminderTarget", reminderTarget);
    params.set("status", "PARTIALLY_RECEIPTED");
    params.set("view", "OVERVIEW");
    return `/admin/finance/workbench?${params.toString()}`;
  })();
  const checklistMonth = monthFilter || today.slice(0, 7);
  const checklistRows = rows.filter((x) => monthKeyFromDateOnly(x.issueDate) === checklistMonth);
  const checklistCounts = {
    total: checklistRows.length,
    pendingReceipt: checklistRows.filter((x) => x.status === "PENDING_RECEIPT").length,
    partiallyReceipted: checklistRows.filter((x) => x.status === "PARTIALLY_RECEIPTED").length,
    pendingApproval: checklistRows.filter((x) => x.status === "PENDING_APPROVAL").length,
    rejected: checklistRows.filter((x) => x.status === "REJECTED").length,
    completed: checklistRows.filter((x) => x.status === "COMPLETED").length,
    approverConfigMissing: checklistRows.filter((x) =>
      x.exceptionReasons.includes("APPROVER_CONFIG_MISSING"),
    ).length,
    overduePendingReceipt: checklistRows.filter((x) =>
      x.exceptionReasons.includes("OVERDUE_PENDING_RECEIPT"),
    ).length,
  };
  const checklistReady =
    checklistCounts.total > 0 &&
    checklistCounts.pendingReceipt === 0 &&
    checklistCounts.partiallyReceipted === 0 &&
    checklistCounts.pendingApproval === 0 &&
    checklistCounts.rejected === 0;
  const checklistRisk =
    checklistCounts.approverConfigMissing > 0 || checklistCounts.overduePendingReceipt > 0;
  const checklistTopActions = checklistRows
    .filter((x) => x.status !== "COMPLETED")
    .sort((a, b) => {
      const pa = reminderPriority(a);
      const pb = reminderPriority(b);
      if (pa !== pb) return pa < pb ? -1 : 1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 10);
  const overduePendingToday = checklistRows.filter(
    (x) => (x.status === "PENDING_RECEIPT" || x.status === "PARTIALLY_RECEIPTED") && x.dueDate !== "-" && x.dueDate < today,
  ).length;
  const overduePendingYesterday = checklistRows.filter(
    (x) => (x.status === "PENDING_RECEIPT" || x.status === "PARTIALLY_RECEIPTED") && x.dueDate !== "-" && x.dueDate < yesterday,
  ).length;
  const newlyOverdueIn24h = Math.max(0, overduePendingToday - overduePendingYesterday);
  const dueSoonPending = checklistRows.filter(
    (x) =>
      (x.status === "PENDING_RECEIPT" || x.status === "PARTIALLY_RECEIPTED") &&
      x.dueDate !== "-" &&
      x.dueDate >= today &&
      x.dueDate <= threeDaysLater,
  ).length;
  const rejectedOpen = checklistRows.filter((x) => x.status === "REJECTED").length;
  const deltaAlertLevel =
    newlyOverdueIn24h > 0 || rejectedOpen > 0
      ? "HIGH"
      : dueSoonPending > 0 || overduePendingToday > 0
        ? "MEDIUM"
        : "LOW";
  const deltaWatchRows = checklistRows
    .filter((x) => x.status !== "COMPLETED")
    .filter((x) => x.status === "REJECTED" || ((x.status === "PENDING_RECEIPT" || x.status === "PARTIALLY_RECEIPTED") && x.dueDate !== "-"))
    .sort((a, b) => {
      const pa = reminderPriority(a);
      const pb = reminderPriority(b);
      if (pa !== pb) return pa < pb ? -1 : 1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 8);
  const tabHref = (nextView: ViewMode) => {
    const params = new URLSearchParams();
    if (monthFilter) params.set("month", monthFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (channelFilter) params.set("channel", channelFilter);
    if (q) params.set("q", q);
    if (exceptionOnly) params.set("exceptionOnly", exceptionOnly);
    if (exceptionReasonFilter) params.set("exceptionReason", exceptionReasonFilter);
    if (reminderTone) params.set("reminderTone", reminderTone);
    if (reminderTarget) params.set("reminderTarget", reminderTarget);
    params.set("view", nextView);
    return `/admin/finance/workbench?${params.toString()}`;
  };
  const tableRows =
    viewMode === "EXCEPTIONS" ? exceptionRows : viewMode === "REMINDERS" ? reminderRows : filteredRows;
  const tableEmptyText =
    viewMode === "EXCEPTIONS"
      ? t(lang, "No exception records.", "暂无异常记录。")
      : viewMode === "REMINDERS"
        ? t(lang, "No reminder records.", "暂无催收记录。")
        : t(lang, "No records.", "暂无记录。");
  const advancedFiltersUsed = Boolean(
    channelFilter ||
      exceptionOnly ||
      exceptionReasonFilter ||
      reminderTone !== "NORMAL" ||
      reminderTarget !== "ALL",
  );
  const activeFilterCount = [
    Boolean(monthFilter),
    Boolean(statusFilter),
    Boolean(channelFilter),
    Boolean(q),
    exceptionOnly !== "",
    Boolean(exceptionReasonFilter),
    reminderTone !== "NORMAL",
    reminderTarget !== "ALL",
  ].filter(Boolean).length;
  const currentViewLabel =
    viewMode === "EXCEPTIONS"
      ? t(lang, "Exception desk", "异常处理")
      : viewMode === "REMINDERS"
        ? t(lang, "Reminder tasks", "催收任务")
        : viewMode === "CLOSING"
          ? t(lang, "Month-end close", "月结检查")
          : t(lang, "Overview", "总览");
  const financeWorkbenchFocusTitle =
    viewMode === "EXCEPTIONS"
      ? t(lang, "Start with exception rows", "先清异常项")
      : viewMode === "REMINDERS"
        ? t(lang, "Reminder candidates are the current focus", "当前重点是催收对象")
        : viewMode === "CLOSING"
          ? checklistReady
            ? t(lang, "Month-end view looks ready to close", "月结视图看起来可收口")
            : t(lang, "Month-end blockers still need attention", "月结阻塞项仍需处理")
          : partialQueueRows.length > 0
            ? t(lang, "Partial receipt follow-up should come first", "应优先处理部分收据跟进")
            : exceptionRows.length > 0
              ? t(lang, "Exception cleanup is the next likely stop", "下一步适合先清异常")
              : t(lang, "Finance overview is relatively stable", "财务总览当前相对稳定");
  const financeWorkbenchFocusDetail =
    viewMode === "EXCEPTIONS"
      ? t(lang, "This view is already narrowed to invoices with exception reasons, so it is the fastest place to clear blockers.", "当前视图已经缩到有异常原因的发票，是清阻塞项最快的位置。")
      : viewMode === "REMINDERS"
        ? t(lang, "Use this view only to review who needs a reminder and export the task list. It still stays read-only.", "这个视图只用来判断谁需要催收并导出任务，仍然保持只读。")
        : viewMode === "CLOSING"
          ? t(lang, "Use month-end mode to confirm there are no open receipt, approval, or rejection gaps before closing the month.", "月结模式主要用来确认当月是否还有待收据、待审批或驳回缺口。")
          : t(lang, "Overview is best for scanning the whole desk, then jumping into partial receipts, exceptions, or closing checks.", "总览适合先扫全局，再决定跳去部分收据、异常处理或月结检查。");
  const financeWorkbenchSummaryCards = [
    {
      title: t(lang, "Package invoice gate", "课包发票闸门"),
      value: String(pendingPackageApprovals.length),
      detail: pendingPackageApprovals.length
        ? t(lang, "Open package billing to approve invoice drafts before scheduling continues.", "请先打开课包账单审批发票草稿，再继续后续排课。")
        : t(lang, "No package invoice approvals are waiting right now.", "当前没有等待中的课包发票审批。"),
      background: pendingPackageApprovals.length ? "#fff7ed" : "#f8fafc",
      border: pendingPackageApprovals.length ? "#fdba74" : "#dbe4f0",
    },
    {
      title: t(lang, "Current focus", "当前建议起点"),
      value: financeWorkbenchFocusTitle,
      detail: financeWorkbenchFocusDetail,
      background: viewMode === "EXCEPTIONS" ? "#fff7f7" : viewMode === "REMINDERS" ? "#eff6ff" : "#f8fafc",
      border: viewMode === "EXCEPTIONS" ? "#fecaca" : viewMode === "REMINDERS" ? "#bfdbfe" : "#dbe4f0",
    },
    {
      title: t(lang, "Current scope", "当前范围"),
      value: currentViewLabel,
      detail: t(lang, `${tableRows.length} visible row(s) with ${activeFilterCount} active filter(s).`, `当前共有 ${tableRows.length} 条可见记录，生效筛选 ${activeFilterCount} 个。`),
      background: "#fffaf0",
      border: "#fde68a",
    },
    {
      title: t(lang, "Key pressure points", "当前主要压力点"),
      value: t(lang, `${partialQueueRows.length} partial · ${exceptionRows.length} exception`, `${partialQueueRows.length} 条部分收据 · ${exceptionRows.length} 条异常`),
      detail: t(lang, `${dueSoonPending} due soon and ${rejectedOpen} rejected open.`, `${dueSoonPending} 条即将到期，${rejectedOpen} 条驳回未处理。`),
      background: deltaAlertLevel === "HIGH" ? "#fff7f7" : checklistReady ? "#f0fdf4" : "#f8fbff",
      border: deltaAlertLevel === "HIGH" ? "#fecaca" : checklistReady ? "#86efac" : "#bfdbfe",
    },
  ];
  const financeWorkbenchSectionLinks = [
    {
      href: "#finance-workbench-filters",
      label: t(lang, "Filters", "筛选区"),
      detail: t(lang, "Change scope before reading the desk", "先调范围，再看列表"),
      background: "#ffffff",
      border: "#dbe4f0",
    },
    {
      href: "#finance-workbench-partials",
      label: t(lang, "Partial receipts", "部分收据"),
      detail: t(lang, `${partialQueueRows.length} row(s)`, `${partialQueueRows.length} 条`),
      background: partialQueueRows.length > 0 ? "#fff7ed" : "#ffffff",
      border: partialQueueRows.length > 0 ? "#fdba74" : "#dbe4f0",
    },
    {
      href: "#finance-workbench-exceptions",
      label: t(lang, "Exceptions", "异常处理"),
      detail: t(lang, `${exceptionRows.length} row(s)`, `${exceptionRows.length} 条`),
      background: exceptionRows.length > 0 ? "#fff7f7" : "#ffffff",
      border: exceptionRows.length > 0 ? "#fecaca" : "#dbe4f0",
    },
    {
      href: "#finance-workbench-table",
      label: t(lang, "Main table", "主列表"),
      detail: t(lang, `${tableRows.length} visible row(s)`, `${tableRows.length} 条当前可见`),
      background: "#ffffff",
      border: "#dbe4f0",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.4 }}>
            {t(lang, "Finance Workbench", "财务工作台")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Finance Workbench (Read-only MVP)", "财务工作台（只读MVP）")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "This desk stays read-only and helps you scan invoice receipt progress, exception items, reminder candidates, and month-end readiness without writing data here.",
              "这个工作台保持只读，用来统一查看发票收据进度、异常项、催收对象和月结状态，本页本身不直接写入数据。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb", color: "#334155", fontSize: 12 }}>
            {t(lang, "Current view", "当前视图")}: <b>{currentViewLabel}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb", color: "#334155", fontSize: 12 }}>
            {t(lang, "Active filters", "生效筛选")}: <b>{activeFilterCount}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb", color: "#334155", fontSize: 12 }}>
            {t(lang, "Month scope", "月份范围")}: <b>{checklistMonth}</b>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #e5e7eb", color: deltaAlertLevel === "HIGH" ? "#b91c1c" : deltaAlertLevel === "MEDIUM" ? "#92400e" : "#166534", fontSize: 12 }}>
            {t(lang, "Delta alert", "差异预警")}: <b>{deltaAlertLevel}</b>
          </span>
          <a
            href="/api/exports/package-finance-reconciliation"
            style={{ padding: "4px 10px", borderRadius: 999, background: "#fff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
          >
            {t(lang, "Export package reconciliation workbook", "导出课包对账工作簿")}
          </a>
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {financeWorkbenchSummaryCards.map((card) => (
          <div key={card.title} style={financeWorkbenchSummaryCardStyle(card.background, card.border)}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{card.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{card.value}</div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{card.detail}</div>
          </div>
        ))}
      </section>

      {pendingPackageApprovals.length ? (
        <section style={{ border: "1px solid #fdba74", borderRadius: 14, background: "#fffaf0", padding: 14, display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800, color: "#92400e" }}>{t(lang, "Pending direct-billing package approvals", "等待中的直客课包审批")}</div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            {t(lang, "Finance can monitor these packages here. Managers can approve them from the package billing page or the approval inbox.", "财务可以在这里看到这些课包；管理层可从课包账单页或审批提醒中心完成审批。")}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {pendingPackageApprovals.map((approval) => (
              <div key={approval.id} style={{ fontSize: 13, color: "#92400e" }}>
                [{packageFinanceGateLabelZh(approval.package.financeGateStatus)}] {approval.package.student.name} · {approval.package.course.name} · <a href={`/admin/packages/${approval.packageId}/billing`}>{t(lang, "Open billing", "打开账单")}</a>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 12,
          zIndex: 5,
          display: "grid",
          gap: 12,
          background: "#ffffffee",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Finance work map", "财务工作地图")}</div>
            <div style={{ color: "#475569", fontSize: 13 }}>
              {t(lang, "Use this strip to move between filters, partial receipts, exception cleanup, and the main table without rescanning the whole page.", "先通过这条工作地图切到筛选、部分收据、异常处理或主列表，不用每次都重新扫整页。")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={partialQueueHref}>{t(lang, "Open partial queue", "打开部分收据队列")}</a>
            <a href={invoiceProgressCsvHref} download={`finance-invoice-progress-${monthFilter || "all"}.csv`}>
              {t(lang, "Export invoice progress", "导出发票进度")}
            </a>
            <a href="/api/exports/package-finance-reconciliation">
              {t(lang, "Export full package reconciliation", "导出完整课包对账报表")}
            </a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {financeWorkbenchSectionLinks.map((link) => (
            <a key={link.label} href={link.href} style={financeWorkbenchSectionLinkStyle(link.background, link.border)}>
              <div style={{ fontWeight: 700 }}>{link.label}</div>
              <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{link.detail}</div>
            </a>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div style={{ ...workbenchMetricCardStyle("blue"), background: "#f8fbff" }}>
          <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Visible rows", "当前可见")}</div>
          <div style={workbenchMetricValueStyle("blue")}>{tableRows.length}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fffbeb" }}>
          <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Partial receipts", "部分收据")}</div>
          <div style={workbenchMetricValueStyle("amber")}>{partialQueueRows.length}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fff7f7" }}>
          <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Exception rows", "异常项")}</div>
          <div style={workbenchMetricValueStyle("rose")}>{exceptionRows.length}</div>
        </div>
        <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
          <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Completed", "已完成")}</div>
          <div style={workbenchMetricValueStyle("emerald")}>{counts.completed}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          href={tabHref("OVERVIEW")}
          style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 999, background: viewMode === "OVERVIEW" ? "#e2e8f0" : "#fff", fontSize: 12 }}
        >
          {t(lang, "Overview", "总览")}
        </a>
        <a
          href={tabHref("EXCEPTIONS")}
          style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 999, background: viewMode === "EXCEPTIONS" ? "#fee2e2" : "#fff", fontSize: 12 }}
        >
          {t(lang, "Exception Desk", "异常处理")}
        </a>
        <a
          href={tabHref("REMINDERS")}
          style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 999, background: viewMode === "REMINDERS" ? "#dbeafe" : "#fff", fontSize: 12 }}
        >
          {t(lang, "Reminder Tasks", "催收任务")}
        </a>
        <a
          href={tabHref("CLOSING")}
          style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 999, background: viewMode === "CLOSING" ? "#dcfce7" : "#fff", fontSize: 12 }}
        >
          {t(lang, "Month-end Close", "月结检查")}
        </a>
      </div>

      {(viewMode === "OVERVIEW" || viewMode === "CLOSING") && (
      <div id="finance-workbench-partials" style={{ border: "1px solid #fdba74", borderRadius: 8, padding: 10, background: "#fff7ed" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, color: "#c2410c" }}>
            {t(lang, "Partial Receipt Follow-up Queue", "部分收据跟进队列")} ({partialQueueRows.length})
          </div>
          <div style={{ fontSize: 12, color: "#9a3412" }}>
            {t(lang, "Sorted by earliest due date, then largest remaining amount.", "按最早到期日优先，其次按剩余金额从大到小排序。")}
          </div>
        </div>
        {partialQueueTop.length === 0 ? (
          <div style={{ color: "#9a3412", fontSize: 12 }}>
            {t(lang, "No partially receipted invoices match the current filters.", "当前筛选下没有部分已开收据的发票。")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {partialQueueTop.map((x) => (
              <div key={`partial-${x.channel}-${x.invoiceNo}`} style={{ fontSize: 12, color: "#9a3412" }}>
                [{x.channel}] {x.invoiceNo} · {x.partyName} · {t(lang, "Due", "到期")} {x.dueDate} · {t(lang, "Remaining", "剩余")} {money(x.remainingAmount)} · {x.nextReceiptNo ?? "-"} · <a href={x.openHref}>{t(lang, "Create now", "立即创建")}</a>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {(viewMode === "OVERVIEW" || viewMode === "CLOSING") && (
      <div style={{ border: "1px solid #d1fae5", borderRadius: 8, padding: 10, background: "#ecfdf5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, color: "#065f46" }}>
            {t(lang, "Month-end Checklist (Read-only)", "月结检查清单（只读）")} · {checklistMonth}
          </div>
          <div style={{ fontSize: 12, color: checklistReady ? "#166534" : checklistRisk ? "#92400e" : "#991b1b", fontWeight: 700 }}>
            {checklistReady
              ? t(lang, "Ready to close", "可月结")
              : checklistRisk
                ? t(lang, "Not ready (with risk)", "暂不可月结（含风险）")
                : t(lang, "Not ready", "暂不可月结")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 12 }}>{t(lang, "Total", "总数")}: {checklistCounts.total}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Pending Receipt", "待创建收据")}: {checklistCounts.pendingReceipt}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Partially Receipted", "部分已开收据")}: {checklistCounts.partiallyReceipted}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Pending Approval", "待审批")}: {checklistCounts.pendingApproval}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Rejected", "已驳回")}: {checklistCounts.rejected}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Completed", "已完成")}: {checklistCounts.completed}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Approver Config Missing", "审批配置缺失")}: {checklistCounts.approverConfigMissing}</span>
          <span style={{ fontSize: 12 }}>{t(lang, "Overdue Pending Receipt", "逾期待创建收据")}: {checklistCounts.overduePendingReceipt}</span>
        </div>
        {checklistTopActions.length === 0 ? (
          <div style={{ color: "#065f46", fontSize: 12 }}>{t(lang, "No pending actions in this month.", "本月暂无待处理项。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {checklistTopActions.map((x) => (
              <div key={`check-${x.channel}-${x.invoiceNo}`} style={{ fontSize: 12, color: "#065f46" }}>
                [{reminderPriority(x)}] [{x.channel}] {x.invoiceNo} · {x.partyName} · {statusLabel(lang, x.status)} · {x.nextAction} · <a href={x.openHref}>{t(lang, "Open", "打开")}</a>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {(viewMode === "OVERVIEW" || viewMode === "CLOSING") && (
      <div style={{ border: "1px solid #fde68a", borderRadius: 8, padding: 10, background: "#fffbeb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, color: "#92400e" }}>
            {t(lang, "Delta Alert (Last 24h, Read-only)", "差异预警（近24小时，只读）")} · {checklistMonth}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: deltaAlertLevel === "HIGH" ? "#b91c1c" : deltaAlertLevel === "MEDIUM" ? "#92400e" : "#166534",
            }}
          >
            {deltaAlertLevel === "HIGH"
              ? t(lang, "Risk Rising", "风险上升")
              : deltaAlertLevel === "MEDIUM"
                ? t(lang, "Watch Closely", "需要关注")
                : t(lang, "Stable", "相对稳定")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 12 }}>
            {t(lang, "New overdue pending receipts (24h)", "24小时新增逾期待收据")}: {newlyOverdueIn24h}
          </span>
          <span style={{ fontSize: 12 }}>
            {t(lang, "Overdue pending receipts (today)", "今日逾期待收据")}: {overduePendingToday}
          </span>
          <span style={{ fontSize: 12 }}>
            {t(lang, "Due soon (next 3 days)", "未来3天到期待处理")}: {dueSoonPending}
          </span>
          <span style={{ fontSize: 12 }}>
            {t(lang, "Rejected open", "已驳回未处理")}: {rejectedOpen}
          </span>
        </div>
        {deltaWatchRows.length === 0 ? (
          <div style={{ color: "#92400e", fontSize: 12 }}>
            {t(lang, "No high-risk items in watch list.", "观察列表暂无高风险项。")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {deltaWatchRows.map((x) => (
              <div key={`delta-${x.channel}-${x.invoiceNo}`} style={{ fontSize: 12, color: "#92400e" }}>
                [{reminderPriority(x)}] [{x.channel}] {x.invoiceNo} · {x.partyName} · {statusLabel(lang, x.status)} · {t(lang, "Due", "到期")} {x.dueDate} · <a href={x.openHref}>{t(lang, "Open", "打开")}</a>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <form id="finance-workbench-filters" method="get" style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 8 }}>
        <input type="hidden" name="view" value={viewMode} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            {t(lang, "Month", "月份")}{" "}
            <input name="month" type="month" defaultValue={monthFilter} style={{ marginLeft: 4 }} />
          </label>
          <label>
            {t(lang, "Status", "状态")}{" "}
            <select name="status" defaultValue={statusFilter} style={{ marginLeft: 4 }}>
              <option value="">{t(lang, "All", "全部")}</option>
              <option value="PENDING_RECEIPT">{statusLabel(lang, "PENDING_RECEIPT")}</option>
              <option value="PARTIALLY_RECEIPTED">{statusLabel(lang, "PARTIALLY_RECEIPTED")}</option>
              <option value="PENDING_APPROVAL">{statusLabel(lang, "PENDING_APPROVAL")}</option>
              <option value="REJECTED">{statusLabel(lang, "REJECTED")}</option>
              <option value="COMPLETED">{statusLabel(lang, "COMPLETED")}</option>
            </select>
          </label>
          <label>
            {t(lang, "Search", "搜索")}{" "}
            <input
              name="q"
              defaultValue={q}
              placeholder={t(lang, "Search invoice, receipt, or party", "搜索发票号、收据号或对象")}
              style={{ marginLeft: 4 }}
            />
          </label>
          <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
        </div>
        <details open={advancedFiltersUsed}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: "#475569" }}>
            {t(lang, "Advanced Filters", "高级筛选")}
          </summary>
          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              {t(lang, "Channel", "渠道")}{" "}
              <select name="channel" defaultValue={channelFilter} style={{ marginLeft: 4 }}>
                <option value="">{t(lang, "All", "全部")}</option>
                <option value="PARENT">{t(lang, "Parent", "家长")}</option>
                <option value="PARTNER">{t(lang, "Partner", "合作方")}</option>
              </select>
            </label>
            <label>
              {t(lang, "Exceptions", "异常")}{" "}
              <select name="exceptionOnly" defaultValue={exceptionOnly} style={{ marginLeft: 4 }}>
                <option value="">{t(lang, "All", "全部")}</option>
                <option value="1">{t(lang, "Exception items only", "仅看异常项")}</option>
                <option value="0">{t(lang, "Normal items only", "仅看正常项")}</option>
              </select>
            </label>
            <label>
              {t(lang, "Exception Reason", "异常原因")}{" "}
              <select name="exceptionReason" defaultValue={exceptionReasonFilter} style={{ marginLeft: 4 }}>
                <option value="">{t(lang, "All", "全部")}</option>
                <option value="REJECTED_BY_APPROVER">{exceptionReasonLabel(lang, "REJECTED_BY_APPROVER")}</option>
                <option value="OVERDUE_PENDING_RECEIPT">{exceptionReasonLabel(lang, "OVERDUE_PENDING_RECEIPT")}</option>
                <option value="APPROVER_CONFIG_MISSING">{exceptionReasonLabel(lang, "APPROVER_CONFIG_MISSING")}</option>
              </select>
            </label>
            <label>
              {t(lang, "Reminder Tone", "提醒语气")}{" "}
              <select name="reminderTone" defaultValue={reminderTone} style={{ marginLeft: 4 }}>
                <option value="SOFT">{reminderToneLabel(lang, "SOFT")}</option>
                <option value="NORMAL">{reminderToneLabel(lang, "NORMAL")}</option>
                <option value="STRONG">{reminderToneLabel(lang, "STRONG")}</option>
              </select>
            </label>
            <label>
              {t(lang, "Reminder Target", "提醒对象")}{" "}
              <select name="reminderTarget" defaultValue={reminderTarget} style={{ marginLeft: 4 }}>
                <option value="ALL">{t(lang, "All non-completed", "全部未完成")}</option>
                <option value="PENDING_RECEIPT">{statusLabel(lang, "PENDING_RECEIPT")}</option>
                <option value="PARTIALLY_RECEIPTED">{statusLabel(lang, "PARTIALLY_RECEIPTED")}</option>
                <option value="PENDING_APPROVAL">{statusLabel(lang, "PENDING_APPROVAL")}</option>
                <option value="REJECTED">{statusLabel(lang, "REJECTED")}</option>
              </select>
            </label>
          </div>
        </details>
      </form>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Total", "总数")}</b>: {counts.total}
        </div>
        <div style={{ border: "1px solid #dbeafe", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Parent", "家长")}</b>: {channelCounts.parent}
        </div>
        <div style={{ border: "1px solid #e0e7ff", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Partner", "合作方")}</b>: {channelCounts.partner}
        </div>
        <div style={{ border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Pending Receipt", "待创建收据")}</b>: {counts.pendingReceipt}
        </div>
        <div style={{ border: "1px solid #fdba74", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Partially Receipted", "部分已开收据")}</b>: {counts.partiallyReceipted}
        </div>
        <div style={{ border: "1px solid #fdba74", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Pending Approval", "待审批")}</b>: {counts.pendingApproval}
        </div>
        <div style={{ border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Rejected", "已驳回")}</b>: {counts.rejected}
        </div>
        <div style={{ border: "1px solid #86efac", borderRadius: 8, padding: "8px 10px" }}>
          <b>{t(lang, "Completed", "已完成")}</b>: {counts.completed}
        </div>
      </div>

      {viewMode === "EXCEPTIONS" && (
      <div id="finance-workbench-exceptions" style={{ border: "1px solid #fecaca", borderRadius: 8, padding: 10, background: "#fef2f2" }}>
        <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
          {t(lang, "Exception Box", "异常箱")} ({exceptionRows.length})
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 12 }}>
            {exceptionReasonLabel(lang, "REJECTED_BY_APPROVER")}: {exceptionReasonCounts.REJECTED_BY_APPROVER}
          </span>
          <span style={{ fontSize: 12 }}>
            {exceptionReasonLabel(lang, "OVERDUE_PENDING_RECEIPT")}: {exceptionReasonCounts.OVERDUE_PENDING_RECEIPT}
          </span>
          <span style={{ fontSize: 12 }}>
            {exceptionReasonLabel(lang, "APPROVER_CONFIG_MISSING")}: {exceptionReasonCounts.APPROVER_CONFIG_MISSING}
          </span>
        </div>
        {exceptionRows.length === 0 ? (
          <div style={{ color: "#7f1d1d" }}>{t(lang, "No exceptions.", "暂无异常。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {exceptionRows.slice(0, 20).map((x) => (
              <div key={`${x.channel}-${x.invoiceNo}`} style={{ fontSize: 12 }}>
                [{x.channel}] {x.invoiceNo} · {x.exceptionReasons.map((r) => exceptionReasonLabel(lang, r)).join(" / ")} · {x.nextAction}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {viewMode === "REMINDERS" && (
      <div id="finance-workbench-reminders" style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, background: "#eff6ff" }}>
        <div style={{ fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>
          {t(lang, "Batch Reminder Preview (Read-only)", "批量催收模板预览（只读）")} ({reminderRows.length})
        </div>
        <div style={{ color: "#1e3a8a", fontSize: 12, marginBottom: 8 }}>
          {t(
            lang,
            "Template preview only. This page does not send any messages.",
            "这里只做模板预览，不会从此页发送任何消息。",
          )}
        </div>
        <div style={{ marginBottom: 8 }}>
          <a
            href={reminderCsvHref}
            download={`finance-reminder-tasks-${monthFilter || "all"}.csv`}
            style={{ fontSize: 12 }}
          >
            {t(lang, "Export reminder task list (CSV)", "导出催收任务清单（CSV）")}
          </a>
        </div>
        {reminderRowsTop.length === 0 ? (
          <div style={{ color: "#1e3a8a" }}>{t(lang, "No reminder candidates.", "暂无提醒对象。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {reminderRowsTop.map((x) => (
              <div key={`reminder-${x.channel}-${x.invoiceNo}`} style={{ borderTop: "1px dashed #93c5fd", paddingTop: 6 }}>
                <div style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>
                  [{reminderPriority(x)}] [{x.channel}] {x.partyName} · {x.invoiceNo} · {statusLabel(lang, x.status)}
                </div>
                <textarea
                  readOnly
                  value={reminderMessage(x)}
                  rows={3}
                  style={{ width: "100%", border: "1px solid #bfdbfe", borderRadius: 6, padding: 8, fontSize: 12 }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {tableRows.length === 0 ? (
        <div style={{ color: "#6b7280" }}>{tableEmptyText}</div>
      ) : (
        <div id="finance-workbench-table" style={{ overflowX: "auto" }}>
          <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 920 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th align="left">{t(lang, "Channel", "渠道")}</th>
                <th align="left">{t(lang, "Invoice No.", "发票号")}</th>
                <th align="left">{t(lang, "Party", "对象")}</th>
                <th align="left">{t(lang, "Amount", "金额")}</th>
                <th align="left">{t(lang, "Due Date", "到期日")}</th>
                <th align="left">{t(lang, "Status", "状态")}</th>
                <th align="left">{t(lang, "Next Action", "下一步")}</th>
                <th align="left">{t(lang, "Details", "详情")}</th>
                <th align="left">{t(lang, "Open", "打开")}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((x) => (
                <tr key={`${x.channel}-${x.invoiceNo}`} style={{ borderTop: "1px solid #eee" }}>
                  <td>{x.channel === "PARENT" ? t(lang, "Parent", "家长") : t(lang, "Partner", "合作方")}</td>
                  <td>{x.invoiceNo}</td>
                  <td>{x.partyName}</td>
                  <td>SGD {money(x.totalAmount)}</td>
                  <td>{x.dueDate}</td>
                  <td>
                    <span style={{ color: statusColor(x.status), fontWeight: 700 }}>
                      {statusLabel(lang, x.status)}
                    </span>
                  </td>
                  <td>{x.nextAction}</td>
                  <td>
                    <details>
                      <summary style={{ cursor: "pointer" }}>{t(lang, "Show reminder details", "展开提醒详情")}</summary>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#475569", display: "grid", gap: 4 }}>
                        <div>{t(lang, "Issue Date", "开票日")}: {x.issueDate}</div>
                        <div>{t(lang, "Receipt", "收据")}: {x.receiptNo ?? "-"}</div>
                        <div>
                          {t(lang, "Receipt progress", "收据进度")}: {x.receiptCount} {t(lang, "receipt(s)", "张收据")} · {t(lang, "receipted", "已开")} {money(x.receiptedAmount)} · {t(lang, "remaining", "剩余")} {money(x.remainingAmount)}
                        </div>
                        {x.nextReceiptNo ? (
                          <div>{t(lang, "Next receipt no.", "下一张收据号")}: {x.nextReceiptNo}</div>
                        ) : null}
                        <div>{t(lang, "Approval progress", "审批进度")}: {x.approvalText}</div>
                        <div>
                          {t(lang, "Exception Reasons", "异常原因")}:{" "}
                          {x.exceptionReasons.length
                            ? x.exceptionReasons.map((r) => exceptionReasonLabel(lang, r)).join(" / ")
                            : t(lang, "None", "无")}
                        </div>
                      </div>
                    </details>
                  </td>
                  <td>
                    <a href={x.openHref}>{t(lang, "Open", "打开")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
