import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { areAllApproversConfirmed, getApprovalRoleConfig, isRoleApprover, saveApprovalRoleConfig } from "@/lib/approval-flow";
import { getLang, t } from "@/lib/i18n";
import {
  financeConfirmTeacherPayroll,
  financeMarkTeacherPayrollPaid,
  financeRejectTeacherPayroll,
  formatComboLabel,
  formatMoneyCents,
  getTeacherPayrollPublishStatus,
  loadTeacherPayroll,
  managerApproveTeacherPayroll,
  markTeacherPayrollSent,
  monthKey,
  parseMonth,
  revokeTeacherPayrollSent,
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
const APPROVAL_CONFIG_OWNER_EMAIL = "zhaohongwei0880@gmail.com";

function canEditApprovalRoleConfig(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === APPROVAL_CONFIG_OWNER_EMAIL;
}

function normalizeOptionalId(v: FormDataEntryValue | null) {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function saveRateAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/teacher-payroll?error=forbidden");
  }

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

async function sendPayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/teacher-payroll?error=forbidden");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";

  if (!teacherId || !parseMonth(month)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=send`);
  }

  const ok = await markTeacherPayrollSent({ teacherId, month, scope, actorEmail: user.email });
  if (!ok) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=send-paid`);
  }

  revalidatePath("/admin/reports/teacher-payroll");
  revalidatePath("/teacher/payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&sent=1`);
}

async function revokePayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/teacher-payroll?error=forbidden");
  }

  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";

  if (!teacherId || !parseMonth(month)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=revoke`);
  }

  const ok = await revokeTeacherPayrollSent({ teacherId, month, scope, actorEmail: user.email });
  if (!ok) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=revoke-paid`);
  }

  revalidatePath("/admin/reports/teacher-payroll");
  revalidatePath("/teacher/payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&revoked=1`);
}

async function saveApprovalConfigAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/teacher-payroll?error=forbidden");
  }
  if (!canEditApprovalRoleConfig(user.email)) {
    redirect("/admin/reports/teacher-payroll?error=cfg-perm");
  }
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const managerEmailsRaw = typeof formData.get("managerEmails") === "string" ? String(formData.get("managerEmails")) : "";
  const financeEmailsRaw = typeof formData.get("financeEmails") === "string" ? String(formData.get("financeEmails")) : "";
  await saveApprovalRoleConfig({ managerEmailsRaw, financeEmailsRaw });
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&cfg=1`);
}

async function managerApprovePayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  if (user.role === "FINANCE") {
    redirect("/admin/reports/teacher-payroll?error=forbidden");
  }
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";
  const cfg = await getApprovalRoleConfig();
  if (!isRoleApprover(user.email, cfg.managerApproverEmails)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=mgr-perm`);
  }
  const ok = await managerApproveTeacherPayroll({
    teacherId,
    month,
    scope,
    approverEmail: user.email,
    allManagerApproverEmails: cfg.managerApproverEmails,
  });
  if (!ok) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=mgr-approve`);
  }
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&mgr=1`);
}

async function financeApprovePayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";
  const cfg = await getApprovalRoleConfig();
  if (!isRoleApprover(user.email, cfg.financeApproverEmails)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-perm`);
  }
  const ok = await financeConfirmTeacherPayroll({ teacherId, month, scope, financeEmail: user.email });
  if (!ok) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-approve`);
  }
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&fincfm=1`);
}

async function financeMarkPaidPayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";
  const cfg = await getApprovalRoleConfig();
  if (!isRoleApprover(user.email, cfg.financeApproverEmails)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-perm`);
  }
  const ok = await financeMarkTeacherPayrollPaid({ teacherId, month, scope, financeEmail: user.email });
  if (!ok) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-paid`);
  }
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&finpaid=1`);
}

async function financeRejectPayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";
  const rejectReason = typeof formData.get("rejectReason") === "string" ? String(formData.get("rejectReason")).trim() : "";
  const cfg = await getApprovalRoleConfig();
  if (!isRoleApprover(user.email, cfg.financeApproverEmails)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-perm`);
  }
  if (!rejectReason) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-reason`);
  }
  const ok = await financeRejectTeacherPayroll({ teacherId, month, scope, financeEmail: user.email, reason: rejectReason });
  if (!ok) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-reject`);
  }
  revalidatePath("/admin/reports/teacher-payroll");
  redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&finrej=1`);
}

