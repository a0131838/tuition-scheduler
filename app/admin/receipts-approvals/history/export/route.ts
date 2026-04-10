import { requireAdmin } from "@/lib/auth";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { getLang, type Lang } from "@/lib/i18n";
import { formatDateOnly, formatBusinessDateTime, monthKeyFromDateOnly, normalizeDateOnly } from "@/lib/date-only";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import { listAllParentBilling } from "@/lib/student-parent-billing";
import { listPartnerBilling } from "@/lib/partner-billing";
import { prisma } from "@/lib/prisma";

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function normalizeView(value: string) {
  if (value === "PARENT" || value === "PARTNER") return value;
  return "ALL";
}

function normalizeHistoryFocus(value: string) {
  if (value === "RECEIPTS" || value === "ACTIONS") return value;
  return "ALL";
}

function normalizeHistoryActionKind(value: string) {
  if (value === "PAYMENT_UPLOAD" || value === "INVOICE_CREATE" || value === "RECEIPT_CREATE") return value;
  return "ALL";
}

function matchesSearchTerm(term: string, values: Array<string | null | undefined>) {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalizedTerm));
}

function statusLabel(
  managerApprovedBy: string[],
  financeApprovedBy: string[],
  managerNeeded: string[],
  financeNeeded: string[],
  managerRejectReason: string | null,
  financeRejectReason: string | null
) {
  const managerReady = areAllApproversConfirmed(managerApprovedBy, managerNeeded);
  const financeReady = areAllApproversConfirmed(financeApprovedBy, financeNeeded);
  if (managerReady && financeReady) return "COMPLETED";
  if (managerRejectReason || financeRejectReason) return "REJECTED";
  return "PENDING";
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const lang = await getLang();
  const month = String(url.searchParams.get("month") ?? "").trim();
  const view = normalizeView(String(url.searchParams.get("view") ?? "").trim().toUpperCase());
  const historyFocus = normalizeHistoryFocus(String(url.searchParams.get("historyFocus") ?? "").trim().toUpperCase());
  const historyActionKind = normalizeHistoryActionKind(String(url.searchParams.get("historyActionKind") ?? "").trim().toUpperCase());
  const historySearch = String(url.searchParams.get("historySearch") ?? "").trim();

  const [parentAll, partnerAll, roleCfg] = await Promise.all([
    listAllParentBilling(),
    listPartnerBilling(),
    getApprovalRoleConfig(),
  ]);

  const parentPackageIds = Array.from(new Set(parentAll.receipts.map((x) => x.packageId)));
  const parentPackages = parentPackageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: parentPackageIds } },
        include: { student: true, course: true },
      })
    : [];
  const parentPackageMap = new Map(parentPackages.map((x) => [x.id, x]));
  const parentInvoiceMap = new Map(parentAll.invoices.map((x) => [x.id, x]));

  const parentReceiptIds = parentAll.receipts.map((x) => x.id);
  const partnerReceiptIds = partnerAll.receipts.map((x) => x.id);
  const [parentApprovalMap, partnerApprovalMap] = await Promise.all([
    getParentReceiptApprovalMap(parentReceiptIds),
    getPartnerReceiptApprovalMap(partnerReceiptIds),
  ]);

  const receiptHeader = [
    choose(lang, "Row Type", "行类型"),
    choose(lang, "View", "对象"),
    choose(lang, "Receipt No.", "收据号"),
    choose(lang, "Invoice No.", "发票号"),
    choose(lang, "Party", "对象名称"),
    choose(lang, "Course / Mode", "课程 / 模式"),
    choose(lang, "Receipt Date", "收据日期"),
    choose(lang, "Amount Received", "实收金额"),
    choose(lang, "Status", "状态"),
    choose(lang, "Risk State", "风险状态"),
    choose(lang, "Created By", "创建人"),
    choose(lang, "Created At", "创建时间"),
  ];
  const actionHeader = [
    choose(lang, "Row Type", "行类型"),
    choose(lang, "View", "对象"),
    choose(lang, "Action Type", "动作类型"),
    choose(lang, "Title", "标题"),
    choose(lang, "Party", "对象名称"),
    choose(lang, "Course / Mode", "课程 / 模式"),
    choose(lang, "Actor", "操作人"),
    choose(lang, "At", "操作时间"),
  ];

  const receiptLines = [receiptHeader.join(",")];
  const actionLines = [actionHeader.join(",")];

  if (historyFocus !== "ACTIONS") {
    const parentRows = parentAll.receipts
      .filter((row) => !month || monthKeyFromDateOnly(row.receiptDate) === month)
      .filter((row) => view !== "PARTNER")
      .map((row) => {
        const pkg = parentPackageMap.get(row.packageId);
        const inv = row.invoiceId ? parentInvoiceMap.get(row.invoiceId) : null;
        const approval = parentApprovalMap.get(row.id) ?? {
          managerApprovedBy: [],
          financeApprovedBy: [],
          managerRejectReason: null,
          financeRejectReason: null,
        };
        const status = statusLabel(
          approval.managerApprovedBy,
          approval.financeApprovedBy,
          roleCfg.managerApproverEmails,
          roleCfg.financeApproverEmails,
          approval.managerRejectReason,
          approval.financeRejectReason
        );
        return {
          view: "PARENT",
          receiptNo: row.receiptNo,
          invoiceNo: inv?.invoiceNo ?? "",
          party: pkg?.student?.name ?? "",
          courseOrMode: pkg?.course?.name ?? "",
          receiptDate: normalizeDateOnly(row.receiptDate) ?? "",
          amountReceived: row.amountReceived,
          status,
          riskState: row.paymentRecordId ? "LINKED" : "NO_PAYMENT_RECORD",
          createdBy: row.createdBy,
          createdAt: formatBusinessDateTime(new Date(row.createdAt)),
        };
      })
      .filter((row) =>
        matchesSearchTerm(historySearch, [
          row.receiptNo,
          row.invoiceNo,
          row.party,
          row.courseOrMode,
          row.createdBy,
        ])
      )
      .filter((row) => row.status === "COMPLETED");

    const partnerInvoiceMap = new Map(partnerAll.invoices.map((x) => [x.id, x]));
    const partnerRows = partnerAll.receipts
      .filter((row) => !month || monthKeyFromDateOnly(row.receiptDate) === month)
      .filter((row) => view !== "PARENT")
      .map((row) => {
        const inv = partnerInvoiceMap.get(row.invoiceId);
        const approval = partnerApprovalMap.get(row.id) ?? {
          managerApprovedBy: [],
          financeApprovedBy: [],
          managerRejectReason: null,
          financeRejectReason: null,
        };
        const status = statusLabel(
          approval.managerApprovedBy,
          approval.financeApprovedBy,
          roleCfg.managerApproverEmails,
          roleCfg.financeApproverEmails,
          approval.managerRejectReason,
          approval.financeRejectReason
        );
        return {
          view: "PARTNER",
          receiptNo: row.receiptNo,
          invoiceNo: inv?.invoiceNo ?? "",
          party: inv?.billTo || inv?.partnerName || "Partner",
          courseOrMode: row.mode,
          receiptDate: normalizeDateOnly(row.receiptDate) ?? "",
          amountReceived: row.amountReceived,
          status,
          riskState: row.paymentRecordId ? "LINKED" : "NO_PAYMENT_RECORD",
          createdBy: row.createdBy,
          createdAt: formatBusinessDateTime(new Date(row.createdAt)),
        };
      })
      .filter((row) =>
        matchesSearchTerm(historySearch, [
          row.receiptNo,
          row.invoiceNo,
          row.party,
          row.courseOrMode,
          row.createdBy,
        ])
      )
      .filter((row) => row.status === "COMPLETED");

    for (const row of [...parentRows, ...partnerRows]) {
      receiptLines.push(
        [
          row.view === "PARENT" ? "RECEIPT" : "PARTNER_RECEIPT",
          row.view,
          row.receiptNo,
          row.invoiceNo,
          row.party,
          row.courseOrMode,
          row.receiptDate,
          row.amountReceived,
          row.status,
          row.riskState,
          row.createdBy,
          row.createdAt,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  if (historyFocus !== "RECEIPTS") {
    const opPackageIds = Array.from(
      new Set(
        [...parentAll.invoices.map((x) => x.packageId), ...parentAll.paymentRecords.map((x) => x.packageId), ...parentAll.receipts.map((x) => x.packageId)]
          .map((x) => String(x || "").trim())
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
    const actionRows = [
      ...parentAll.paymentRecords.map((x) => ({
        view: "PARENT",
        kind: "PAYMENT_UPLOAD",
        title: x.originalFileName,
        party: opPackageMap.get(x.packageId)?.student?.name ?? "",
        courseOrMode: opPackageMap.get(x.packageId)?.course?.name ?? "",
        actor: x.uploadedBy,
        at: x.uploadedAt,
      })),
      ...parentAll.invoices.map((x) => ({
        view: "PARENT",
        kind: "INVOICE_CREATE",
        title: x.invoiceNo,
        party: opPackageMap.get(x.packageId)?.student?.name ?? "",
        courseOrMode: opPackageMap.get(x.packageId)?.course?.name ?? "",
        actor: x.createdBy,
        at: x.createdAt,
      })),
      ...parentAll.receipts.map((x) => ({
        view: "PARENT",
        kind: "RECEIPT_CREATE",
        title: x.receiptNo,
        party: opPackageMap.get(x.packageId)?.student?.name ?? "",
        courseOrMode: opPackageMap.get(x.packageId)?.course?.name ?? "",
        actor: x.createdBy,
        at: x.createdAt,
      })),
      ...partnerAll.paymentRecords.map((x) => ({
        view: "PARTNER",
        kind: "PAYMENT_UPLOAD",
        title: x.originalFileName,
        party: "Partner",
        courseOrMode: x.mode,
        actor: x.uploadedBy,
        at: x.uploadedAt,
      })),
      ...partnerAll.invoices.map((x) => ({
        view: "PARTNER",
        kind: "INVOICE_CREATE",
        title: x.invoiceNo,
        party: x.billTo || x.partnerName || "Partner",
        courseOrMode: x.mode,
        actor: x.createdBy,
        at: x.createdAt,
      })),
      ...partnerAll.receipts.map((x) => ({
        view: "PARTNER",
        kind: "RECEIPT_CREATE",
        title: x.receiptNo,
        party: partnerAll.invoices.find((inv) => inv.id === x.invoiceId)?.billTo || "Partner",
        courseOrMode: x.mode,
        actor: x.createdBy,
        at: x.createdAt,
      })),
    ]
      .filter((row) => view === "ALL" || row.view === view)
      .filter((row) => historyActionKind === "ALL" || row.kind === historyActionKind)
      .filter((row) => !month || monthKeyFromDateOnly(formatDateOnly(new Date(row.at))) === month)
      .filter((row) =>
        matchesSearchTerm(historySearch, [row.title, row.party, row.courseOrMode, row.actor])
      )
      .sort((a, b) => +new Date(b.at) - +new Date(a.at));

    for (const row of actionRows) {
      actionLines.push(
        [
          row.view === "PARENT" ? "ACTION" : "PARTNER_ACTION",
          row.view,
          row.kind,
          row.title,
          row.party,
          row.courseOrMode,
          row.actor,
          formatBusinessDateTime(new Date(row.at)),
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  const sections: string[] = [];
  if (receiptLines.length > 1) sections.push("\uFEFF" + receiptLines.join("\n"));
  else if (historyFocus !== "ACTIONS") sections.push("\uFEFF" + receiptLines.join("\n"));
  if (actionLines.length > 1) sections.push(actionLines.join("\n"));
  else if (historyFocus !== "RECEIPTS") sections.push(actionLines.join("\n"));
  const csv = sections.join("\n\n");
  const fileName = `receipt-history-${view.toLowerCase()}-${month || "all"}-${historyFocus.toLowerCase()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
