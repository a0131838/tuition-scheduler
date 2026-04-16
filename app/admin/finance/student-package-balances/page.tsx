import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  listStudentPackageMonthEndBalances,
  minutesToHours,
  monthEndDateOnlyFromMonth,
  parseMonthInput,
} from "@/lib/student-package-month-end-balance";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../_components/workbenchStyles";

function balanceReportSectionLinkStyle(background: string, border: string) {
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

function money(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatAmountBasisSource(source: string, lang: Awaited<ReturnType<typeof getLang>>) {
  if (source === "PURCHASE_TXNS") {
    return t(lang, "Purchase ledger amounts", "购买流水金额");
  }
  if (source === "RECEIPTS") {
    return t(lang, "Receipt totals", "收据金额");
  }
  if (source === "PACKAGE_PAID_AMOUNT") {
    return t(lang, "Package paid amount", "课包付款金额");
  }
  return t(lang, "No amount basis", "无金额基数");
}

function amountBasisBadgeStyle(source: string) {
  if (source === "PURCHASE_TXNS") {
    return {
      border: "1px solid #bfdbfe",
      background: "#dbeafe",
      color: "#1d4ed8",
    };
  }
  if (source === "RECEIPTS") {
    return {
      border: "1px solid #bbf7d0",
      background: "#dcfce7",
      color: "#15803d",
    };
  }
  if (source === "PACKAGE_PAID_AMOUNT") {
    return {
      border: "1px solid #fde68a",
      background: "#fef3c7",
      color: "#b45309",
    };
  }
  return {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#475569",
  };
}

export default async function FinanceStudentPackageBalancesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
  }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const month = parseMonthInput(String(sp?.month ?? "").trim())
    ? String(sp?.month ?? "").trim()
    : currentMonthKey();
  const monthEnd = monthEndDateOnlyFromMonth(month) ?? "";
  const exportHref = `/api/exports/student-package-month-end-balance?month=${encodeURIComponent(month)}`;
  const rows = await listStudentPackageMonthEndBalances(month);
  const previewRows = rows.slice(0, 20);
  const summary = rows.reduce(
    (acc, row) => {
      acc.packageCount += 1;
      acc.remainingHours += minutesToHours(row.remainingMinutes);
      acc.remainingAmount += row.remainingAmount;
      return acc;
    },
    { packageCount: 0, remainingHours: 0, remainingAmount: 0 },
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>{t(lang, "Month-end balance report", "月末余额报表")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Student Package Balance Report", "学生课时包余额报表")}</h2>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(
              lang,
              "Use this page only for month-end package balance reporting. It does not issue invoices or change any package, billing, or approval logic.",
              "此页面仅用于月末课时包余额报表，不会开票，也不会改动课包、账单或审批逻辑。",
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
            <a href="/admin/finance/workbench">{t(lang, "Back to finance workbench", "返回财务工作台")}</a>
            <a href="/admin/finance/student-package-invoices">{t(lang, "Open student package invoices", "打开学生课时包发票")}</a>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Packages", "课包数")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{summary.packageCount}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("indigo"), background: "#eef2ff" }}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Remaining hours", "剩余总课时")}</div>
            <div style={{ ...workbenchMetricValueStyle("indigo"), fontSize: 18 }}>{summary.remainingHours.toFixed(2)}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Remaining amount", "估算剩余金额")}</div>
            <div style={{ ...workbenchMetricValueStyle("emerald"), fontSize: 18 }}>SGD {money(summary.remainingAmount)}</div>
          </div>
          <div style={workbenchMetricCardStyle("slate")}>
            <div style={workbenchMetricLabelStyle("slate")}>{t(lang, "Report month", "报表月份")}</div>
            <div style={{ ...workbenchMetricValueStyle("slate"), fontSize: 18 }}>{month}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 0,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>{t(lang, "Balance report map", "余额报表地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Load the report month first, then review the summary and basis labels, and finally scan the preview table or export the full CSV.", "建议先切报表月份，再看摘要和金额基数标签，最后浏览预览表或导出完整 CSV。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#balance-report-controls" style={balanceReportSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Report controls", "报表控制")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Change month and export CSV", "切月份并导出 CSV")}</span>
          </a>
          <a href="#balance-report-preview" style={balanceReportSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Preview table", "预览表")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Scan the first rows before exporting", "导出前先看前几行")}</span>
          </a>
        </div>
      </section>

      <div id="balance-report-controls" style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, background: "#f8fafc", display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>
          {t(lang, "Month-end balance report", "月末余额报表")}
        </div>
        <div style={{ color: "#475569", fontSize: 12 }}>
          {t(
            lang,
            "Export remaining course balance in hours and estimated amount as of the selected month end. This report covers HOURS packages only.",
            "导出所选月末的剩余课时和估算剩余金额。此报表目前仅覆盖按分钟课包。",
          )}
        </div>
        <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <label>
            {t(lang, "Report month", "报表月份")}
            <input name="month" type="month" defaultValue={month} style={{ display: "block" }} />
          </label>
          <button type="submit">{t(lang, "Load month-end report", "加载月末报表")}</button>
          <a href={exportHref}>{t(lang, "Export CSV", "导出 CSV")}</a>
        </form>
        <div style={{ color: "#475569", fontSize: 12 }}>
          {t(
            lang,
            `Month-end cutoff: ${monthEnd}. Remaining amount prefers purchase-ledger basis when complete, otherwise falls back to receipts or package paid amount.`,
            `月末截止日：${monthEnd}。剩余金额会优先使用完整的购买流水金额；如果不完整，则回退到收据金额或课包付款金额。`,
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
            <b>{t(lang, "Packages in report", "报表课包数")}</b>: {summary.packageCount}
          </div>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
            <b>{t(lang, "Total remaining hours", "剩余总课时")}</b>: {summary.remainingHours.toFixed(2)}
          </div>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
            <b>{t(lang, "Estimated remaining amount", "估算剩余金额")}</b>: SGD {money(summary.remainingAmount)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["PURCHASE_TXNS", "RECEIPTS", "PACKAGE_PAID_AMOUNT", "NONE"].map((source) => (
            <div
              key={source}
              style={{
                ...amountBasisBadgeStyle(source),
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {formatAmountBasisSource(source, lang)}
            </div>
          ))}
        </div>
        {rows.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(
              lang,
              "No hour-based packages were active by the selected month end.",
              "所选月末之前没有可纳入报表的按分钟课包。",
            )}
          </div>
        ) : (
          <div id="balance-report-preview" style={{ border: "1px solid #dbeafe", borderRadius: 8, background: "#fff", overflowX: "auto" }}>
            <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", minWidth: 920 }}>
              <thead>
                <tr style={{ background: "#eff6ff" }}>
                  <th align="left">{t(lang, "Student", "学生")}</th>
                  <th align="left">{t(lang, "Course", "课程")}</th>
                  <th align="left">{t(lang, "Package", "课包")}</th>
                  <th align="left">{t(lang, "Purchased Hours", "累计购入课时")}</th>
                  <th align="left">{t(lang, "Used Hours", "累计已用课时")}</th>
                  <th align="left">{t(lang, "Remaining Hours", "剩余课时")}</th>
                  <th align="left">{t(lang, "Amount Basis", "金额基数")}</th>
                  <th align="left">{t(lang, "Basis Source", "基数来源")}</th>
                  <th align="left">{t(lang, "Estimated Remaining Amount", "估算剩余金额")}</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.packageId} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td>{row.studentName}</td>
                    <td>{row.courseName}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{row.packageId.slice(0, 8)}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{row.packageStatus}</div>
                    </td>
                    <td>{minutesToHours(row.totalPurchasedMinutes).toFixed(2)}</td>
                    <td>{minutesToHours(row.usedMinutes).toFixed(2)}</td>
                    <td>{minutesToHours(row.remainingMinutes).toFixed(2)}</td>
                    <td>SGD {money(row.paidAmountBasis)}</td>
                    <td>
                      <span
                        style={{
                          ...amountBasisBadgeStyle(row.paidAmountBasisSource),
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatAmountBasisSource(row.paidAmountBasisSource, lang)}
                      </span>
                    </td>
                    <td>SGD {money(row.remainingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > previewRows.length ? (
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {t(
              lang,
              `Showing ${previewRows.length} of ${rows.length} rows on page. Use Export CSV for the full month-end report.`,
              `页面内先显示 ${previewRows.length} / ${rows.length} 行；完整月末报表请导出 CSV。`,
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