export default async function TeacherPayrollPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    scope?: string;
    saved?: string;
    sent?: string;
    revoked?: string;
    cfg?: string;
    mgr?: string;
    finpaid?: string;
    fincfm?: string;
    finrej?: string;
    error?: string;
    q?: string;
    pendingOnly?: string;
    unsentOnly?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const current = await getCurrentUser();
  const lang = await getLang();
  const sp = await searchParams;
  const month = sp?.month ?? monthKey(new Date());
  const scope = sp?.scope === "completed" ? "completed" : "all";
  const saved = sp?.saved === "1";
  const hasError = sp?.error === "rate";
  const sent = sp?.sent === "1";
  const revoked = sp?.revoked === "1";
  const q = String(sp?.q ?? "").trim().toLowerCase();
  const pendingOnly = sp?.pendingOnly === "1";
  const unsentOnly = sp?.unsentOnly === "1";
  const cfgSaved = sp?.cfg === "1";
  const mgrDone = sp?.mgr === "1";
  const finPaidDone = sp?.finpaid === "1";
  const finConfirmDone = sp?.fincfm === "1";
  const finRejectedDone = sp?.finrej === "1";
  const sendError = sp?.error === "send";
  const revokeError = sp?.error === "revoke";
  const roleConfig = await getApprovalRoleConfig();
  const isManagerApprover = isRoleApprover(current?.email ?? admin.email, roleConfig.managerApproverEmails);
  const isFinanceApprover = isRoleApprover(current?.email ?? admin.email, roleConfig.financeApproverEmails);
  const isFinanceOnlyUser = admin.role === "FINANCE";
  const canEditApprovalConfig = canEditApprovalRoleConfig(current?.email ?? admin.email);

  if (!parseMonth(month)) {
    return (
      <div>
        <h2>{t(lang, "Teacher Payroll", "老师工资单")}</h2>
        <div style={{ color: "#b00" }}>{t(lang, "Invalid month format. Use YYYY-MM.", "月份格式错误，请使用 YYYY-MM。")}</div>
      </div>
    );
  }

  const data = await loadTeacherPayroll(month, scope);
  const publishMap = await getTeacherPayrollPublishStatus(month, scope);
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
  const parsedMonth = parseMonth(month);
  const payrollMonthLabel = parsedMonth ? `${parsedMonth.year}-${String(parsedMonth.month).padStart(2, "0")}` : month;
  const payDateLabel = parsedMonth
    ? `${parsedMonth.month === 12 ? parsedMonth.year + 1 : parsedMonth.year}-${String(parsedMonth.month === 12 ? 1 : parsedMonth.month + 1).padStart(2, "0")}-05`
    : "";

  const payrollRows = data.summaryRows.filter((row) => {
    const publish = publishMap.get(row.teacherId) ?? null;
    const managerAllConfirmed = publish
      ? areAllApproversConfirmed(publish.managerApprovedBy, roleConfig.managerApproverEmails)
      : false;
    const hasPendingWorkflow = publish
      ? !publish.confirmedAt || !managerAllConfirmed || !publish.financeConfirmedAt || !publish.financePaidAt
      : false;
    if (pendingOnly && !hasPendingWorkflow) return false;
    if (unsentOnly && Boolean(publish)) return false;
    if (q && !row.teacherName.toLowerCase().includes(q)) return false;
    return true;
  });

  const shownHours = payrollRows.reduce((sum, row) => sum + row.totalHours, 0);
  const shownSalaryCents = payrollRows.reduce((sum, row) => sum + row.totalAmountCents, 0);
  const shownPending = payrollRows.reduce((sum, row) => sum + row.pendingSessions, 0);
  const shownCompleted = payrollRows.reduce((sum, row) => sum + row.completedSessions, 0);

  return (
    <div>
      <h2>{t(lang, "Teacher Payroll", "老师工资单")}</h2>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 12, background: "#f8fafc" }}>
        <form method="GET" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label>
              {t(lang, "Payroll Month", "工资月份")}:
              <input name="month" type="month" defaultValue={month} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {t(lang, "Scope", "统计口径")}:
              <select name="scope" defaultValue={scope} style={{ marginLeft: 6 }}>
                <option value="all">{t(lang, "All Scheduled Sessions (exclude fully cancelled)", "全部排课课次（排除整节取消）")}</option>
                <option value="completed">{t(lang, "Completed Only (Marked + Feedback)", "仅已完成(已点名+已反馈)")}</option>
              </select>
            </label>
            <button type="submit">{t(lang, "Apply", "应用")}</button>
          </div>
          <div style={{ fontSize: 13, color: "#334155" }}>
            <b>{t(lang, "Current Period", "当前周期")}</b>: {periodText}
          </div>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{t(lang, "Rule Notes", "规则说明")}</summary>
            <div style={{ marginTop: 6, color: "#475569", fontSize: 13, lineHeight: 1.55 }}>
              <div>{t(lang, "Payroll period rule: from last month 15th to this month 14th.", "计薪周期规则：上月15日到当月14日。")}</div>
              <div>
                {t(
                  lang,
                  `Payout note: salary for ${payrollMonthLabel} is paid on ${payDateLabel}, and covers ${periodText}. Example: paid on March 5 for February payroll; February payroll covers Jan 15 to Feb 14.`,
                  `发薪说明：${payrollMonthLabel} 工资在 ${payDateLabel} 发放，统计区间为 ${periodText}。例如：3月5日发2月工资，2月工资统计1月15日到2月14日。`
                )}
              </div>
              <div>
                {t(
                  lang,
                  "Completion rule: session is Completed only when attendance is marked (no UNMARKED) and teacher feedback has been submitted.",
                  "完成判定规则：整节取消课次不计入；其余课次仅当已完成点名（无UNMARKED）且老师已提交课后反馈，才算已完成。"
                )}
              </div>
            </div>
          </details>
        </form>
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
      {cfgSaved ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Approval role config saved.", "审批角色配置已保存。")}</div> : null}
      {mgrDone ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Manager approval recorded.", "管理审批已记录。")}</div> : null}
      {finConfirmDone ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Finance confirmation recorded.", "财务确认已记录。")}</div> : null}
      {finPaidDone ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Finance payout recorded.", "财务发薪已记录。")}</div> : null}
      {finRejectedDone ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Finance rejection recorded.", "财务驳回已记录。")}</div> : null}
      {hasError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Invalid rate input.", "费率输入无效。")}</div> : null}
      {sent ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Payroll sent to teacher.", "工资单已发送给老师。")}</div> : null}
      {revoked ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Payroll send has been revoked.", "工资单发送已撤销。")}</div> : null}
      {sendError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Failed to send payroll.", "发送工资单失败。")}</div> : null}
      {sp?.error === "send-paid" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Paid payroll can only be resent by zhao hongwei.", "已发薪工资单仅 zhao hongwei 可重新发送。")}</div> : null}
      {revokeError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Failed to revoke payroll send.", "撤销发送失败。")}</div> : null}
      {sp?.error === "revoke-paid" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Paid payroll can only be revoked by zhao hongwei.", "已发薪工资单仅 zhao hongwei 可撤销。")}</div> : null}
      {sp?.error === "mgr-perm" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "No manager approver permission.", "无管理审批权限。")}</div> : null}
      {sp?.error === "fin-perm" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "No finance approver permission.", "无财务审批权限。")}</div> : null}
      {sp?.error === "mgr-approve" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Manager approval failed.", "管理审批失败。")}</div> : null}
      {sp?.error === "fin-approve" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance approval failed.", "财务审批失败。")}</div> : null}
      {sp?.error === "fin-paid" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance payout failed.", "财务发薪失败。")}</div> : null}
      {sp?.error === "fin-reject" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance reject failed.", "财务驳回失败。")}</div> : null}
      {sp?.error === "fin-reason" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Please enter reject reason.", "请填写驳回原因。")}</div> : null}
      {sp?.error === "cfg-perm" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Only zhao hongwei can edit approval role config.", "只有 zhao hongwei 可以修改审批角色配置。")}</div> : null}
      {sp?.error === "forbidden" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance role cannot modify this data.", "财务角色不能修改此类数据。")}</div> : null}

      {!isFinanceOnlyUser ? (
        <div style={{ marginBottom: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{t(lang, "Approval Role Config", "审批角色配置")}</h3>
          </div>
          <form action={saveApprovalConfigAction} style={{ display: "grid", gap: 8, maxWidth: 980 }}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="scope" value={scope} />
            <label>
              {t(lang, "Manager approver emails (comma-separated)", "管理审批人邮箱（逗号分隔）")}:
              <input name="managerEmails" readOnly={!canEditApprovalConfig} defaultValue={roleConfig.managerApproverEmails.join(", ")} style={{ marginLeft: 6, width: "100%" }} />
            </label>
            <label>
              {t(lang, "Finance approver emails (comma-separated)", "财务审批人邮箱（逗号分隔）")}:
              <input name="financeEmails" readOnly={!canEditApprovalConfig} defaultValue={roleConfig.financeApproverEmails.join(", ")} style={{ marginLeft: 6, width: "100%" }} />
            </label>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {t(lang, "All approvers in each role must confirm before next gated step is enabled.", "每个角色列表中的全部人员都确认后，才能进入下一步。")}
            </div>
            {!canEditApprovalConfig ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>{t(lang, "Read-only for non-owner accounts.", "非负责人账号只读。")}</div>
            ) : null}
            <div><button type="submit" disabled={!canEditApprovalConfig}>{t(lang, "Save", "保存")}</button></div>
          </form>
        </div>
      ) : null}

      <div
        style={{
          marginBottom: 14,
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Teachers", "教师数")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{payrollRows.length}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Total Hours", "总课时")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{shownHours}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Completed", "已完成")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#166534" }}>{shownCompleted}</div>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Estimated Salary", "预估工资")}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoneyCents(shownSalaryCents)}</div>
        </div>
        <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: 10, background: "#fffbeb" }}>
          <div style={{ color: "#92400e", fontSize: 12 }}>{t(lang, "Pending Sessions", "待完成课次")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#b45309" }}>{shownPending}</div>
        </div>
      </div>

      <h3>{t(lang, "Salary Slips by Teacher", "按老师工资单")}</h3>
      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="scope" value={scope} />
        <input
          type="text"
          name="q"
          placeholder={t(lang, "Teacher Search", "老师搜索")}
          defaultValue={String(sp?.q ?? "")}
          style={{ minWidth: 220 }}
        />
        <label>
          <input type="checkbox" name="pendingOnly" value="1" defaultChecked={pendingOnly} /> {t(lang, "Only Pending", "仅看待处理")}
        </label>
        <label>
          <input type="checkbox" name="unsentOnly" value="1" defaultChecked={unsentOnly} /> {t(lang, "Only Unsent", "仅看未发送")}
        </label>
        <button type="submit">{t(lang, "Apply", "应用")}</button>
        <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>{t(lang, "Clear", "清除")}</a>
      </form>
      {payrollRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No sessions in this payroll period.", "当前计薪周期没有课次。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Teacher", "老师")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Cancelled+Charged", "取消但扣课时")}</th>
              <th align="left">{t(lang, "Completed", "已完成")}</th>
              <th align="left">{t(lang, "Pending", "未完成")}</th>
              <th align="left">{t(lang, "Hours", "课时")}</th>
              <th align="left">{t(lang, "Salary", "工资")}</th>
              <th align="left">{t(lang, "Workflow", "流程状态")}</th>
              <th align="left">{t(lang, "Detail", "详情")}</th>
              <th align="left">{t(lang, "Actions", "操作")}</th>
            </tr>
          </thead>
          <tbody>
            {payrollRows.map((row) => {
              const publish = publishMap.get(row.teacherId) ?? null;
              const managerAllConfirmed = publish
                ? areAllApproversConfirmed(publish.managerApprovedBy, roleConfig.managerApproverEmails)
                : false;
              return (
              <tr key={row.teacherId} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
                    {row.teacherName}
                  </a>
                </td>
                <td>{row.totalSessions}</td>
                <td style={{ color: row.chargedExcusedSessions > 0 ? "#9a3412" : "#64748b", fontWeight: 700 }}>{row.chargedExcusedSessions}</td>
                <td style={{ color: "#166534", fontWeight: 700 }}>{row.completedSessions}</td>
                <td style={{ color: row.pendingSessions > 0 ? "#b91c1c" : "#64748b", fontWeight: 700 }}>{row.pendingSessions}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.totalAmountCents)}</td>
                <td>
                  {!publish ? (
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#475569" }}>
                      {t(lang, "Not sent", "未发送")}
                    </span>
                  ) : (
                    <>
                      <div>{t(lang, "Teacher", "老师")}: {publish.confirmedAt ? t(lang, "Confirmed", "已确认") : t(lang, "Pending", "待确认")}</div>
                      <div>{t(lang, "Manager", "管理")}: {managerAllConfirmed ? t(lang, "Confirmed", "已确认") : `${publish.managerApprovedBy.length}/${roleConfig.managerApproverEmails.length}`}</div>
                      <div>{t(lang, "Finance Confirm", "财务确认")}: {publish.financeConfirmedAt ? t(lang, "Done", "已完成") : t(lang, "Pending", "待处理")}</div>
                      <div>{t(lang, "Finance Paid", "财务发薪")}: {publish.financePaidAt ? t(lang, "Done", "已完成") : t(lang, "Pending", "待处理")}</div>
                      {publish.financeRejectedAt ? (
                        <div style={{ color: "#b91c1c" }}>
                          {t(lang, "Finance Rejected", "财务驳回")}: {publish.financeRejectReason ?? "-"}
                        </div>
                      ) : null}
                    </>
                  )}
                </td>
                <td>
                  <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
                    {t(lang, "Open", "打开")}
                  </a>
                </td>
                <td>
                  <details>
                    <summary style={{ cursor: "pointer" }}>{t(lang, "Open Actions", "展开操作")}</summary>
                    <div style={{ display: "grid", gap: 6, justifyItems: "start", marginTop: 6 }}>
                    {!isFinanceOnlyUser && (!publish?.financePaidAt || canEditApprovalConfig) ? (
                      <form action={sendPayrollAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="teacherId" value={row.teacherId} />
                        <button type="submit">{publish ? t(lang, "Resend", "重新发送") : t(lang, "Send", "发送")}</button>
                      </form>
                    ) : null}
                    {!isFinanceOnlyUser && publish && (!publish.financePaidAt || canEditApprovalConfig) ? (
                      <form action={revokePayrollAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="teacherId" value={row.teacherId} />
                        <button type="submit">{t(lang, "Revoke", "撤销发送")}</button>
                      </form>
                    ) : null}
                    {publish && isManagerApprover && publish.confirmedAt && !managerAllConfirmed ? (
                      <form action={managerApprovePayrollAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="teacherId" value={row.teacherId} />
                        <button type="submit">{t(lang, "Manager Approve", "管理审批")}</button>
                      </form>
                    ) : null}
                    {publish && isFinanceApprover && managerAllConfirmed && !publish.financeConfirmedAt ? (
                      <form action={financeApprovePayrollAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="teacherId" value={row.teacherId} />
                        <button type="submit">{t(lang, "Finance Confirm", "财务确认")}</button>
                      </form>
                    ) : null}
                    {publish && isFinanceApprover && Boolean(publish.financeConfirmedAt) && !publish.financePaidAt ? (
                      <form action={financeMarkPaidPayrollAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="teacherId" value={row.teacherId} />
                        <button type="submit">{t(lang, "Mark Paid", "标记已发薪")}</button>
                      </form>
                    ) : null}
                    {publish && isFinanceApprover && Boolean(publish.financeConfirmedAt) ? (
                      <form action={financeRejectPayrollAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="teacherId" value={row.teacherId} />
                        <input
                          type="text"
                          name="rejectReason"
                          required
                          placeholder={t(lang, "Reject reason", "驳回原因")}
                          style={{ width: 180 }}
                        />
                        <button type="submit">{t(lang, "Finance Reject", "财务驳回")}</button>
                      </form>
                    ) : null}
                    </div>
                  </details>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      )}

      {!isFinanceOnlyUser ? <h3>{t(lang, "Rate Config (Teacher + Course)", "费率配置（老师 + 课程）")}</h3> : null}
      <div style={{ marginBottom: 10, color: "#666" }}>
        {t(
          lang,
          "If no matching rate is found, hourly rate defaults to 0.",
          "若没有匹配费率，默认课时费为 0。"
        )}
      </div>

      {!isFinanceOnlyUser && data.rateEditorRows.length === 0 ? (
        <div style={{ color: "#999" }}>{t(lang, "No editable rate rows.", "暂无可编辑费率项。")}</div>
      ) : null}
      {!isFinanceOnlyUser ? (
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
      ) : null}
    </div>
  );
}





