import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  defaultIndividualStudentUtilityMonth,
  defaultIndividualStudentUtilityWeek,
  loadIndividualStudentUtilityReport,
  resolveIndividualStudentUtilityRange,
} from "@/lib/individual-student-utility-report";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";

function buildExportHref(input: {
  periodType: string;
  month: string;
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams();
  params.set("periodType", input.periodType);
  if (input.periodType === "weekly") {
    params.set("startDate", input.startDate);
    params.set("endDate", input.endDate);
  } else {
    params.set("month", input.month);
  }
  return `/api/exports/individual-student-utility?${params.toString()}`;
}

function selectedPeriodType(value?: string | null) {
  return value === "weekly" ? "weekly" : "monthly";
}

export default async function IndividualStudentUtilityReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ periodType?: string; month?: string; startDate?: string; endDate?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const periodType = selectedPeriodType(sp?.periodType);
  const defaultWeek = defaultIndividualStudentUtilityWeek();
  const month = String(sp?.month ?? defaultIndividualStudentUtilityMonth()).trim();
  const startDate = String(sp?.startDate ?? defaultWeek.startDate).trim();
  const endDate = String(sp?.endDate ?? defaultWeek.endDate).trim();
  const range = resolveIndividualStudentUtilityRange({ periodType, month, startDate, endDate });
  const report = range ? await loadIndividualStudentUtilityReport({ periodType, month, startDate, endDate }) : null;
  const exportHref = buildExportHref({ periodType, month, startDate, endDate });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#047857", letterSpacing: 0.4 }}>
            {t(lang, "Individual Student Utility", "个人学生课时使用")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Individual Student Utility Report", "个人学生课时使用报表")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Download weekly or monthly Excel reports for individual student lesson usage. The report uses lesson dates and confirmed deducted attendance.",
              "下载个人学生每周或每月课时使用 Excel。报表按上课日期归属，只包含已确认点名且已扣课时的数据。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/finance/workbench">{t(lang, "Back to finance workbench", "返回财务工作台")}</a>
          <a href="/admin/reports/monthly-hours">{t(lang, "Open monthly hours", "打开月度课时明细")}</a>
          {report ? <a href={exportHref}>{t(lang, "Download Excel", "下载 Excel")}</a> : null}
        </div>
      </section>

      <form style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Export controls", "导出设置")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              "Choose weekly or monthly. Individual students are detected from student type names such as Own Student or Direct Student.",
              "选择周报或月报。系统按学生类型中的自己学生 / 直客学生识别个人学生。",
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Period", "周期")}</span>
            <select
              name="periodType"
              defaultValue={periodType}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            >
              <option value="monthly">{t(lang, "Monthly", "月报")}</option>
              <option value="weekly">{t(lang, "Weekly", "周报")}</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Month", "月份")}</span>
            <input
              type="month"
              name="month"
              defaultValue={month}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Start date", "开始日期")}</span>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "End date", "结束日期")}</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </label>
          <button type="submit">{t(lang, "Preview", "预览")}</button>
          {report ? <a href={exportHref}>{t(lang, "Download Excel", "下载 Excel")}</a> : null}
        </div>
      </form>

      {!range ? (
        <section style={{ border: "1px solid #fecaca", borderRadius: 14, background: "#fff7f7", padding: 14, color: "#991b1b" }}>
          {t(lang, "Invalid date range. Please check the selected dates.", "日期范围无效，请检查所选日期。")}
        </section>
      ) : report ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ ...workbenchMetricCardStyle("blue"), background: "#f8fbff" }}>
              <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Period", "期间")}</div>
              <div style={{ ...workbenchMetricValueStyle("blue"), fontSize: 18 }}>{report.range.label}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
              <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Students", "学生")}</div>
              <div style={workbenchMetricValueStyle("emerald")}>{report.totalStudents}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fffbeb" }}>
              <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Lessons", "课次")}</div>
              <div style={workbenchMetricValueStyle("amber")}>{report.totalLessons}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fff7f7" }}>
              <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Deducted hours", "扣课时")}</div>
              <div style={workbenchMetricValueStyle("rose")}>{report.totalDeductedHours.toFixed(2)}</div>
            </div>
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", fontWeight: 800 }}>
              {t(lang, "Student Summary Preview", "学生汇总预览")}
            </div>
            {report.summaryRows.length === 0 ? (
              <div style={{ padding: "0 14px 14px", color: "#475569" }}>
                {t(lang, "No individual student utility rows found for this period.", "该期间没有个人学生课时使用记录。")}
              </div>
            ) : (
              <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                    <th align="left">{t(lang, "Student", "学生")}</th>
                    <th align="left">{t(lang, "Source", "来源")}</th>
                    <th align="right">{t(lang, "Lessons", "课次")}</th>
                    <th align="right">{t(lang, "Deducted hours", "扣课时")}</th>
                    <th align="right">{t(lang, "Current remaining hours", "当前剩余课时")}</th>
                    <th align="left">{t(lang, "Courses", "课程")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.summaryRows.slice(0, 25).map((row) => (
                    <tr key={row.studentId} style={{ borderTop: "1px solid #eef2f7" }}>
                      <td style={{ fontWeight: 700 }}>{row.studentName}</td>
                      <td>{row.sourceChannel || "-"}</td>
                      <td align="right">{row.lessonCount}</td>
                      <td align="right">{row.totalDeductedHours.toFixed(2)}</td>
                      <td align="right">{row.currentRemainingHours.toFixed(2)}</td>
                      <td>{row.coursesUsed || "-"}</td>
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
