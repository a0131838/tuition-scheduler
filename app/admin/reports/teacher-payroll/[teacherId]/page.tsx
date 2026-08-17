import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { formatBusinessDateOnly, parseBusinessDateStart } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import {
  clearTeacherPayrollSessionOverride,
  loadTeacherPayrollAdministration,
  saveTeacherEmploymentTerm,
  saveTeacherPayrollNote,
  saveTeacherPayrollSessionOverride,
  TEACHER_EMPLOYMENT_TYPES,
  TEACHER_LESSON_PAY_MODES,
} from "@/lib/teacher-employment-payroll";
import {
  formatComboLabel,
  formatMoneyCents,
  loadTeacherPayrollDetail,
  monthKey,
  parseMonth,
} from "@/lib/teacher-payroll";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../../_components/workbenchStyles";

function payrollDetailSectionLinkStyle(background: string, border: string) {
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

function payrollDetailHref(teacherId: string, month: string, scope: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ month, scope, ...(params ?? {}) });
  return `/admin/reports/teacher-payroll/${encodeURIComponent(teacherId)}?${query.toString()}`;
}

function parseEmploymentEndDate(value: string) {
  const start = parseBusinessDateStart(value);
  return start ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : null;
}

function employmentTypeLabel(lang: Awaited<ReturnType<typeof getLang>>, value: string) {
  if (value === "FULL_TIME") return t(lang, "Full-time employee", "全职员工");
  if (value === "CONTRACT") return t(lang, "Contract employee", "合同员工");
  return t(lang, "Part-time tutor", "兼职老师");
}

function lessonPayModeLabel(lang: Awaited<ReturnType<typeof getLang>>, value: string) {
  return value === "INCLUDED_IN_SALARY"
    ? t(lang, "Included in monthly salary", "已含在全职月薪")
    : t(lang, "Separately payable", "单独计薪");
}

async function saveEmploymentTermAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const scope = String(formData.get("scope") ?? "all") === "completed" ? "completed" : "all";
  if (user.role === "FINANCE") redirect(payrollDetailHref(teacherId, month, scope, { error: "employment-permission" }));
  const effectiveFrom = parseBusinessDateStart(String(formData.get("effectiveFrom") ?? ""));
  const effectiveToRaw = String(formData.get("effectiveTo") ?? "").trim();
  const effectiveTo = effectiveToRaw ? parseEmploymentEndDate(effectiveToRaw) : null;
  if (!teacherId || !parseMonth(month) || !effectiveFrom || (effectiveToRaw && !effectiveTo)) {
    redirect(payrollDetailHref(teacherId, month, scope, { error: "employment-input" }));
  }
  try {
    const saved = await saveTeacherEmploymentTerm({
      id: String(formData.get("employmentTermId") ?? "").trim() || null,
      teacherId,
      employmentType: String(formData.get("employmentType") ?? "PART_TIME"),
      lessonPayMode: String(formData.get("lessonPayMode") ?? "SEPARATELY_PAYABLE"),
      effectiveFrom,
      effectiveTo,
      note: String(formData.get("note") ?? ""),
      actorEmail: user.email,
    });
    await logAudit({
      actor: user,
      module: "teacher-payroll",
      action: "SAVE_EMPLOYMENT_TERM",
      entityType: "TeacherEmploymentTerm",
      entityId: saved.id,
      meta: { teacherId, effectiveFrom: effectiveFrom.toISOString(), effectiveTo: effectiveTo?.toISOString() ?? null },
    });
  } catch {
    redirect(payrollDetailHref(teacherId, month, scope, { error: "employment-overlap" }));
  }
  revalidatePath("/admin/reports/teacher-payroll");
  revalidatePath(`/admin/reports/teacher-payroll/${teacherId}`);
  redirect(payrollDetailHref(teacherId, month, scope, { employmentSaved: "1" }));
}

