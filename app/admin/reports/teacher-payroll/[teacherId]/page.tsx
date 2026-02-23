import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  formatComboLabel,
  formatMoneyCents,
  loadTeacherPayrollDetail,
  monthKey,
  parseMonth,
} from "@/lib/teacher-payroll";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function TeacherPayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>;
  searchParams?: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const p = await params;
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());

  if (!parseMonth(month)) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll Detail", "老师工资明细")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const data = await loadTeacherPayrollDetail(month, p.teacherId);
  if (!data) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll Detail", "老师工资明细")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Teacher not found.", "老师不存在。")}</div>
        <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}`}>{t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const periodText = `${DATE_FMT.format(data.range.start)} - ${DATE_FMT.format(new Date(data.range.end.getTime() - 1000))}`;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}`}>{t(lang, "Back to Payroll", "返回工资总览")}</a>
      </div>

      <h2>
        {t(lang, "Teacher Payroll Detail", "老师工资明细")} - {data.teacher.name}
      </h2>

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "Payroll Month", "工资月份")}:
          <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      <div style={{ marginBottom: 12 }}>
        <b>{t(lang, "Current Period", "当前周期")}</b>: {periodText}
      </div>
      {data.usingRateFallback ? (
        <div style={{ marginBottom: 12, color: "#92400e" }}>
          {t(
            lang,
            "Rate table migration not found. Using fallback storage for preview.",
            "费率表迁移未生效，当前使用预览降级存储。"
          )}
        </div>
      ) : null}

      <div style={{ marginBottom: 16, padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
        <div>
          <b>{t(lang, "Sessions", "课次数")}</b>: {data.totalSessions}
        </div>
        <div>
          <b>{t(lang, "Total Hours", "总课时")}</b>: {data.totalHours}
        </div>
        <div>
          <b>{t(lang, "Total Salary", "总工资")}</b>: {formatMoneyCents(data.totalAmountCents)}
        </div>
      </div>

      <h3>{t(lang, "Combo Summary", "课程组合汇总")}</h3>
      {data.comboRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No data in this period.", "当前周期无数据。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {data.comboRows.map((row) => (
              <tr key={`${row.courseId}-${row.subjectId ?? "-"}-${row.levelId ?? "-"}`} style={{ borderTop: "1px solid #eee" }}>
                <td>{formatComboLabel(row.courseName, row.subjectName, row.levelName)}</td>
                <td>{row.sessionCount}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents)}</td>
                <td>{formatMoneyCents(row.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Session Details", "逐课次明细")}</h3>
      {data.sessionRows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No session rows.", "暂无课次明细。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Start", "开始时间")}</th>
              <th align="left">{t(lang, "End", "结束时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {data.sessionRows.map((row) => (
              <tr key={row.sessionId} style={{ borderTop: "1px solid #eee" }}>
                <td>{DATE_TIME_FMT.format(row.startAt)}</td>
                <td>{DATE_TIME_FMT.format(row.endAt)}</td>
                <td>{row.studentName}</td>
                <td>{formatComboLabel(row.courseName, row.subjectName, row.levelName)}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents)}</td>
                <td>{formatMoneyCents(row.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
