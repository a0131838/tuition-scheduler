import { requireAdmin } from "@/lib/auth";
import { formatCurrencyTotals, loadTutorCostCutoffReport, monthKey, parseMonth } from "@/lib/teacher-payroll";
import { getLang, t } from "@/lib/i18n";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";

function previousMonthKey(value: Date) {
  const year = value.getMonth() === 0 ? value.getFullYear() - 1 : value.getFullYear();
  const month = value.getMonth() === 0 ? 12 : value.getMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
}

function defaultCutoffMonth() {
  const now = new Date();
  const businessNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return businessNow.getUTCDate() < 15 ? previousMonthKey(businessNow) : monthKey(businessNow);
}

function moneyCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export default async function TutorCostExportPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const monthRaw = String(sp?.month ?? "").trim();
  const month = parseMonth(monthRaw) ? monthRaw : defaultCutoffMonth();
  const report = await loadTutorCostCutoffReport(month);
  const exportHref = `/api/exports/tutor-cost-cutoff?month=${encodeURIComponent(month)}`;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.4 }}>
            {t(lang, "Tutor Cost Export", "老师成本导出")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Tutor Cost Cut-off Export", "老师成本截点导出")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Finance can download tutor cost from the 15th to month-end. The export includes completed and confirmed sessions only.",
              "财务可下载每月 15 号到月底的老师成本。导出只包含已完成且已确认的课次。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/finance/workbench">{t(lang, "Back to finance workbench", "返回财务工作台")}</a>
          <a href="/admin/reports/teacher-payroll">{t(lang, "Open teacher payroll", "打开老师工资")}</a>
          <a href={exportHref}>{t(lang, "Download Excel", "下载 Excel")}</a>
        </div>
      </section>

      <form style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Export controls", "导出设置")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              "Select a month. The period is automatically set to the 15th through the last day of that month, inclusive of the 15th.",
              "选择月份后，系统自动取当月 15 号到月底，包含 15 号当天。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Month", "月份")}</span>
            <input
              type="month"
              name="month"
              defaultValue={month}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </label>
          <button type="submit">{t(lang, "Preview", "预览")}</button>
          <a href={exportHref}>{t(lang, "Download Excel", "下载 Excel")}</a>
        </div>
      </form>

      {report ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ ...workbenchMetricCardStyle("blue"), background: "#f8fbff" }}>
              <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Period", "期间")}</div>
              <div style={{ ...workbenchMetricValueStyle("blue"), fontSize: 18 }}>{report.periodLabel}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fffbeb" }}>
              <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Completed sessions", "已完成课次")}</div>
              <div style={workbenchMetricValueStyle("amber")}>{report.totalSessions}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
              <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Hours", "课时")}</div>
              <div style={workbenchMetricValueStyle("emerald")}>{report.totalHours.toFixed(2)}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fff7f7" }}>
              <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Tutor cost", "老师成本")}</div>
              <div style={{ ...workbenchMetricValueStyle("rose"), fontSize: 20 }}>
                {formatCurrencyTotals(report.grandCurrencyTotals)}
              </div>
            </div>
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", fontWeight: 800 }}>
              {t(lang, "Summary by teacher", "按老师汇总")}
            </div>
            {report.summaryRows.length === 0 ? (
              <div style={{ padding: "0 14px 14px", color: "#475569" }}>
                {t(lang, "No completed and confirmed sessions found for this cut-off period.", "该截点期间没有已完成且已确认的课次。")}
              </div>
            ) : (
              <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                    <th align="left">{t(lang, "Teacher", "老师")}</th>
                    <th align="right">{t(lang, "Sessions", "课次")}</th>
                    <th align="right">{t(lang, "Included in salary", "已含月薪")}</th>
                    <th align="right">{t(lang, "Hours", "课时")}</th>
                    <th align="left">{t(lang, "Currency", "币种")}</th>
                    <th align="right">{t(lang, "Tutor cost", "老师成本")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.summaryRows.map((row) => (
                    <tr key={`${row.teacherId}-${row.currencyCode}`} style={{ borderTop: "1px solid #eef2f7" }}>
                      <td style={{ fontWeight: 700 }}>{row.teacherName}</td>
                      <td align="right">{row.sessionCount}</td>
                      <td align="right" style={{ color: row.includedInSalarySessions > 0 ? "#1d4ed8" : "#64748b", fontWeight: 700 }}>{row.includedInSalarySessions}</td>
                      <td align="right">{row.totalHours.toFixed(2)}</td>
                      <td>{row.currencyCode}</td>
                      <td align="right">{moneyCents(row.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
