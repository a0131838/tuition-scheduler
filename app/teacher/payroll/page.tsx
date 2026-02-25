import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import {
  confirmTeacherPayroll,
  formatComboLabel,
  formatMoneyCents,
  getTeacherPayrollPublishForTeacher,
  loadTeacherPayrollDetail,
  monthKey,
  parseMonth,
} from "@/lib/teacher-payroll";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  if (reason === "ATTENDANCE_AND_FEEDBACK_MISSING") return t(lang, "Attendance and feedback missing", "点名与反馈均未完成");
  return "-";
}

async function confirmPayrollAction(formData: FormData) {
  "use server";
  const { teacher, user } = await requireTeacherProfile();
  if (!teacher) {
    redirect("/teacher/payroll?err=no-teacher");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  if (!parseMonth(month)) {
    redirect(`/teacher/payroll?err=month`);
  }

  const ok = await confirmTeacherPayroll({ teacherId: teacher.id, month, scope, actorEmail: user.email });
  if (!ok) {
    redirect(`/teacher/payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&err=not-sent`);
  }

  revalidatePath("/teacher/payroll");
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/teacher/payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&msg=confirmed`);
}

export default async function TeacherPayrollSelfPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; scope?: string; msg?: string; err?: string }>;
}) {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();

  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const scope = sp?.scope === "completed" ? "completed" : "all";
  const msg = sp?.msg ?? "";
  const err = sp?.err ?? "";

  if (!parseMonth(month)) {
    return (
      <div>
        <h2>{t(lang, "My Payroll", "我的工资单")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const publish = await getTeacherPayrollPublishForTeacher({ teacherId: teacher.id, month, scope });

  return (
    <div>
      <h2>{t(lang, "My Payroll", "我的工资单")}</h2>
      {msg === "confirmed" ? <div style={{ marginBottom: 10, color: "#166534" }}>{t(lang, "Payroll confirmed.", "工资单已确认。")}</div> : null}
      {err === "not-sent" ? <div style={{ marginBottom: 10, color: "#b00" }}>{t(lang, "This payroll has not been sent by admin yet.", "该工资单尚未由管理端发送。")}</div> : null}
      {err === "month" ? <div style={{ marginBottom: 10, color: "#b00" }}>{t(lang, "Invalid month format.", "月份格式错误。")}</div> : null}

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

      {!publish ? (
        <div style={{ color: "#666" }}>{t(lang, "Admin has not sent this month's payroll yet.", "管理端尚未发送该月工资单。")}</div>
      ) : (
        <TeacherPayrollBody teacherId={teacher.id} month={month} scope={scope} sentAt={publish.sentAt} confirmedAt={publish.confirmedAt} lang={lang} />
      )}
    </div>
  );
}

async function TeacherPayrollBody({
  teacherId,
  month,
  scope,
  sentAt,
  confirmedAt,
  lang,
}: {
  teacherId: string;
  month: string;
  scope: "all" | "completed";
  sentAt: string;
  confirmedAt: string | null;
  lang: Awaited<ReturnType<typeof getLang>>;
}) {
  const data = await loadTeacherPayrollDetail(month, teacherId, scope);
  if (!data) {
    return <div style={{ color: "#b00" }}>{t(lang, "Payroll data not found.", "未找到工资数据。")}</div>;
  }

  const periodText = `${DATE_FMT.format(data.range.start)} - ${DATE_FMT.format(new Date(data.range.end.getTime() - 1000))}`;

  return (
    <>
      <div style={{ marginBottom: 12, padding: "8px 10px", border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, color: "#1e3a8a" }}>
        {t(lang, "Sent by admin", "管理端发送时间")}: {new Date(sentAt).toLocaleString()}
        <br />
        {confirmedAt
          ? `${t(lang, "Confirmed at", "确认时间")}: ${new Date(confirmedAt).toLocaleString()}`
          : t(lang, "Please review and confirm this payroll.", "请核对后确认此工资单。")}
      </div>

      {!confirmedAt ? (
        <form action={confirmPayrollAction} style={{ marginBottom: 12 }}>
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="scope" value={scope} />
          <button type="submit">{t(lang, "Confirm Payroll", "确认工资单")}</button>
        </form>
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <b>{t(lang, "Current Period", "当前周期")}</b>: {periodText}
      </div>

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
              <th align="left">{t(lang, "Student Sessions", "该学生课次数")}</th>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Hourly Rate", "课时费")}</th>
              <th align="left">{t(lang, "Status", "状态")}</th>
              <th align="left">{t(lang, "Pending Reason", "未完成原因")}</th>
              <th align="left">{t(lang, "Amount", "金额")}</th>
            </tr>
          </thead>
          <tbody>
            {data.sessionRows.map((row) => (
              <tr key={row.sessionId} style={{ borderTop: "1px solid #eee" }}>
                <td>{DATE_TIME_FMT.format(row.startAt)}</td>
                <td>{DATE_TIME_FMT.format(row.endAt)}</td>
                <td>{row.studentName}</td>
                <td>{row.studentSessionCount}</td>
                <td>{formatComboLabel(row.courseName, row.subjectName, row.levelName)}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents)}</td>
                <td>
                  <span style={{ color: row.isCompleted ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                    {row.isCompleted ? t(lang, "Completed", "已完成") : t(lang, "Pending", "未完成")}
                  </span>
                </td>
                <td style={{ color: row.isCompleted ? "#64748b" : "#b45309", fontWeight: row.isCompleted ? 400 : 700 }}>
                  {row.isCompleted ? "-" : pendingReasonLabel(lang, row.pendingReason)}
                </td>
                <td>{formatMoneyCents(row.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
