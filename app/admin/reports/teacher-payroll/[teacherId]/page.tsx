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

function pendingReasonLabel(lang: Awaited<ReturnType<typeof getLang>>, reason: string | null) {
  if (!reason) return "-";
  if (reason === "ATTENDANCE_MISSING") return t(lang, "No attendance record", "未点名");
  if (reason === "ATTENDANCE_UNMARKED") return t(lang, "Attendance not fully marked", "点名未完成");
  if (reason === "FEEDBACK_MISSING") return t(lang, "Teacher feedback missing", "未提交反馈");
  if (reason === "ATTENDANCE_AND_FEEDBACK_MISSING")
    return t(lang, "Attendance and feedback missing", "点名与反馈均未完成");
  return "-";
}

export default async function TeacherPayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>;
  searchParams?: Promise<{ month?: string; scope?: string; pendingOnly?: string; fallbackOnly?: string; chargedOnly?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const p = await params;
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const scope = sp?.scope === "completed" ? "completed" : "all";
  const pendingOnly = sp?.pendingOnly === "1";
  const fallbackOnly = sp?.fallbackOnly === "1";
  const chargedOnly = sp?.chargedOnly === "1";

  if (!parseMonth(month)) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll Detail", "老师工资明细")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const data = await loadTeacherPayrollDetail(month, p.teacherId, scope);
  if (!data) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll Detail", "老师工资明细")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Teacher not found.", "老师不存在。")}</div>
        <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>{t(lang, "Back", "返回")}</a>
      </div>
    );
  }

  const periodText = `${DATE_FMT.format(data.range.start)} - ${DATE_FMT.format(new Date(data.range.end.getTime() - 1000))}`;
  const filteredComboRows = data.comboRows.filter((row) => {
    if (fallbackOnly && !row.usedRateFallback) return false;
    if (chargedOnly && row.chargedExcusedSessions <= 0) return false;
    return true;
  });
  const filteredSessionRows = data.sessionRows.filter((row) => {
    if (pendingOnly && row.isCompleted) return false;
    if (fallbackOnly && !row.usedRateFallback) return false;
    if (chargedOnly && !row.isChargedExcused) return false;
    return true;
  });
  const pendingCount = data.sessionRows.filter((row) => !row.isCompleted).length;
  const fallbackCount = data.sessionRows.filter((row) => row.usedRateFallback).length;
  const chargedCount = data.sessionRows.filter((row) => row.isChargedExcused).length;
  const buildDetailHref = (kind?: "pending" | "fallback" | "charged") => {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("scope", scope);
    if (kind === "pending") params.set("pendingOnly", "1");
    if (kind === "fallback") params.set("fallbackOnly", "1");
    if (kind === "charged") params.set("chargedOnly", "1");
    return `/admin/reports/teacher-payroll/${encodeURIComponent(p.teacherId)}?${params.toString()}`;
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>{t(lang, "Back to payroll desk", "返回工资工作台")}</a>
      </div>

      <h2>
        {t(lang, "Teacher Payroll Detail", "老师工资明细")} - {data.teacher.name}
      </h2>

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "Payroll Month", "工资月份")}:
          <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "Scope", "统计口径")}:
          <select name="scope" defaultValue={scope} style={{ marginLeft: 6 }}>
            <option value="all">{t(lang, "All scheduled sessions (except fully cancelled)", "全部排课课次（不含整节取消）")}</option>
            <option value="completed">{t(lang, "Completed only (attendance marked + feedback submitted)", "仅已完成（已点名且已提交反馈）")}</option>
          </select>
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
      </form>
      <form method="GET" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="scope" value={scope} />
        <label>
          <input type="checkbox" name="pendingOnly" value="1" defaultChecked={pendingOnly} /> {t(lang, "Pending sessions only", "只看未完成课次")}
        </label>
        <label>
          <input type="checkbox" name="fallbackOnly" value="1" defaultChecked={fallbackOnly} /> {t(lang, "Fallback-rate rows only", "只看费率回退条目")}
        </label>
        <label>
          <input type="checkbox" name="chargedOnly" value="1" defaultChecked={chargedOnly} /> {t(lang, "Cancelled-but-charged rows only", "只看取消但计薪条目")}
        </label>
        <button type="submit" data-apply-submit="1">{t(lang, "Apply detail filters", "应用明细筛选")}</button>
        <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(p.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
          {t(lang, "Clear", "清除")}
        </a>
      </form>

      <div style={{ marginBottom: 12 }}>
        <b>{t(lang, "Current payroll period", "当前工资周期")}</b>: {periodText}
      </div>
      <div
        style={{
          marginBottom: 12,
          padding: "8px 10px",
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          borderRadius: 8,
          color: "#1e3a8a",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {t(
          lang,
          "Completion rule: session is Completed only when attendance is marked (no UNMARKED) and teacher feedback has been submitted.",
          "完成判定规则：整节取消课次不计入；其余课次仅当已完成点名（无UNMARKED）且老师已提交课后反馈，才算已完成。"
        )}
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
          <b>{t(lang, "Total Salary", "总工资")}</b>:{" "}
          {data.totalCurrencyTotals.length === 0
            ? formatMoneyCents(0)
            : data.totalCurrencyTotals.map((item) => (
                <div key={item.currencyCode}>{formatMoneyCents(item.amountCents, item.currencyCode)}</div>
              ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: 16,
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div style={{ border: "1px solid #fde68a", borderRadius: 10, padding: 10, background: "#fffbeb" }}>
          <div style={{ color: "#92400e", fontSize: 12 }}>{t(lang, "Pending sessions", "待完成课次")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#b45309" }}>{pendingCount}</div>
          {pendingCount > 0 ? (
            <div style={{ marginTop: 6 }}>
              <a href={buildDetailHref("pending")}>{t(lang, "Open pending rows", "打开未完成条目")}</a>
            </div>
          ) : null}
        </div>
        <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: 10, background: "#fefce8" }}>
          <div style={{ color: "#854d0e", fontSize: 12 }}>{t(lang, "Fallback-rate rows", "费率回退条目")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#a16207" }}>{fallbackCount}</div>
          {fallbackCount > 0 ? (
            <div style={{ marginTop: 6 }}>
              <a href={buildDetailHref("fallback")}>{t(lang, "Open fallback rows", "打开费率回退条目")}</a>
            </div>
          ) : null}
        </div>
        <div style={{ border: "1px solid #fed7aa", borderRadius: 10, padding: 10, background: "#fff7ed" }}>
          <div style={{ color: "#9a3412", fontSize: 12 }}>{t(lang, "Cancelled+charged rows", "取消但计薪条目")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#c2410c" }}>{chargedCount}</div>
          {chargedCount > 0 ? (
            <div style={{ marginTop: 6 }}>
              <a href={buildDetailHref("charged")}>{t(lang, "Open charged rows", "打开计薪条目")}</a>
            </div>
          ) : null}
        </div>
      </div>

      <h3>{t(lang, "Combo Summary", "课程组合汇总")}</h3>
      {filteredComboRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No data in this period.", "当前周期无数据。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Cancelled+Charged", "取消但扣课时")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredComboRows.map((row) => (
              <tr key={`${row.courseId}-${row.subjectId ?? "-"}-${row.levelId ?? "-"}-${row.teachingMode}-${row.currencyCode}`} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <div>{formatComboLabel(row.courseName, row.subjectName, row.levelName, row.teachingMode)}</div>
                  {row.usedRateFallback ? (
                    <div style={{ color: "#92400e", fontSize: 12 }}>
                      {t(lang, "Using 1-on-1 fallback for group rate", "班课未配置专属费率，当前回退使用一对一费率")}
                    </div>
                  ) : null}
                </td>
                <td>{row.sessionCount}</td>
                <td style={{ color: row.chargedExcusedSessions > 0 ? "#9a3412" : "#64748b", fontWeight: 700 }}>{row.chargedExcusedSessions}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents, row.currencyCode)}</td>
                <td>{formatMoneyCents(row.amountCents, row.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Session Details", "逐课次明细")}</h3>
      {filteredSessionRows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No session rows.", "暂无课次明细。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Start", "开始时间")}</th>
              <th align="left">{t(lang, "End", "结束时间")}</th>
              <th align="left">{t(lang, "Student", "学生")}</th>
              <th align="left">{t(lang, "Student Sessions", "该学生课次数")}</th>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Special", "特别标记")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Pending Reason", "未完成原因")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessionRows.map((row) => (
              <tr key={row.sessionId} style={{ borderTop: "1px solid #eee" }}>
                <td>{DATE_TIME_FMT.format(row.startAt)}</td>
                <td>{DATE_TIME_FMT.format(row.endAt)}</td>
                <td>{row.studentName}</td>
                <td>{row.studentSessionCount}</td>
                <td>
                  <div>{formatComboLabel(row.courseName, row.subjectName, row.levelName, row.teachingMode)}</div>
                  {row.usedRateFallback ? (
                    <div style={{ color: "#92400e", fontSize: 12 }}>
                      {t(lang, "Using 1-on-1 fallback for group rate", "班课未配置专属费率，当前回退使用一对一费率")}
                    </div>
                  ) : null}
                </td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents, row.currencyCode)}</td>
                <td>
                  {row.isChargedExcused ? (
                    <span style={{ color: "#9a3412", fontWeight: 700 }}>{t(lang, "Cancelled+Charged", "取消但扣课时")}</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <span style={{ color: row.isCompleted ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                    {row.isCompleted ? t(lang, "Completed", "已完成") : t(lang, "Pending", "未完成")}
                  </span>
                </td>
                <td style={{ color: row.isCompleted ? "#64748b" : "#b45309", fontWeight: row.isCompleted ? 400 : 700 }}>
                  {row.isCompleted ? "-" : pendingReasonLabel(lang, row.pendingReason)}
                </td>
                <td>{formatMoneyCents(row.amountCents, row.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
