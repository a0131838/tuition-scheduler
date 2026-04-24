import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { listAllParentBilling } from "@/lib/student-parent-billing";
import { listPartnerBilling } from "@/lib/partner-billing";
import { getParentReceiptApprovalMap } from "@/lib/parent-receipt-approval";
import { getPartnerReceiptApprovalMap } from "@/lib/partner-receipt-approval";
import { getApprovalRoleConfig } from "@/lib/approval-flow";
import { isReceiptFinanceApproved } from "@/lib/receipt-approval-policy";
import { normalizeDateOnly } from "@/lib/date-only";
import { workbenchFilterPanelStyle, workbenchHeroStyle } from "@/app/admin/_components/workbenchStyles";

type DocChannel = "PARENT" | "PARTNER";
type DocType = "INVOICE" | "RECEIPT";

type DocRow = {
  id: string;
  channel: DocChannel;
  type: DocType;
  docNo: string;
  issueDate: string;
  partyLabel: string;
  contextLabel: string;
  amountLabel: string;
  exportHref: string | null;
  openHref: string;
  exportReadyLabel: string;
};

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function includesQuery(parts: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const normalized = query.trim().toLowerCase();
  return parts.some((part) => String(part ?? "").toLowerCase().includes(normalized));
}

export default async function FinanceDocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    channel?: string;
    type?: string;
    q?: string;
    packageId?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const channelFilter = String(sp?.channel ?? "").trim().toUpperCase();
  const typeFilter = String(sp?.type ?? "").trim().toUpperCase();
  const q = String(sp?.q ?? "").trim();
  const packageIdFilter = String(sp?.packageId ?? "").trim();

  const [parentAll, partnerAll, roleCfg] = await Promise.all([
    listAllParentBilling(),
    listPartnerBilling(),
    getApprovalRoleConfig(),
  ]);

  const packageIds = Array.from(
    new Set(
      [...parentAll.invoices.map((x) => x.packageId), ...parentAll.receipts.map((x) => x.packageId)].filter(Boolean),
    ),
  );
  const packages = packageIds.length
    ? await prisma.coursePackage.findMany({
        where: { id: { in: packageIds } },
        include: { student: true, course: true },
      })
    : [];
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg] as const));

  const [parentApprovalMap, partnerApprovalMap] = await Promise.all([
    getParentReceiptApprovalMap(parentAll.receipts.map((x) => x.id)),
    getPartnerReceiptApprovalMap(partnerAll.receipts.map((x) => x.id)),
  ]);

  const rows: DocRow[] = [];

  for (const invoice of parentAll.invoices) {
    const pkg = packageMap.get(invoice.packageId);
    rows.push({
      id: invoice.id,
      channel: "PARENT",
      type: "INVOICE",
      docNo: invoice.invoiceNo,
      issueDate: invoice.issueDate,
      partyLabel: invoice.billTo || pkg?.student.name || "-",
      contextLabel: pkg ? `${pkg.student.name} · ${pkg.course.name}` : invoice.packageId,
      amountLabel: `SGD ${money(invoice.totalAmount)}`,
      exportHref: `/api/exports/parent-invoice/${encodeURIComponent(invoice.id)}`,
      openHref: `/admin/packages/${encodeURIComponent(invoice.packageId)}/billing#invoices`,
      exportReadyLabel: t(lang, "PDF ready", "PDF 可查看"),
    });
  }

  for (const receipt of parentAll.receipts) {
    const pkg = packageMap.get(receipt.packageId);
    const approval = parentApprovalMap.get(receipt.id);
    const exportReady = isReceiptFinanceApproved(approval, roleCfg);
    rows.push({
      id: receipt.id,
      channel: "PARENT",
      type: "RECEIPT",
      docNo: receipt.receiptNo,
      issueDate: receipt.receiptDate,
      partyLabel: receipt.receivedFrom || pkg?.student.name || "-",
      contextLabel: pkg ? `${pkg.student.name} · ${pkg.course.name}` : receipt.packageId,
      amountLabel: `SGD ${money(receipt.amountReceived)}`,
      exportHref: exportReady ? `/api/exports/parent-receipt/${encodeURIComponent(receipt.id)}` : null,
      openHref: `/admin/packages/${encodeURIComponent(receipt.packageId)}/billing#receipts`,
      exportReadyLabel: exportReady
        ? t(lang, "PDF ready", "PDF 可查看")
        : t(lang, "Waiting finance approval", "待财务审批"),
    });
  }

  for (const invoice of partnerAll.invoices) {
    rows.push({
      id: invoice.id,
      channel: "PARTNER",
      type: "INVOICE",
      docNo: invoice.invoiceNo,
      issueDate: invoice.issueDate,
      partyLabel: invoice.billTo || invoice.partnerName,
      contextLabel: `${invoice.partnerName} · ${invoice.mode}${invoice.monthKey ? ` · ${invoice.monthKey}` : ""}`,
      amountLabel: `SGD ${money(invoice.totalAmount)}`,
      exportHref: `/api/exports/partner-invoice/${encodeURIComponent(invoice.id)}`,
      openHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(invoice.mode)}${invoice.monthKey ? `&month=${encodeURIComponent(invoice.monthKey)}` : ""}&tab=invoices`,
      exportReadyLabel: t(lang, "PDF ready", "PDF 可查看"),
    });
  }

  for (const receipt of partnerAll.receipts) {
    const approval = partnerApprovalMap.get(receipt.id);
    const exportReady = isReceiptFinanceApproved(approval, roleCfg);
    rows.push({
      id: receipt.id,
      channel: "PARTNER",
      type: "RECEIPT",
      docNo: receipt.receiptNo,
      issueDate: receipt.receiptDate,
      partyLabel: receipt.receivedFrom || "-",
      contextLabel: `${receipt.mode}${receipt.monthKey ? ` · ${receipt.monthKey}` : ""}`,
      amountLabel: `SGD ${money(receipt.amountReceived)}`,
      exportHref: exportReady ? `/api/exports/partner-receipt/${encodeURIComponent(receipt.id)}` : null,
      openHref: `/admin/reports/partner-settlement/billing?mode=${encodeURIComponent(receipt.mode)}${receipt.monthKey ? `&month=${encodeURIComponent(receipt.monthKey)}` : ""}&tab=receipts`,
      exportReadyLabel: exportReady
        ? t(lang, "PDF ready", "PDF 可查看")
        : t(lang, "Waiting finance approval", "待财务审批"),
    });
  }

  const filteredRows = rows.filter((row) => {
    if (channelFilter && row.channel !== channelFilter) return false;
    if (typeFilter && row.type !== typeFilter) return false;
    if (packageIdFilter && row.channel === "PARENT") {
      const parentInvoice = row.type === "INVOICE" ? parentAll.invoices.find((x) => x.id === row.id) : null;
      const parentReceipt = row.type === "RECEIPT" ? parentAll.receipts.find((x) => x.id === row.id) : null;
      const rowPackageId = parentInvoice?.packageId ?? parentReceipt?.packageId ?? "";
      if (rowPackageId !== packageIdFilter) return false;
    }
    return includesQuery(
      [row.docNo, row.partyLabel, row.contextLabel, row.channel, row.type, row.issueDate],
      q,
    );
  });

  const countInvoices = filteredRows.filter((x) => x.type === "INVOICE").length;
  const countReceipts = filteredRows.filter((x) => x.type === "RECEIPT").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.4 }}>
            {t(lang, "Finance Documents", "财务单据中心")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Full Invoices & Receipts", "完整发票与收据")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Use this page to open the full PDF for parent and partner invoices or receipts without jumping through each package workspace.",
              "这个页面用来统一查看直客和合作方的完整发票、收据 PDF，不用再逐个进入课包或合作方工作台。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/finance/workbench">{t(lang, "Back to finance workbench", "返回财务工作台")}</a>
          <a href="/admin/finance/deleted-invoices">{t(lang, "Open deleted draft history", "打开已删除草稿历史")}</a>
        </div>
      </section>

      <form style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Document filters", "单据筛选")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(lang, "Narrow by channel, type, package, or keyword before opening PDFs.", "先按渠道、类型、课包或关键词缩小范围，再打开 PDF。")}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Channel", "渠道")}</span>
            <select name="channel" defaultValue={channelFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <option value="">{t(lang, "All", "全部")}</option>
              <option value="PARENT">{t(lang, "Parent", "直客")}</option>
              <option value="PARTNER">{t(lang, "Partner", "合作方")}</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Type", "类型")}</span>
            <select name="type" defaultValue={typeFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <option value="">{t(lang, "All", "全部")}</option>
              <option value="INVOICE">{t(lang, "Invoice", "发票")}</option>
              <option value="RECEIPT">{t(lang, "Receipt", "收据")}</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Package ID (optional)", "课包 ID（可选）")}</span>
            <input name="packageId" defaultValue={packageIdFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Keyword", "关键词")}</span>
            <input name="q" defaultValue={q} placeholder={t(lang, "Invoice no., student, bill to...", "发票号、学生名、开票对象...")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit">{t(lang, "Apply filters", "应用筛选")}</button>
          <a href="/admin/finance/documents">{t(lang, "Reset", "重置")}</a>
        </div>
      </form>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #dbe4f0", borderRadius: 14, padding: 14, background: "#f8fafc" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{t(lang, "Visible rows", "当前可见")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{filteredRows.length}</div>
        </div>
        <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, padding: 14, background: "#eff6ff" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{t(lang, "Invoices", "发票")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{countInvoices}</div>
        </div>
        <div style={{ border: "1px solid #bbf7d0", borderRadius: 14, padding: 14, background: "#f0fdf4" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{t(lang, "Receipts", "收据")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{countReceipts}</div>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 800 }}>{t(lang, "Full document list", "完整单据列表")}</div>
        {filteredRows.length === 0 ? (
          <div style={{ padding: "0 14px 14px", color: "#475569" }}>{t(lang, "No documents matched this filter.", "当前筛选下没有单据。")}</div>
        ) : (
          <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                <th align="left">{t(lang, "Channel", "渠道")}</th>
                <th align="left">{t(lang, "Type", "类型")}</th>
                <th align="left">{t(lang, "No.", "编号")}</th>
                <th align="left">{t(lang, "Date", "日期")}</th>
                <th align="left">{t(lang, "Party", "对象")}</th>
                <th align="left">{t(lang, "Context", "上下文")}</th>
                <th align="left">{t(lang, "Amount", "金额")}</th>
                <th align="left">{t(lang, "PDF", "PDF")}</th>
                <th align="left">{t(lang, "Workspace", "工作台")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`${row.type}-${row.id}`} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td>{row.channel === "PARENT" ? t(lang, "Parent", "直客") : t(lang, "Partner", "合作方")}</td>
                  <td>{row.type === "INVOICE" ? t(lang, "Invoice", "发票") : t(lang, "Receipt", "收据")}</td>
                  <td style={{ fontWeight: 700 }}>{row.docNo}</td>
                  <td>{normalizeDateOnly(row.issueDate) ?? "-"}</td>
                  <td>{row.partyLabel}</td>
                  <td>{row.contextLabel}</td>
                  <td>{row.amountLabel}</td>
                  <td>
                    {row.exportHref ? (
                      <a href={row.exportHref} target="_blank" rel="noreferrer">
                        {row.exportReadyLabel}
                      </a>
                    ) : (
                      <span style={{ color: "#b45309" }}>{row.exportReadyLabel}</span>
                    )}
                  </td>
                  <td>
                    <a href={row.openHref}>{t(lang, "Open source page", "打开来源页面")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