async function savePayrollNoteAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const scope = String(formData.get("scope") ?? "all") === "completed" ? "completed" : "all";
  if (!teacherId || !parseMonth(month)) redirect(payrollDetailHref(teacherId, month, scope, { error: "note-input" }));
  const note = String(formData.get("payrollNote") ?? "");
  const saved = await saveTeacherPayrollNote({ teacherId, month, note, actorEmail: user.email });
  await logAudit({
    actor: user,
    module: "teacher-payroll",
    action: "SAVE_PAYROLL_NOTE",
    entityType: "TeacherPayrollNote",
    entityId: saved?.id ?? `${teacherId}:${month}`,
    meta: { teacherId, month, cleared: !note.trim() },
  });
  revalidatePath(`/admin/reports/teacher-payroll/${teacherId}`);
  redirect(payrollDetailHref(teacherId, month, scope, { noteSaved: "1" }));
}

async function saveSessionPayOverrideAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const scope = String(formData.get("scope") ?? "all") === "completed" ? "completed" : "all";
  if (user.role === "FINANCE") redirect(payrollDetailHref(teacherId, month, scope, { error: "override-permission" }));
  try {
    const saved = await saveTeacherPayrollSessionOverride({
      teacherId,
      sessionId,
      payMode: String(formData.get("payMode") ?? "SEPARATELY_PAYABLE"),
      reason: String(formData.get("reason") ?? ""),
      actorEmail: user.email,
    });
    await logAudit({
      actor: user,
      module: "teacher-payroll",
      action: "SAVE_SESSION_PAY_OVERRIDE",
      entityType: "TeacherPayrollSessionOverride",
      entityId: saved.id,
      meta: { teacherId, sessionId, payMode: saved.payMode, reason: saved.reason },
    });
  } catch {
    redirect(payrollDetailHref(teacherId, month, scope, { error: "override-input" }));
  }
  revalidatePath("/admin/reports/teacher-payroll");
  revalidatePath(`/admin/reports/teacher-payroll/${teacherId}`);
  redirect(payrollDetailHref(teacherId, month, scope, { overrideSaved: "1" }));
}

