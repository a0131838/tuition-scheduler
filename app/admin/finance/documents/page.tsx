import { requireAdmin } from "@/lib/auth";
import {
  filterFinanceDocumentRows,
  listFinanceDocumentRows,
  normalizeFinanceDocumentChannel,
  normalizeFinanceDocumentPaymentStatus,
  normalizeFinanceDocumentType,
  type FinanceDocumentPaymentStatus,
} from "@/lib/finance-documents";
import { getLang, t, type Lang } from "@/lib/i18n";
import { normalizeDateOnly } from "@/lib/date-only";
import { workbenchFilterPanelStyle, workbenchHeroStyle } from "@/app/admin/_components/workbenchStyles";

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function paymentStatusLabel(lang: Lang, status: FinanceDocumentPaymentStatus) {
  if (status === "PAID") return t(lang, "Paid", "已收款");
  if (status === "PARTIAL") return t(lang, "Partial", "部分收款");
  if (status === "PENDING_APPROVAL") return t(lang, "Pending approval", "收据待审批");
  if (status === "REJECTED") return t(lang, "Rejected", "已驳回");
  return t(lang, "Unpaid", "未收款");
}

function paymentStatusStyle(status: FinanceDocumentPaymentStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
  if (status === "PAID") return { ...base, background: "#dcfce7", color: "#166534" };
  if (status === "PARTIAL") return { ...base, background: "#fef3c7", color: "#92400e" };
  if (status === "PENDING_APPROVAL") return { ...base, background: "#e0f2fe", color: "#075985" };
  if (status === "REJECTED") return { ...base, background: "#fee2e2", color: "#991b1b" };
  return { ...base, background: "#f1f5f9", color: "#334155" };
}

