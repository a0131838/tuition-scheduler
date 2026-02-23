import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  formatComboLabel,
  formatMoneyCents,
  loadTeacherPayroll,
  monthKey,
  parseMonth,
  upsertTeacherPayrollRate,
} from "@/lib/teacher-payroll";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PERIOD_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function normalizeOptionalId(v: FormDataEntryValue | null) {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function saveRateAction(formData: FormData) {
  "use server";
  await requireAdmin();

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";
  const courseId = typeof formData.get("courseId") === "string" ? String(formData.get("courseId")) : "";
  const subjectId = normalizeOptionalId(formData.get("subjectId"));
  const levelId = normalizeOptionalId(formData.get("levelId"));
  const hourlyRateRaw = typeof formData.get("hourlyRate") === "string" ? String(formData.get("hourlyRate")) : "0";

  const hourlyRate = Number(hourlyRateRaw);
  if (!teacherId || !courseId || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=rate`);
  }

  const hourlyRateCents = Math.round(hourlyRate * 100);
  await upsertTeacherPayrollRate({
    teacherId,
    courseId,
    subjectId,
    levelId,
    hourlyRateCents,
  });

  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&saved=1`);
}

export default async function TeacherPayrollPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; scope?: string; saved?: string; error?: string }>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const scope = sp?.scope === "completed" ? "completed" : "all";
  const saved = sp?.saved === "1";
  const hasError = sp?.error === "rate";

  if (!parseMonth(month)) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll", "老师工资单")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const data = await loadTeacherPayroll(month, scope);
  if (!data) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll", "老师工资单")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const periodText = `${PERIOD_DATE_FMT.format(data.range.start)} - ${PERIOD_DATE_FMT.format(
    new Date(data.range.end.getTime() - 1000)
  )}`;

  return (
    <div>
      <h2>{t(lang, "Teacher Payroll", "老师工资单")}</h2>
      <div style={{ marginBottom: 10, color: "#666" }}>
        {t(
          lang,
          "Payroll period rule: from last month 15th to this month 14th.",
          "计薪周期规则：上月15日到当月14日。"
        )}
      </div>

      <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          {t(lang, "Payroll Month", "工资月份")}:
          <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
        </label>
        <label>
          {t(lang, "Scope", "统计口径")}:
          <select name="scope" defaultValue={scope} style={{ marginLeft: 6 }}>
            <option value="all">{t(lang, "All Scheduled Sessions", "全部排课课次")}</option>
            <option value="completed">{t(lang, "Completed Only (Marked + Feedback)", "仅已完成(已点名+已反馈)")}</option>
          </select>
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
      </form>

      <div style={{ marginBottom: 12 }}>
        <b>{t(lang, "Current Period", "当前周期")}</b>: {periodText}
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
          "完成判定规则：仅当该课次已完成点名（无UNMARKED）且老师已提交课后反馈，才算已完成。"
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

      {saved ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Rate saved.", "费率已保存。")}</div> : null}
      {hasError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Invalid rate input.", "费率输入无效。")}</div> : null}

      <div style={{ marginBottom: 16, padding: 10, border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
        <div>
          <b>{t(lang, "Grand Total Hours", "总课时")}</b>: {data.grandTotalHours}
        </div>
        <div>
          <b>{t(lang, "Grand Total Salary", "总工资")}</b>: {formatMoneyCents(data.grandTotalAmountCents)}
        </div>
      </div>

      <h3>{t(lang, "Salary Slips by Teacher", "按老师工资单")}</h3>
      {data.summaryRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No sessions in this payroll period.", "当前计薪周期没有课次。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Completed", "已完成")}</th>
              <th align="left">{t(lang, "Pending", "未完成")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Salary", "工资")}</th>
              <th align="left">{t(lang, "Detail", "详情")}</th>
            </tr>
          </thead>
          <tbody>
            {data.summaryRows.map((row) => (
              <tr key={row.teacherId} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
                    {row.teacherName}
                  </a>
                </td>
                <td>{row.totalSessions}</td>
                <td style={{ color: "#166534", fontWeight: 700 }}>{row.completedSessions}</td>
                <td style={{ color: row.pendingSessions > 0 ? "#b91c1c" : "#64748b", fontWeight: 700 }}>{row.pendingSessions}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.totalAmountCents)}</td>
                <td>
                  <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
                    {t(lang, "Open", "打开")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>{t(lang, "Rate Config (Teacher + Course)", "费率配置（老师 + 课程）")}</h3>
      <div style={{ marginBottom: 10, color: "#666" }}>
        {t(
          lang,
          "If no matching rate is found, hourly rate defaults to 0.",
          "若没有匹配费率，默认课时费为 0。"
        )}
      </div>

      {data.rateEditorRows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No editable rate rows.", "暂无可编辑费率项。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Matched Sessions", "匹配课次")}</th>
              <th align="left">{t(lang, "Matched Hours", "匹配课时")}</th>
              <th align="left">{t(lang, "Edit Hourly Rate", "编辑课时费")}</th>
            </tr>
          </thead>
          <tbody>
            {data.rateEditorRows.map((row) => (
              <tr key={`rate-${row.teacherId}-${row.courseId}-${row.subjectId ?? "-"}-${row.levelId ?? "-"}`} style={{ borderTop: "1px solid #eee" }}>
                <td>{row.teacherName}</td>
                <td>{formatComboLabel(row.courseName, row.subjectName, row.levelName)}</td>
                <td>{row.matchedSessions}</td>
                <td>{row.matchedHours}</td>
                <td>
                  <form action={saveRateAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="scope" value={scope} />
                    <input type="hidden" name="teacherId" value={row.teacherId} />
                    <input type="hidden" name="courseId" value={row.courseId} />
                    <input type="hidden" name="subjectId" value={row.subjectId ?? ""} />
                    <input type="hidden" name="levelId" value={row.levelId ?? ""} />
                    <input
                      name="hourlyRate"
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={(row.hourlyRateCents / 100).toFixed(2)}
                      style={{ width: 100 }}
                    />
                    <button type="submit">{t(lang, "Save", "保存")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