async function clearSessionPayOverrideAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const teacherId = String(formData.get("teacherId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const scope = String(formData.get("scope") ?? "all") === "completed" ? "completed" : "all";
  if (user.role === "FINANCE") redirect(payrollDetailHref(teacherId, month, scope, { error: "override-permission" }));
  await clearTeacherPayrollSessionOverride({ teacherId, sessionId });
  await logAudit({
    actor: user,
    module: "teacher-payroll",
    action: "CLEAR_SESSION_PAY_OVERRIDE",
    entityType: "Session",
    entityId: sessionId,
    meta: { teacherId, sessionId },
  });
  revalidatePath("/admin/reports/teacher-payroll");
  revalidatePath(`/admin/reports/teacher-payroll/${teacherId}`);
  redirect(payrollDetailHref(teacherId, month, scope, { overrideCleared: "1" }));
}

export default async function TeacherPayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>;
  searchParams?: Promise<{
    month?: string;
    scope?: string;
    pendingOnly?: string;
    fallbackOnly?: string;
    chargedOnly?: string;
    employmentSaved?: string;
    noteSaved?: string;
    overrideSaved?: string;
    overrideCleared?: string;
    error?: string;
  }>;
}) {
  const admin = await requireAdmin();
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

  const administration = await loadTeacherPayrollAdministration(p.teacherId, month);
  const canManageEmployment = admin.role !== "FINANCE";

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
  const includedInSalaryCount = data.sessionRows.filter(
    (row) => row.paymentTreatment.payMode === "INCLUDED_IN_SALARY",
  ).length;
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
      <section style={workbenchHeroStyle("indigo")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca" }}>{t(lang, "Teacher payroll detail", "老师工资明细")}</div>
          <h2 style={{ margin: 0 }}>
            {t(lang, "Teacher Payroll Detail", "老师工资明细")} - {data.teacher.name}
          </h2>
          <div style={{ color: "#475569", maxWidth: 920 }}>
            {t(
              lang,
              "Use this page to verify one teacher's payroll period, then inspect combo-level totals and session-level exceptions before returning to the main payroll desk.",
              "这里用于核对单个老师的工资周期，再查看组合汇总和课次异常，确认后再回到工资工作台。"
            )}
          </div>
          <div>
            <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>{t(lang, "Back to payroll desk", "返回工资工作台")}</a>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Sessions", "课次数")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{data.totalSessions}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("blue"), background: "#eff6ff" }}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Total hours", "总课时")}</div>
            <div style={{ ...workbenchMetricValueStyle("blue"), fontSize: 18 }}>{data.totalHours}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle(pendingCount > 0 ? "amber" : "emerald"), background: pendingCount > 0 ? "#fff7ed" : "#f0fdf4" }}>
            <div style={workbenchMetricLabelStyle(pendingCount > 0 ? "amber" : "emerald")}>{t(lang, "Pending", "未完成")}</div>
            <div style={workbenchMetricValueStyle(pendingCount > 0 ? "amber" : "emerald")}>{pendingCount}</div>
          </div>
          <div style={workbenchMetricCardStyle(fallbackCount > 0 ? "rose" : "slate")}>
            <div style={workbenchMetricLabelStyle(fallbackCount > 0 ? "rose" : "slate")}>{t(lang, "Fallback-rate rows", "费率回退")}</div>
            <div style={workbenchMetricValueStyle(fallbackCount > 0 ? "rose" : "slate")}>{fallbackCount}</div>
          </div>
        </div>
      </section>

      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 5,
          marginBottom: 12,
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
          <div style={{ fontWeight: 800 }}>{t(lang, "Payroll detail map", "工资明细地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Start with the month and detail filters, then scan combo summary before opening session-level rows.", "建议先切月份和明细筛选，再看组合汇总，最后深入到逐课次明细。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#payroll-detail-filters" style={payrollDetailSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Filters", "筛选区")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Change month, scope, and detail toggles", "切月份、口径和明细开关")}</span>
          </a>
          <a href="#payroll-detail-combos" style={payrollDetailSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Combo summary", "组合汇总")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Review hourly-rate combinations first", "先看组合层汇总")}</span>
          </a>
          <a href="#payroll-detail-sessions" style={payrollDetailSectionLinkStyle("#fff7ed", "#fdba74")}>
            <strong>{t(lang, "Session rows", "课次明细")}</strong>
            <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Inspect pending, fallback, or charged exceptions", "查看未完成、费率回退或计薪异常")}</span>
          </a>
        </div>
      </section>

      <form id="payroll-detail-filters" method="GET" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
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

      {sp?.employmentSaved || sp?.noteSaved || sp?.overrideSaved || sp?.overrideCleared ? (
        <div style={{ marginBottom: 12, padding: "9px 11px", border: "1px solid #86efac", borderRadius: 8, background: "#f0fdf4", color: "#166534" }}>
          {t(lang, "Payroll settings saved.", "工资设置已保存。")}
        </div>
      ) : null}
      {sp?.error ? (
        <div style={{ marginBottom: 12, padding: "9px 11px", border: "1px solid #fca5a5", borderRadius: 8, background: "#fef2f2", color: "#b91c1c" }}>
          {sp.error === "employment-overlap"
            ? t(lang, "Employment periods cannot overlap. Check the effective dates and try again.", "任职期间不能重叠，请检查生效日期后重试。")
            : sp.error.includes("permission")
              ? t(lang, "Finance can add payroll notes but cannot change employment or per-session pay treatment.", "财务可以填写工资备注，但不能修改任职状态或逐课计薪方式。")
              : t(lang, "The payroll setting could not be saved. Check all required fields.", "工资设置未能保存，请检查必填项。")}
        </div>
      ) : null}

      <section style={{ marginBottom: 16, padding: 14, border: "1px solid #bfdbfe", borderRadius: 10, background: "#f8fbff", display: "grid", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t(lang, "Employment and lesson-pay treatment", "任职与课次计薪方式")}</h3>
          <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              "Effective dates preserve historical payroll. Full-time lessons remain visible, but their payable amount is zero unless management records a session exception.",
              "生效日期用于保留历史工资。全职课次仍会显示，但应付金额为零；如需单独计薪，须由管理为具体课次登记例外。",
            )}
          </div>
        </div>
        {administration.terms.length === 0 ? (
          <div style={{ color: "#64748b" }}>{t(lang, "No employment term recorded; hourly lesson pay applies.", "尚未登记任职期间，按课时费正常计薪。")}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {administration.terms.map((term) => (
              <form key={term.id} action={saveEmploymentTermAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, alignItems: "end", padding: 10, border: "1px solid #dbeafe", borderRadius: 8, background: "#fff" }}>
                <input type="hidden" name="teacherId" value={p.teacherId} />
                <input type="hidden" name="employmentTermId" value={term.id} />
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="scope" value={scope} />
                <label style={{ display: "grid", gap: 4 }}>
                  <span>{t(lang, "Employment type", "任职类型")}</span>
                  <select name="employmentType" defaultValue={term.employmentType} disabled={!canManageEmployment}>
                    {TEACHER_EMPLOYMENT_TYPES.map((value) => <option key={value} value={value}>{employmentTypeLabel(lang, value)}</option>)}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>{t(lang, "Lesson pay", "课次计薪")}</span>
                  <select name="lessonPayMode" defaultValue={term.lessonPayMode} disabled={!canManageEmployment}>
                    {TEACHER_LESSON_PAY_MODES.map((value) => <option key={value} value={value}>{lessonPayModeLabel(lang, value)}</option>)}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>{t(lang, "Effective from", "生效日期")}</span>
                  <input name="effectiveFrom" type="date" defaultValue={formatBusinessDateOnly(term.effectiveFrom)} disabled={!canManageEmployment} required />
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span>{t(lang, "Effective through (optional)", "有效至（可选）")}</span>
                  <input name="effectiveTo" type="date" defaultValue={term.effectiveTo ? formatBusinessDateOnly(new Date(term.effectiveTo.getTime() - 1)) : ""} disabled={!canManageEmployment} />
                </label>
                <label style={{ display: "grid", gap: 4, gridColumn: "span 2" }}>
                  <span>{t(lang, "Internal basis", "内部依据")}</span>
                  <input name="note" defaultValue={term.note ?? ""} disabled={!canManageEmployment} placeholder={t(lang, "e.g. Full-time start confirmed by management", "例如：管理确认的全职入职日")} />
                </label>
                {canManageEmployment ? <button type="submit">{t(lang, "Save employment term", "保存任职期间")}</button> : null}
              </form>
            ))}
          </div>
        )}
        {canManageEmployment ? (
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>{t(lang, "Add a new employment term", "新增任职期间")}</summary>
            <form action={saveEmploymentTermAction} style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, alignItems: "end" }}>
              <input type="hidden" name="teacherId" value={p.teacherId} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <label style={{ display: "grid", gap: 4 }}>
                <span>{t(lang, "Employment type", "任职类型")}</span>
                <select name="employmentType" defaultValue="FULL_TIME">
                  {TEACHER_EMPLOYMENT_TYPES.map((value) => <option key={value} value={value}>{employmentTypeLabel(lang, value)}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>{t(lang, "Lesson pay", "课次计薪")}</span>
                <select name="lessonPayMode" defaultValue="INCLUDED_IN_SALARY">
                  {TEACHER_LESSON_PAY_MODES.map((value) => <option key={value} value={value}>{lessonPayModeLabel(lang, value)}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>{t(lang, "Effective from", "生效日期")}</span>
                <input name="effectiveFrom" type="date" required />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>{t(lang, "Effective through (optional)", "有效至（可选）")}</span>
                <input name="effectiveTo" type="date" />
              </label>
              <label style={{ display: "grid", gap: 4, gridColumn: "span 2" }}>
                <span>{t(lang, "Internal basis", "内部依据")}</span>
                <input name="note" required />
              </label>
              <button type="submit">{t(lang, "Add employment term", "新增任职期间")}</button>
            </form>
          </details>
        ) : null}
      </section>

      <section style={{ marginBottom: 16, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", display: "grid", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t(lang, "Payroll note for this month", "本月工资备注")}</h3>
          <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
            {t(lang, "Use this for payroll explanation only. It does not create or replace academic lesson feedback.", "这里只记录工资说明，不会生成或替代老师的课后反馈。")}
          </div>
        </div>
        <form action={savePayrollNoteAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="teacherId" value={p.teacherId} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="scope" value={scope} />
          <textarea name="payrollNote" rows={3} defaultValue={administration.note?.note ?? ""} placeholder={t(lang, "Example: Full-time from 10 Aug 2026; lessons from that date are included in monthly salary.", "例如：2026年8月10日起转为全职，该日起课次已含在月薪中。")}/>
          <button type="submit">{t(lang, "Save payroll note", "保存工资备注")}</button>
        </form>
      </section>

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
        <div>
          <b>{t(lang, "Included in monthly salary", "已含在全职月薪")}</b>: {includedInSalaryCount} {t(lang, "session(s)", "节课")}
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

      <h3 id="payroll-detail-combos">{t(lang, "Combo Summary", "课程组合汇总")}</h3>
      {filteredComboRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No data in this period.", "当前周期无数据。")}</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
              <th align="left">{t(lang, "Sessions", "课次数")}</th>
              <th align="left">{t(lang, "Cancelled+Charged", "取消但扣课时")}</th>
              <th align="left">{t(lang, "Included in salary", "已含月薪")}</th>
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
                <td style={{ color: row.includedInSalarySessions > 0 ? "#1d4ed8" : "#64748b", fontWeight: 700 }}>{row.includedInSalarySessions}</td>
                <td>{row.totalHours}</td>
                <td>{formatMoneyCents(row.hourlyRateCents, row.currencyCode)}</td>
                <td>{formatMoneyCents(row.amountCents, row.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 id="payroll-detail-sessions">{t(lang, "Session Details", "逐课次明细")}</h3>
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
                  <div style={{ display: "grid", gap: 5 }}>
                    {row.isChargedExcused ? <span style={{ color: "#9a3412", fontWeight: 700 }}>{t(lang, "Cancelled+Charged", "取消但扣课时")}</span> : null}
                    <span style={{ color: row.paymentTreatment.payMode === "INCLUDED_IN_SALARY" ? "#1d4ed8" : "#166534", fontWeight: 700 }}>
                      {lessonPayModeLabel(lang, row.paymentTreatment.payMode)}
                    </span>
                    {row.paymentTreatment.source === "SESSION_OVERRIDE" ? (
                      <span style={{ color: "#7c3aed", fontSize: 12 }}>{t(lang, "Session exception", "逐课例外")}: {row.paymentTreatment.reason}</span>
                    ) : null}
                    {canManageEmployment ? (
                      <details>
                        <summary style={{ cursor: "pointer", fontSize: 12 }}>{t(lang, "Manage session pay", "管理逐课计薪")}</summary>
                        <form action={saveSessionPayOverrideAction} style={{ marginTop: 6, display: "grid", gap: 6, minWidth: 220 }}>
                          <input type="hidden" name="teacherId" value={p.teacherId} />
                          <input type="hidden" name="sessionId" value={row.sessionId} />
                          <input type="hidden" name="month" value={month} />
                          <input type="hidden" name="scope" value={scope} />
                          <select name="payMode" defaultValue={row.paymentTreatment.payMode}>
                            {TEACHER_LESSON_PAY_MODES.map((value) => <option key={value} value={value}>{lessonPayModeLabel(lang, value)}</option>)}
                          </select>
                          <input name="reason" defaultValue={row.paymentTreatment.source === "SESSION_OVERRIDE" ? row.paymentTreatment.reason ?? "" : ""} required placeholder={t(lang, "Required exception reason", "必填例外原因")} />
                          <button type="submit">{t(lang, "Save exception", "保存例外")}</button>
                        </form>
                        {row.paymentTreatment.overrideId ? (
                          <form action={clearSessionPayOverrideAction} style={{ marginTop: 6 }}>
                            <input type="hidden" name="teacherId" value={p.teacherId} />
                            <input type="hidden" name="sessionId" value={row.sessionId} />
                            <input type="hidden" name="month" value={month} />
                            <input type="hidden" name="scope" value={scope} />
                            <button type="submit">{t(lang, "Clear exception", "清除例外")}</button>
                          </form>
                        ) : null}
                      </details>
                    ) : null}
                  </div>
                </td>
                <td>
                  <span style={{ color: row.isCompleted ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                    {row.isCompleted ? t(lang, "Completed", "已完成") : t(lang, "Pending", "未完成")}
                  </span>
                </td>
                <td style={{ color: row.isCompleted ? "#64748b" : "#b45309", fontWeight: row.isCompleted ? 400 : 700 }}>
                  {row.isCompleted ? "-" : pendingReasonLabel(lang, row.pendingReason)}
                </td>
                <td>
                  <div>{formatMoneyCents(row.amountCents, row.currencyCode)}</div>
                  {row.amountCents !== row.contractualAmountCents ? (
                    <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Hourly equivalent", "原课时费折算")}: {formatMoneyCents(row.contractualAmountCents, row.currencyCode)}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