function buildDocumentQuery(input: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export default async function FinanceDocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    channel?: string;
    type?: string;
    q?: string;
    packageId?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const channelFilter = normalizeFinanceDocumentChannel(sp?.channel);
  const typeFilter = normalizeFinanceDocumentType(sp?.type);
  const paymentStatusFilter = normalizeFinanceDocumentPaymentStatus(sp?.paymentStatus);
  const q = String(sp?.q ?? "").trim();
  const packageIdFilter = String(sp?.packageId ?? "").trim();
  const dateFromFilter = normalizeDateOnly(String(sp?.dateFrom ?? "").trim()) ?? "";
  const dateToFilter = normalizeDateOnly(String(sp?.dateTo ?? "").trim()) ?? "";
  const rows = await listFinanceDocumentRows();
  const filteredRows = filterFinanceDocumentRows(rows, {
    channel: channelFilter,
    type: typeFilter,
    paymentStatus: paymentStatusFilter,
    q,
    packageId: packageIdFilter,
    dateFrom: dateFromFilter,
    dateTo: dateToFilter,
  });
  const exportQuery = buildDocumentQuery({
    channel: channelFilter,
    type: typeFilter,
    paymentStatus: paymentStatusFilter,
    packageId: packageIdFilter,
    q,
    dateFrom: dateFromFilter,
    dateTo: dateToFilter,
  });
  const exportHref = `/api/exports/finance-documents${exportQuery ? `?${exportQuery}` : ""}`;

  const countInvoices = filteredRows.filter((x) => x.type === "INVOICE").length;
  const countReceipts = filteredRows.filter((x) => x.type === "RECEIPT").length;
  const countUnpaid = filteredRows.filter((x) => x.paymentStatus === "UNPAID").length;
  const countPartial = filteredRows.filter((x) => x.paymentStatus === "PARTIAL").length;
  const countPending = filteredRows.filter((x) => x.paymentStatus === "PENDING_APPROVAL").length;

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
          <a href={exportHref}>{t(lang, "Export report", "导出报表")}</a>
        </div>
      </section>

      <form style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Document filters", "单据筛选")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(lang, "Narrow by channel, type, payment status, period, package, or keyword before opening PDFs or exporting the report.", "先按渠道、类型、收款状态、期间、课包或关键词缩小范围，再打开 PDF 或导出报表。")}
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
            <span>{t(lang, "Payment status", "收款状态")}</span>
            <select name="paymentStatus" defaultValue={paymentStatusFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}>
              <option value="">{t(lang, "All", "全部")}</option>
              <option value="PAID">{t(lang, "Paid", "已收款")}</option>
              <option value="PARTIAL">{t(lang, "Partial", "部分收款")}</option>
              <option value="UNPAID">{t(lang, "Unpaid", "未收款")}</option>
              <option value="PENDING_APPROVAL">{t(lang, "Pending approval", "收据待审批")}</option>
              <option value="REJECTED">{t(lang, "Rejected", "已驳回")}</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Date from", "开始日期")}</span>
            <input type="date" name="dateFrom" defaultValue={dateFromFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Date to", "结束日期")}</span>
            <input type="date" name="dateTo" defaultValue={dateToFilter} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Keyword", "关键词")}</span>
            <input name="q" defaultValue={q} placeholder={t(lang, "Invoice no., student, bill to...", "发票号、学生名、开票对象...")} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit">{t(lang, "Apply filters", "应用筛选")}</button>
          <a href="/admin/finance/documents">{t(lang, "Reset", "重置")}</a>
          <a href={exportHref}>{t(lang, "Export filtered report", "导出当前筛选报表")}</a>
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
        <div style={{ border: "1px solid #fed7aa", borderRadius: 14, padding: 14, background: "#fff7ed" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{t(lang, "Unpaid / partial / pending", "未收 / 部分 / 待审")}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{countUnpaid} / {countPartial} / {countPending}</div>
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px", fontWeight: 800 }}>{t(lang, "Full document list", "完整单据列表")}</div>
        {filteredRows.length === 0 ? (
          <div style={{ padding: "0 14px 14px", color: "#475569" }}>{t(lang, "No documents matched this filter.", "当前筛选下没有单据。")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse", minWidth: 1240 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                <th align="left">{t(lang, "Channel", "渠道")}</th>
                <th align="left">{t(lang, "Type", "类型")}</th>
                <th align="left">{t(lang, "No.", "编号")}</th>
                <th align="left">{t(lang, "Date", "日期")}</th>
                <th align="left">{t(lang, "Party", "对象")}</th>
                <th align="left">{t(lang, "Context", "上下文")}</th>
                <th align="left">{t(lang, "Source", "来源")}</th>
                <th align="left">{t(lang, "Amount", "金额")}</th>
                <th align="left">{t(lang, "Received", "已收")}</th>
                <th align="left">{t(lang, "Remaining", "未收余额")}</th>
                <th align="left">{t(lang, "Payment status", "收款状态")}</th>
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
                  <td>
                    <div style={{ display: "grid", gap: 3, fontSize: 12 }}>
                      <span style={{ fontWeight: 800, color: row.contractLinkLabel === "No linked contract" ? "#92400e" : "#166534" }}>
                        {row.contractLinkLabel ?? "-"}
                      </span>
                      <span style={{ color: "#475569" }}>{row.sourceLabel ?? "-"}</span>
                    </div>
                  </td>
                  <td>SGD {money(row.amount)}</td>
                  <td>SGD {money(row.receiptedAmount)}</td>
                  <td>SGD {money(row.remainingAmount)}</td>
                  <td><span style={paymentStatusStyle(row.paymentStatus)}>{paymentStatusLabel(lang, row.paymentStatus)}</span></td>
                  <td>
                    {row.exportHref ? (
                      <a href={row.exportHref} target="_blank" rel="noreferrer">
                        {t(lang, "PDF ready", "PDF 可查看")}
                      </a>
                    ) : (
                      <span style={{ color: "#b45309" }}>{t(lang, "Waiting finance approval", "待财务审批")}</span>
                    )}
                  </td>
                  <td>
                    <a href={row.openHref}>{t(lang, "Open source page", "打开来源页面")}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
