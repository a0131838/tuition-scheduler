import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { areAllApproversConfirmed, getApprovalRoleConfig, isRoleApprover, saveApprovalRoleConfig } from "@/lib/approval-flow";
import { getLang, t } from "@/lib/i18n";
import WorkflowSourceBanner from "@/app/admin/_components/WorkflowSourceBanner";
import RestoreRateConfigScroll from "@/app/admin/reports/teacher-payroll/RestoreRateConfigScroll";
import {
  financeConfirmTeacherPayroll,
  financeMarkTeacherPayrollPaid,
  financeRejectTeacherPayroll,
  formatComboLabel,
  formatMoneyCents,
  formatTeachingModeLabel,
  getTeacherPayrollPublishStatus,
  loadTeacherPayroll,
  managerApproveTeacherPayroll,
  markTeacherPayrollSent,
  monthKey,
  normalizePayrollCurrencyCode,
  normalizePayrollTeachingMode,
  type PayrollCurrencyCode,
  PAYROLL_CURRENCY_CODES,
  PAYROLL_TEACHING_MODES,
  parseMonth,
  revokeTeacherPayrollSent,
  upsertTeacherPayrollRate,
} from "@/lib/teacher-payroll";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "../../_components/workbenchStyles";

function payrollSectionLinkStyle(background: string, border: string) {
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
const PERIOD_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const APPROVAL_CONFIG_OWNER_EMAIL = "zhaohongwei0880@gmail.com";
type WorkflowChipState = "done" | "pending" | "blocked" | "rejected";

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
  const q = typeof formData.get("q") === "string" ? String(formData.get("q")) : "";
  const pendingOnly = typeof formData.get("pendingOnly") === "string" ? String(formData.get("pendingOnly")) === "1" : false;
  const unsentOnly = typeof formData.get("unsentOnly") === "string" ? String(formData.get("unsentOnly")) === "1" : false;
  const rateMissingOnly = typeof formData.get("rateMissingOnly") === "string" ? String(formData.get("rateMissingOnly")) === "1" : false;
  const teacherId = typeof formData.get("teacherId") === "string" ? String(formData.get("teacherId")) : "";
  const courseId = typeof formData.get("courseId") === "string" ? String(formData.get("courseId")) : "";
  const subjectId = normalizeOptionalId(formData.get("subjectId"));
  const levelId = normalizeOptionalId(formData.get("levelId"));
  const teachingModeRaw = typeof formData.get("teachingMode") === "string" ? String(formData.get("teachingMode")) : "ONE_ON_ONE";
  const hourlyRateRaw = typeof formData.get("hourlyRate") === "string" ? String(formData.get("hourlyRate")) : "0";
  const currencyCodeRaw = typeof formData.get("currencyCode") === "string" ? String(formData.get("currencyCode")) : "SGD";

  const hourlyRate = Number(hourlyRateRaw);
  if (!teacherId || !courseId || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=rate`);
  }

  const hourlyRateCents = Math.round(hourlyRate * 100);
  const currencyCode = normalizePayrollCurrencyCode(currencyCodeRaw);
  const teachingMode = normalizePayrollTeachingMode(teachingModeRaw);
  await upsertTeacherPayrollRate({
    teacherId,
    courseId,
    subjectId,
    levelId,
    teachingMode,
    hourlyRateCents,
    currencyCode,
  });

  revalidatePath("/admin/reports/teacher-payroll");
  const params = new URLSearchParams({
    month,
    scope,
    saved: "1",
    savedTeacherId: teacherId,
    savedCourseId: courseId,
    savedSubjectId: subjectId ?? "",
    savedLevelId: levelId ?? "",
    savedTeachingMode: teachingMode,
  });
  if (q.trim()) params.set("q", q);
  if (pendingOnly) params.set("pendingOnly", "1");
  if (unsentOnly) params.set("unsentOnly", "1");
  if (rateMissingOnly) params.set("rateMissingOnly", "1");
  redirect(`/admin/reports/teacher-payroll?${params.toString()}#rate-config`);
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

async function financeBatchMarkPaidPayrollAction(formData: FormData) {
  "use server";
  const user = await requireAdmin();
  const month = typeof formData.get("month") === "string" ? String(formData.get("month")) : monthKey(new Date());
  const scope = typeof formData.get("scope") === "string" && String(formData.get("scope")) === "completed" ? "completed" : "all";
  const cfg = await getApprovalRoleConfig();
  if (!isRoleApprover(user.email, cfg.financeApproverEmails)) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-perm`);
  }
  const teacherIds = formData
    .getAll("teacherIds")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (teacherIds.length === 0) {
    redirect(`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&error=fin-batch-empty`);
  }

  let successCount = 0;
  let failedCount = 0;
  for (const teacherId of teacherIds) {
    const ok = await financeMarkTeacherPayrollPaid({ teacherId, month, scope, financeEmail: user.email });
    if (ok) successCount += 1;
    else failedCount += 1;
  }

  revalidatePath("/admin/reports/teacher-payroll");
  redirect(
    `/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}&batchpaid=${encodeURIComponent(String(successCount))}&batchfail=${encodeURIComponent(String(failedCount))}`
  );
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
    batchpaid?: string;
    batchfail?: string;
    fincfm?: string;
    finrej?: string;
    error?: string;
    q?: string;
    pendingOnly?: string;
    unsentOnly?: string;
    rateMissingOnly?: string;
    focusTeacherId?: string;
    source?: string;
    sourceFocus?: string;
    savedTeacherId?: string;
    savedCourseId?: string;
    savedSubjectId?: string;
    savedLevelId?: string;
    savedTeachingMode?: string;
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
  const rateMissingOnly = sp?.rateMissingOnly === "1";
  const focusTeacherId = String(sp?.focusTeacherId ?? "").trim();
  const sourceWorkflow = String(sp?.source ?? "").trim().toLowerCase() === "approvals" ? "approvals" : "";
  const sourceFocus = String(sp?.sourceFocus ?? "").trim().toLowerCase();
  const approvalInboxReturnHref =
    sourceWorkflow === "approvals"
      ? sourceFocus && sourceFocus !== "all"
        ? `/admin/approvals?focus=${encodeURIComponent(sourceFocus)}`
        : "/admin/approvals"
      : "";
  const approvalInboxFocusLabel =
    sourceFocus === "manager"
      ? t(lang, "Manager approvals", "管理审批")
      : sourceFocus === "finance"
        ? t(lang, "Finance approvals", "财务审批")
        : sourceFocus === "expense"
          ? t(lang, "Expense approvals", "报销审批")
          : sourceFocus === "overdue"
            ? t(lang, "Overdue approvals", "超时审批")
            : t(lang, "Approval inbox", "审批提醒中心");
  const savedTeacherId = String(sp?.savedTeacherId ?? "");
  const savedCourseId = String(sp?.savedCourseId ?? "");
  const savedSubjectId = typeof sp?.savedSubjectId === "string" ? sp.savedSubjectId : "";
  const savedLevelId = typeof sp?.savedLevelId === "string" ? sp.savedLevelId : "";
  const savedTeachingMode = typeof sp?.savedTeachingMode === "string" ? normalizePayrollTeachingMode(sp.savedTeachingMode) : null;
  const cfgSaved = sp?.cfg === "1";
  const mgrDone = sp?.mgr === "1";
  const finPaidDone = sp?.finpaid === "1";
  const batchPaidCount = Number(sp?.batchpaid ?? "0");
  const batchFailedCount = Number(sp?.batchfail ?? "0");
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
  const shownPending = payrollRows.reduce((sum, row) => sum + row.pendingSessions, 0);
  const shownCompleted = payrollRows.reduce((sum, row) => sum + row.completedSessions, 0);
  const shownCurrencyMap = new Map<PayrollCurrencyCode, number>();
  for (const row of payrollRows) {
    for (const item of row.currencyTotals) {
      shownCurrencyMap.set(item.currencyCode, (shownCurrencyMap.get(item.currencyCode) ?? 0) + item.amountCents);
    }
  }
  const shownCurrencyTotals = Array.from(shownCurrencyMap.entries())
    .map(([currencyCode, amountCents]) => ({ currencyCode, amountCents }))
    .sort((a, b) => String(a.currencyCode).localeCompare(String(b.currencyCode)));
  const exportParams = new URLSearchParams();
  exportParams.set("month", month);
  exportParams.set("scope", scope);
  if (q) exportParams.set("q", q);
  if (pendingOnly) exportParams.set("pendingOnly", "1");
  if (unsentOnly) exportParams.set("unsentOnly", "1");
  const exportCsvHref = `/admin/reports/teacher-payroll/export?${exportParams.toString()}`;
  const missingRateTeacherSet = new Set(
    data.rateEditorRows.filter((r) => r.hourlyRateCents <= 0).map((r) => r.teacherId)
  );
  const unconfiguredRateCount = data.rateEditorRows.filter((r) => r.hourlyRateCents <= 0).length;
  const fallbackRateCount = data.rateEditorRows.filter((r) => r.usesFallbackRate).length;
  const rateRows = rateMissingOnly
    ? data.rateEditorRows.filter((r) => r.hourlyRateCents <= 0)
    : data.rateEditorRows;
  const savedRateRowKey = saved && savedTeacherId && savedCourseId && savedTeachingMode
    ? `rate-${savedTeacherId}-${savedCourseId}-${savedSubjectId || "-"}-${savedLevelId || "-"}-${savedTeachingMode}`
    : null;
  const payrollTableHeaderCellStyle = {
    position: "sticky" as const,
    top: 0,
    background: "#f8fafc",
    zIndex: 5,
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap" as const,
  };
  const payrollTableFirstColHeaderStyle = {
    ...payrollTableHeaderCellStyle,
    left: 0,
    zIndex: 7,
    borderRight: "1px solid #e2e8f0",
  };
  const payrollTableFirstColCellStyle = {
    position: "sticky" as const,
    left: 0,
    background: "#fff",
    zIndex: 2,
    borderRight: "1px solid #f1f5f9",
    whiteSpace: "nowrap" as const,
  };
  const workflowChipStyle = (state: WorkflowChipState) => {
    if (state === "done") return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
    if (state === "pending") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
    if (state === "rejected") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
    return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
  };
  const buildPayrollPageHref = (teacherId?: string | null) => {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("scope", scope);
    if (q) params.set("q", q);
    if (pendingOnly) params.set("pendingOnly", "1");
    if (unsentOnly) params.set("unsentOnly", "1");
    if (rateMissingOnly) params.set("rateMissingOnly", "1");
    if (sourceWorkflow) params.set("source", sourceWorkflow);
    if (sourceFocus) params.set("sourceFocus", sourceFocus);
    if (teacherId) params.set("focusTeacherId", teacherId);
    return `/admin/reports/teacher-payroll?${params.toString()}`;
  };
  const workflowRows = payrollRows.map((row) => {
    const publish = publishMap.get(row.teacherId) ?? null;
    const managerAllConfirmed = publish
      ? areAllApproversConfirmed(publish.managerApprovedBy, roleConfig.managerApproverEmails)
      : false;
    const teacherState: WorkflowChipState = publish?.confirmedAt ? "done" : "pending";
    const managerState: WorkflowChipState = !publish?.confirmedAt ? "blocked" : managerAllConfirmed ? "done" : "pending";
    const financeConfirmState: WorkflowChipState =
      !publish?.confirmedAt || !managerAllConfirmed ? "blocked" : publish.financeConfirmedAt ? "done" : "pending";
    const financePaidState: WorkflowChipState = !publish?.financeConfirmedAt
      ? "blocked"
      : publish.financePaidAt
        ? "done"
        : "pending";
    let queueKey: "send" | "manager" | "financeConfirm" | "financePaid" | "teacherConfirm" | "done" = "done";
    let queueLabel = t(lang, "Completed workflow", "流程已完成");
    if (!publish) {
      queueKey = "send";
      queueLabel = t(lang, "Ready to send", "可发送");
    } else if (!publish.confirmedAt) {
      queueKey = "teacherConfirm";
      queueLabel = t(lang, "Waiting for teacher confirmation", "等待老师确认");
    } else if (!managerAllConfirmed) {
      queueKey = "manager";
      queueLabel = t(lang, "Waiting for manager approval", "等待管理审批");
    } else if (!publish.financeConfirmedAt) {
      queueKey = "financeConfirm";
      queueLabel = t(lang, "Waiting for finance confirmation", "等待财务确认");
    } else if (!publish.financePaidAt) {
      queueKey = "financePaid";
      queueLabel = t(lang, "Ready for finance payout", "可继续发薪");
    }
    return {
      row,
      publish,
      managerAllConfirmed,
      teacherState,
      managerState,
      financeConfirmState,
      financePaidState,
      queueKey,
      queueLabel,
    };
  });
  const teacherExceptionMap = new Map<
    string,
    {
      fallbackComboCount: number;
      chargedExcusedSessions: number;
    }
  >();
  for (const breakdownRow of data.breakdownRows) {
    const prev = teacherExceptionMap.get(breakdownRow.teacherId) ?? {
      fallbackComboCount: 0,
      chargedExcusedSessions: 0,
    };
    if (breakdownRow.usedRateFallback) prev.fallbackComboCount += 1;
    if (breakdownRow.chargedExcusedSessions > 0) prev.chargedExcusedSessions += breakdownRow.chargedExcusedSessions;
    teacherExceptionMap.set(breakdownRow.teacherId, prev);
  }
  const myQueueRows = workflowRows.filter((item) => {
    if (isFinanceOnlyUser) return item.queueKey === "financeConfirm" || item.queueKey === "financePaid";
    if (item.queueKey === "send" || item.queueKey === "manager") return true;
    if (isFinanceApprover && (item.queueKey === "financeConfirm" || item.queueKey === "financePaid")) return true;
    return false;
  });
  const financePayableQueueRows = myQueueRows.filter((item) => item.queueKey === "financePaid" && item.publish && isFinanceApprover);
  const financeCurrencyGroups = Array.from(
    financePayableQueueRows.reduce((map, item) => {
      for (const currencyItem of item.row.currencyTotals) {
        const exceptionInfo = teacherExceptionMap.get(item.row.teacherId);
        const hasIssue =
          item.row.pendingSessions > 0 ||
          (exceptionInfo?.fallbackComboCount ?? 0) > 0 ||
          (exceptionInfo?.chargedExcusedSessions ?? 0) > 0;
        const prev = map.get(currencyItem.currencyCode) ?? { teacherCount: 0, amountCents: 0, issueTeacherCount: 0, cleanTeacherCount: 0 };
        prev.teacherCount += 1;
        prev.amountCents += currencyItem.amountCents;
        if (hasIssue) prev.issueTeacherCount += 1;
        else prev.cleanTeacherCount += 1;
        map.set(currencyItem.currencyCode, prev);
      }
      return map;
    }, new Map<PayrollCurrencyCode, { teacherCount: number; amountCents: number; issueTeacherCount: number; cleanTeacherCount: number }>())
  )
    .map(([currencyCode, info]) => ({ currencyCode, ...info }))
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  const selectedWorkflowRow =
    workflowRows.find((item) => item.row.teacherId === focusTeacherId) ??
    myQueueRows[0] ??
    workflowRows[0] ??
    null;
  const renderSelectedActionArea = (item: (typeof workflowRows)[number] | null) => {
    if (!item) return null;
    const { row, publish, managerAllConfirmed, queueKey } = item;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
            {t(lang, "Open teacher detail", "打开老师详情")}
          </a>
          {queueKey === "send" && !isFinanceOnlyUser ? (
            <form action={sendPayrollAction}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="teacherId" value={row.teacherId} />
              <button type="submit">{t(lang, "Send payroll", "发送工资单")}</button>
            </form>
          ) : null}
          {queueKey === "manager" && publish && isManagerApprover && publish.confirmedAt && !managerAllConfirmed ? (
            <form action={managerApprovePayrollAction}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="teacherId" value={row.teacherId} />
              <button type="submit">{t(lang, "Manager approve", "管理审批")}</button>
            </form>
          ) : null}
          {queueKey === "financeConfirm" && publish && isFinanceApprover ? (
            <form action={financeApprovePayrollAction}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="teacherId" value={row.teacherId} />
              <button type="submit">{t(lang, "Finance confirm", "财务确认")}</button>
            </form>
          ) : null}
          {queueKey === "financePaid" && publish && isFinanceApprover ? (
            <form action={financeMarkPaidPayrollAction}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="teacherId" value={row.teacherId} />
              <button type="submit">{t(lang, "Record payout", "记录发薪")}</button>
            </form>
          ) : null}
        </div>
        {publish && isFinanceApprover && publish.financeConfirmedAt && !publish.financePaidAt ? (
          <details>
            <summary style={{ cursor: "pointer", color: "#b91c1c", fontWeight: 600 }}>
              {t(lang, "Finance reject", "财务驳回")}
            </summary>
            <form action={financeRejectPayrollAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="teacherId" value={row.teacherId} />
              <input
                type="text"
                name="rejectReason"
                required
                placeholder={t(lang, "Reject reason", "驳回原因")}
                style={{ minWidth: 220 }}
              />
              <button type="submit">{t(lang, "Confirm reject", "确认驳回")}</button>
            </form>
          </details>
        ) : null}
      </div>
    );
  };
  const renderSelectedTimeline = (item: (typeof workflowRows)[number] | null) => {
    if (!item?.publish) {
      return (
        <div style={{ color: "#64748b", fontSize: 13 }}>
          {t(lang, "Payroll has not been sent yet.", "工资单尚未发送。")}
        </div>
      );
    }
    const timelineItems = [
      { label: t(lang, "Sent", "已发送"), at: item.publish.sentAt },
      { label: t(lang, "Teacher confirmed", "老师已确认"), at: item.publish.confirmedAt },
      { label: t(lang, "Manager approved", "管理已审批"), at: item.publish.managerApprovedAt },
      { label: t(lang, "Finance confirmed", "财务已确认"), at: item.publish.financeConfirmedAt },
      { label: t(lang, "Finance paid", "财务已发薪"), at: item.publish.financePaidAt },
    ].filter((entry) => entry.at);
    if (item.publish.financeRejectedAt) {
      timelineItems.push({ label: t(lang, "Finance rejected", "财务已驳回"), at: item.publish.financeRejectedAt });
    }
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {timelineItems.map((entry) => (
          <div key={`${entry.label}-${entry.at}`} style={{ fontSize: 13, color: "#334155" }}>
            <strong>{entry.label}</strong>: {PERIOD_DATE_FMT.format(new Date(String(entry.at)))}
          </div>
        ))}
        {item.publish.financeRejectReason ? (
          <div style={{ fontSize: 13, color: "#991b1b" }}>
            <strong>{t(lang, "Reject reason", "驳回原因")}</strong>: {item.publish.financeRejectReason}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <RestoreRateConfigScroll targetId={savedRateRowKey} />
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>{t(lang, "Teacher payroll desk", "老师工资工作台")}</div>
          <h2 style={{ margin: 0 }}>{t(lang, "Teacher Payroll", "老师工资单")}</h2>
          <div style={{ color: "#475569", maxWidth: 940 }}>
            {t(
              lang,
              "Use this page to move payroll from sending to approvals to payout. Start with the work queue, then review rate gaps and approval roles below.",
              "这里用于把老师工资从发送、审批推进到发薪。建议先看待处理队列，再检查费率缺口和审批角色。"
            )}
          </div>
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <div style={workbenchMetricCardStyle("blue")}>
            <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Visible teachers", "当前老师数")}</div>
            <div style={workbenchMetricValueStyle("blue")}>{payrollRows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fff7ed" }}>
            <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Queue items", "待处理队列")}</div>
            <div style={workbenchMetricValueStyle("amber")}>{myQueueRows.length}</div>
          </div>
          <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fff7f7" }}>
            <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Rate gaps", "费率缺口")}</div>
            <div style={workbenchMetricValueStyle("rose")}>{unconfiguredRateCount}</div>
          </div>
          <div style={workbenchMetricCardStyle("indigo")}>
            <div style={workbenchMetricLabelStyle("indigo")}>{t(lang, "Pending sessions", "未完成课次")}</div>
            <div style={workbenchMetricValueStyle("indigo")}>{shownPending}</div>
          </div>
        </div>
      </section>
      <section
        style={{
          ...workbenchFilterPanelStyle,
          position: "sticky",
          top: 8,
          zIndex: 20,
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
          <div style={{ fontWeight: 800 }}>{t(lang, "Payroll map", "工资工作地图")}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {t(lang, "Set the payroll month first, then work through the queue, salary slips, rate table, and approval config in that order.", "建议先设工资月份，再依次处理待办队列、工资单、费率表和审批配置。")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="#payroll-controls" style={payrollSectionLinkStyle("#f8fafc", "#cbd5e1")}>
            <strong>{t(lang, "Month controls", "月份控制")}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>{t(lang, "Switch period and top-level filters", "切计薪周期和顶层筛选")}</span>
          </a>
          <a href="#salary-slips" style={payrollSectionLinkStyle("#eef2ff", "#c7d2fe")}>
            <strong>{t(lang, "Payroll queue", "工资单队列")}</strong>
            <span style={{ fontSize: 12, color: "#3730a3" }}>{t(lang, "Process the next teacher in line", "处理下一位老师")}</span>
          </a>
          {!isFinanceOnlyUser ? (
            <a href="#rate-config" style={payrollSectionLinkStyle("#fff7ed", "#fdba74")}>
              <strong>{t(lang, "Rate config", "费率配置")}</strong>
              <span style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Fill missing rate rows", "补齐缺失费率")}</span>
            </a>
          ) : null}
          {!isFinanceOnlyUser ? (
            <a href="#approval-config" style={payrollSectionLinkStyle("#f0fdf4", "#86efac")}>
              <strong>{t(lang, "Approval roles", "审批角色")}</strong>
              <span style={{ fontSize: 12, color: "#166534" }}>{t(lang, "Check manager and finance approvers", "核对管理和财务审批人")}</span>
            </a>
          ) : null}
        </div>
      </section>
      <div
        id="payroll-controls"
        style={{
          position: "sticky",
          top: 118,
          zIndex: 20,
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          background: "#f8fafc",
          boxShadow: "0 1px 6px rgba(15, 23, 42, 0.08)",
        }}
      >
        <form method="GET" style={{ display: "grid", gap: 10 }}>
          {sourceWorkflow ? <input type="hidden" name="source" value={sourceWorkflow} /> : null}
          {sourceFocus ? <input type="hidden" name="sourceFocus" value={sourceFocus} /> : null}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
          </div>
          <div style={{ fontSize: 13, color: "#334155" }}>
            <b>{t(lang, "Current payroll period", "当前计薪周期")}</b>: {periodText}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a href="#salary-slips">{t(lang, "Jump to payroll queue", "跳到工资单队列")}</a>
            {!isFinanceOnlyUser ? <a href="#rate-config">{t(lang, "Jump to rate table", "跳到费率表")}</a> : null}
            {!isFinanceOnlyUser ? <a href="#approval-config">{t(lang, "Jump to approval roles", "跳到审批角色")}</a> : null}
          </div>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>{t(lang, "How this payroll cycle works", "本次工资周期说明")}</summary>
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
      {sourceWorkflow === "approvals" ? (
        <WorkflowSourceBanner
          tone="indigo"
          title={t(lang, "Opened from Approval Inbox", "来自审批提醒中心")}
          description={t(
            lang,
            "Handle this teacher payroll item here, then return to the approval list to continue triage.",
            "在这里处理这条老师工资审批，然后回到审批提醒中心继续处理其他待办。"
          )}
          primaryHref={approvalInboxReturnHref || "/admin/approvals"}
          primaryLabel={t(lang, "Back to approval inbox", "返回审批提醒中心")}
          meta={
            <span>
              {t(lang, "Previous filter", "原筛选")}: {approvalInboxFocusLabel}
            </span>
          }
        />
      ) : null}
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
      {Number.isFinite(batchPaidCount) && batchPaidCount > 0 ? (
        <div style={{ marginBottom: 12, color: "#166534" }}>
          {t(lang, "Batch payout recorded for", "已记录批量发薪")} {batchPaidCount} {t(lang, "teachers.", "位老师。")}
          {Number.isFinite(batchFailedCount) && batchFailedCount > 0 ? ` ${t(lang, "Failed items", "失败条目")} ${batchFailedCount}.` : ""}
        </div>
      ) : null}
      {finRejectedDone ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Finance rejection recorded.", "财务驳回已记录。")}</div> : null}
      {hasError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Invalid rate input.", "费率输入无效。")}</div> : null}
      {sent ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Payroll sent to teacher.", "工资单已发送给老师。")}</div> : null}
      {revoked ? <div style={{ marginBottom: 12, color: "#166534" }}>{t(lang, "Payroll send has been revoked.", "工资单发送已撤销。")}</div> : null}
      {sendError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Failed to send payroll.", "发送工资单失败。")}</div> : null}
      {sp?.error === "send-paid" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Only Zhao Hongwei can resend a payroll that has already been paid.", "只有赵宏伟可以重新发送已经发薪的工资单。")}</div> : null}
      {revokeError ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Failed to revoke payroll send.", "撤销发送失败。")}</div> : null}
      {sp?.error === "revoke-paid" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Only Zhao Hongwei can revoke a payroll that has already been paid.", "只有赵宏伟可以撤销已经发薪的工资单。")}</div> : null}
      {sp?.error === "mgr-perm" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "No manager approver permission.", "无管理审批权限。")}</div> : null}
      {sp?.error === "fin-perm" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "No finance approver permission.", "无财务审批权限。")}</div> : null}
      {sp?.error === "mgr-approve" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Manager approval failed.", "管理审批失败。")}</div> : null}
      {sp?.error === "fin-approve" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance approval failed.", "财务审批失败。")}</div> : null}
      {sp?.error === "fin-paid" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance payout failed.", "财务发薪失败。")}</div> : null}
      {sp?.error === "fin-batch-empty" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Please select at least one teacher for batch payout.", "请至少选择一位老师进行批量发薪。")}</div> : null}
      {sp?.error === "fin-reject" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance reject failed.", "财务驳回失败。")}</div> : null}
      {sp?.error === "fin-reason" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Please enter reject reason.", "请填写驳回原因。")}</div> : null}
      {sp?.error === "cfg-perm" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Only Zhao Hongwei can edit the approval role settings.", "只有赵宏伟可以修改审批角色配置。")}</div> : null}
      {sp?.error === "forbidden" ? <div style={{ marginBottom: 12, color: "#b00" }}>{t(lang, "Finance role cannot modify this data.", "财务角色不能修改此类数据。")}</div> : null}

      <div
        style={{
          marginBottom: 14,
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>{t(lang, "Teachers in scope", "当前范围老师数")}</div>
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
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>
            {shownCurrencyTotals.length === 0 ? formatMoneyCents(0) : shownCurrencyTotals.map((item) => <div key={item.currencyCode}>{formatMoneyCents(item.amountCents, item.currencyCode)}</div>)}
          </div>
        </div>
        <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: 10, background: "#fffbeb" }}>
          <div style={{ color: "#92400e", fontSize: 12 }}>{t(lang, "Pending Sessions", "待完成课次")}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#b45309" }}>{shownPending}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(280px, 0.95fr) minmax(340px, 1.05fr)",
          alignItems: "start",
          marginBottom: 18,
        }}
      >
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{t(lang, "My work queue", "我的待处理")}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
            {t(lang, "Focus on the next teacher who needs your action, instead of scanning the whole payroll table first.", "先处理下一位需要你动作的老师，而不是先扫完整工资总表。")}
          </div>
          {myQueueRows.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>
              {t(lang, "No payroll items need your action right now.", "当前没有需要你处理的工资单。")}
            </div>
          ) : (
            <form action={financeBatchMarkPaidPayrollAction} style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              {financeCurrencyGroups.length > 0 ? (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  {financeCurrencyGroups.map((group) => (
                    <div key={group.currencyCode} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Payout-ready currency group", "可发薪币种组")}</div>
                      <div style={{ fontWeight: 700 }}>{group.currencyCode}</div>
                      <div style={{ fontSize: 13, color: "#334155" }}>
                        {group.teacherCount} {t(lang, "teachers", "位老师")} · {formatMoneyCents(group.amountCents, group.currencyCode)}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {t(lang, "Clean", "无异常")}: {group.cleanTeacherCount} · {t(lang, "Has issues", "有异常")}: {group.issueTeacherCount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {financePayableQueueRows.length > 1 ? (
                <div style={{ marginBottom: 2, padding: 10, border: "1px solid #dbeafe", borderRadius: 10, background: "#eff6ff", display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 600, color: "#1d4ed8" }}>
                    {t(lang, "Finance batch payout", "财务批量发薪")}
                  </div>
                  <div style={{ fontSize: 13, color: "#334155" }}>
                    {t(lang, "Select one or more finance-ready teachers below, then mark them paid together.", "先在下方勾选已到财务发薪阶段的老师，再一起标记发薪。")}
                  </div>
                  <div>
                    <button type="submit">{t(lang, "Mark selected paid", "标记选中已发薪")}</button>
                  </div>
                </div>
              ) : null}
              <div style={{ display: "grid", gap: 10 }}>
                {myQueueRows.map((item) => (
                  <div
                    key={item.row.teacherId}
                    style={{
                      border: item.row.teacherId === selectedWorkflowRow?.row.teacherId ? "2px solid #2563eb" : "1px solid #dbe4f0",
                      borderRadius: 12,
                      padding: 12,
                      background: item.row.teacherId === selectedWorkflowRow?.row.teacherId ? "#eff6ff" : "#f8fafc",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                        {item.queueKey === "financePaid" && item.publish && isFinanceApprover ? (
                          <input type="checkbox" name="teacherIds" value={item.row.teacherId} />
                        ) : null}
                        <a href={buildPayrollPageHref(item.row.teacherId)} style={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}>
                          {item.row.teacherName}
                        </a>
                      </div>
                      <span style={{ ...workflowChipStyle(item.queueKey === "send" ? "pending" : item.queueKey === "done" ? "done" : "pending"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                        {item.queueLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      {t(lang, "Pending sessions", "待完成课次")}: <strong>{item.row.pendingSessions}</strong> · {t(lang, "Hours", "课时")}: <strong>{item.row.totalHours}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                      {item.row.currencyTotals.length === 0
                        ? formatMoneyCents(0)
                        : item.row.currencyTotals.map((currencyItem) => formatMoneyCents(currencyItem.amountCents, currencyItem.currencyCode)).join(" / ")}
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{t(lang, "Selected payroll", "当前处理老师")}</div>
          {!selectedWorkflowRow ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>
              {t(lang, "Select one teacher from the work queue to review payroll actions.", "从待处理队列里选一位老师查看工资单动作。")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 12, background: "#eff6ff" }}>
                <div style={{ fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
                  {selectedWorkflowRow.row.teacherName}
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  {t(lang, "Current period", "当前周期")}: {periodText}
                </div>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <div style={{ border: "1px solid #fde68a", borderRadius: 10, padding: 10, background: "#fffbeb" }}>
                  <div style={{ fontSize: 12, color: "#92400e" }}>{t(lang, "Pending sessions", "待完成课次")}</div>
                  <div style={{ fontWeight: 700, color: "#b45309" }}>{selectedWorkflowRow.row.pendingSessions}</div>
                </div>
                <div style={{ border: "1px solid #fed7aa", borderRadius: 10, padding: 10, background: "#fff7ed" }}>
                  <div style={{ fontSize: 12, color: "#9a3412" }}>{t(lang, "Cancelled+charged", "取消但计薪")}</div>
                  <div style={{ fontWeight: 700, color: "#c2410c" }}>
                    {teacherExceptionMap.get(selectedWorkflowRow.row.teacherId)?.chargedExcusedSessions ?? 0}
                  </div>
                </div>
                <div style={{ border: "1px solid #fde68a", borderRadius: 10, padding: 10, background: "#fefce8" }}>
                  <div style={{ fontSize: 12, color: "#854d0e" }}>{t(lang, "Fallback-rate combos", "费率回退组合")}</div>
                  <div style={{ fontWeight: 700, color: "#a16207" }}>
                    {teacherExceptionMap.get(selectedWorkflowRow.row.teacherId)?.fallbackComboCount ?? 0}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Salary", "工资")}</div>
                  <div style={{ fontWeight: 700 }}>
                    {selectedWorkflowRow.row.currencyTotals.length === 0
                      ? formatMoneyCents(0)
                      : selectedWorkflowRow.row.currencyTotals.map((currencyItem) => formatMoneyCents(currencyItem.amountCents, currencyItem.currencyCode)).join(" / ")}
                  </div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Sessions", "课次数")}</div>
                  <div style={{ fontWeight: 700 }}>{selectedWorkflowRow.row.totalSessions}</div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Pending", "未完成")}</div>
                  <div style={{ fontWeight: 700, color: selectedWorkflowRow.row.pendingSessions > 0 ? "#b45309" : "#0f766e" }}>
                    {selectedWorkflowRow.row.pendingSessions}
                  </div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t(lang, "Next step", "下一步")}</div>
                  <div style={{ fontWeight: 700 }}>{selectedWorkflowRow.queueLabel}</div>
                </div>
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{t(lang, "Approval history", "审批历史")}</div>
                {renderSelectedTimeline(selectedWorkflowRow)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ ...workflowChipStyle(selectedWorkflowRow.teacherState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                  {t(lang, "Teacher", "老师")}: {selectedWorkflowRow.teacherState === "done" ? t(lang, "Done", "完成") : t(lang, "Pending", "待处理")}
                </span>
                <span style={{ ...workflowChipStyle(selectedWorkflowRow.managerState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                  {t(lang, "Manager", "管理")}: {selectedWorkflowRow.managerState === "done" ? t(lang, "Done", "完成") : selectedWorkflowRow.managerState === "blocked" ? t(lang, "Blocked", "未到此步") : `${selectedWorkflowRow.publish?.managerApprovedBy.length ?? 0}/${roleConfig.managerApproverEmails.length}`}
                </span>
                <span style={{ ...workflowChipStyle(selectedWorkflowRow.financeConfirmState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                  {t(lang, "Finance Confirm", "财务确认")}: {selectedWorkflowRow.financeConfirmState === "done" ? t(lang, "Done", "完成") : selectedWorkflowRow.financeConfirmState === "blocked" ? t(lang, "Blocked", "未到此步") : t(lang, "Pending", "待处理")}
                </span>
                <span style={{ ...workflowChipStyle(selectedWorkflowRow.financePaidState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                  {t(lang, "Finance Paid", "财务发薪")}: {selectedWorkflowRow.financePaidState === "done" ? t(lang, "Done", "完成") : selectedWorkflowRow.financePaidState === "blocked" ? t(lang, "Blocked", "未到此步") : t(lang, "Pending", "待处理")}
                </span>
              </div>
              {renderSelectedActionArea(selectedWorkflowRow)}
            </div>
          )}
        </section>
      </div>

      <h3 id="salary-slips" style={{ scrollMarginTop: 80 }}>{t(lang, "Salary Slips by Teacher", "按老师工资单")}</h3>
      <form method="GET" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="scope" value={scope} />
        {rateMissingOnly ? <input type="hidden" name="rateMissingOnly" value="1" /> : null}
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
        <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
        <a href={`/admin/reports/teacher-payroll?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>{t(lang, "Clear", "清除")}</a>
        <a href={exportCsvHref}>{t(lang, "Export CSV", "导出 CSV")}</a>
      </form>
      {payrollRows.length === 0 ? (
        <div style={{ color: "#999", marginBottom: 16 }}>{t(lang, "No sessions in this payroll period.", "当前计薪周期没有课次。")}</div>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: 20 }}>
          <table cellPadding={8} style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 980 }}>
            <thead>
              <tr>
                <th align="left" style={payrollTableFirstColHeaderStyle}>{t(lang, "Teacher", "老师")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Sessions", "课次数")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Cancelled+Charged", "取消但扣课时")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Completed", "已完成")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Pending", "未完成")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Hours", "课时")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Salary", "工资")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Workflow", "流程状态")}</th>
                <th align="left" style={payrollTableHeaderCellStyle}>{t(lang, "Actions", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {payrollRows.map((row) => {
                const publish = publishMap.get(row.teacherId) ?? null;
                const managerAllConfirmed = publish
                  ? areAllApproversConfirmed(publish.managerApprovedBy, roleConfig.managerApproverEmails)
                  : false;
                const teacherState = publish?.confirmedAt ? "done" : "pending";
                const managerState = !publish?.confirmedAt ? "blocked" : managerAllConfirmed ? "done" : "pending";
                const financeConfirmState = !publish?.confirmedAt || !managerAllConfirmed
                  ? "blocked"
                  : publish.financeConfirmedAt
                    ? "done"
                    : "pending";
                const financePaidState = !publish?.financeConfirmedAt
                  ? "blocked"
                  : publish.financePaidAt
                    ? "done"
                    : "pending";
                return (
                  <tr key={row.teacherId}>
                    <td style={{ ...payrollTableFirstColCellStyle, borderTop: "1px solid #eee" }}>
                      <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
                        {row.teacherName}
                      </a>
                    </td>
                    <td style={{ borderTop: "1px solid #eee" }}>{row.totalSessions}</td>
                    <td style={{ borderTop: "1px solid #eee", color: row.chargedExcusedSessions > 0 ? "#9a3412" : "#64748b", fontWeight: 700 }}>{row.chargedExcusedSessions}</td>
                    <td style={{ borderTop: "1px solid #eee", color: "#166534", fontWeight: 700 }}>{row.completedSessions}</td>
                    <td style={{ borderTop: "1px solid #eee", color: row.pendingSessions > 0 ? "#b91c1c" : "#64748b", fontWeight: 700 }}>{row.pendingSessions}</td>
                    <td style={{ borderTop: "1px solid #eee" }}>{row.totalHours}</td>
                    <td style={{ borderTop: "1px solid #eee" }}>
                      {row.currencyTotals.map((item) => (
                        <div key={item.currencyCode}>{formatMoneyCents(item.amountCents, item.currencyCode)}</div>
                      ))}
                      {missingRateTeacherSet.has(row.teacherId) ? (
                        <div style={{ color: "#b91c1c", fontSize: 12 }}>{t(lang, "Rate Missing", "费率缺失")}</div>
                      ) : null}
                    </td>
                    <td style={{ borderTop: "1px solid #eee" }}>
                      {!publish ? (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#475569" }}>
                          {t(lang, "Not sent", "未发送")}
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <span style={{ ...workflowChipStyle(teacherState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                            {t(lang, "Teacher", "老师")}: {teacherState === "done" ? t(lang, "Done", "完成") : t(lang, "Pending", "待处理")}
                          </span>
                          <span style={{ ...workflowChipStyle(managerState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                            {t(lang, "Manager", "管理")}: {managerState === "done" ? t(lang, "Done", "完成") : managerState === "blocked" ? t(lang, "Blocked", "未到此步") : `${publish.managerApprovedBy.length}/${roleConfig.managerApproverEmails.length}`}
                          </span>
                          <span style={{ ...workflowChipStyle(financeConfirmState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                            {t(lang, "Finance Confirm", "财务确认")}: {financeConfirmState === "done" ? t(lang, "Done", "完成") : financeConfirmState === "blocked" ? t(lang, "Blocked", "未到此步") : t(lang, "Pending", "待处理")}
                          </span>
                          <span style={{ ...workflowChipStyle(financePaidState), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                            {t(lang, "Finance Paid", "财务发薪")}: {financePaidState === "done" ? t(lang, "Done", "完成") : financePaidState === "blocked" ? t(lang, "Blocked", "未到此步") : t(lang, "Pending", "待处理")}
                          </span>
                          {publish.financeRejectedAt ? (
                            <span style={{ ...workflowChipStyle("rejected"), borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                              {t(lang, "Finance Rejected", "财务驳回")}: {publish.financeRejectReason ?? "-"}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td style={{ borderTop: "1px solid #eee" }}>
                      <details>
                        <summary style={{ cursor: "pointer" }}>{t(lang, "Actions", "操作")}</summary>
                        <div style={{ display: "grid", gap: 6, justifyItems: "start", marginTop: 6 }}>
                        <a href={`/admin/reports/teacher-payroll/${encodeURIComponent(row.teacherId)}?month=${encodeURIComponent(month)}&scope=${encodeURIComponent(scope)}`}>
                          {t(lang, "Open Detail", "打开详情")}
                        </a>
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
                          <details>
                            <summary style={{ cursor: "pointer", color: "#b91c1c" }}>{t(lang, "Finance Reject", "财务驳回")}</summary>
                            <form action={financeRejectPayrollAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
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
                              <button type="submit">{t(lang, "Confirm Reject", "确认驳回")}</button>
                            </form>
                          </details>
                        ) : null}
                        </div>
                      </details>
                    </td>
                  </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {!isFinanceOnlyUser ? (
        <details
          id="rate-config"
          open={rateMissingOnly || saved}
          style={{ marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", scrollMarginTop: 80 }}
        >
          <summary style={{ cursor: "pointer", padding: "10px 12px", fontWeight: 700 }}>
            {t(lang, "Rate Config (Teacher + Course)", "费率配置（老师 + 课程）")}{" "}
            {unconfiguredRateCount > 0 ? (
              <span style={{ color: "#b91c1c", marginLeft: 8 }}>
                {t(lang, "Unconfigured", "未配置")}: {unconfiguredRateCount}
              </span>
            ) : null}
          </summary>
          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ marginBottom: 10, color: "#666" }}>
              {t(
                lang,
                "Rates are configured separately for 1-on-1 and group classes. Group rows without a dedicated group rate temporarily fall back to the matching 1-on-1 rate.",
                "费率现在区分一对一和班课。班课若暂未配置专属班课费率，会临时回退使用对应的一对一费率。"
              )}
            </div>
            {fallbackRateCount > 0 ? (
              <div style={{ marginBottom: 10, color: "#92400e" }}>
                {t(lang, "Using 1-on-1 fallback for group rows", "正在用一对一费率回退的班课")}：{fallbackRateCount}
              </div>
            ) : null}
            <form method="GET" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="q" value={String(sp?.q ?? "")} />
              {pendingOnly ? <input type="hidden" name="pendingOnly" value="1" /> : null}
              {unsentOnly ? <input type="hidden" name="unsentOnly" value="1" /> : null}
              <label>
                <input type="checkbox" name="rateMissingOnly" value="1" defaultChecked={rateMissingOnly} />{" "}
                {t(lang, "Only Unconfigured", "仅看未配置")}
              </label>
              <button type="submit" data-apply-submit="1">{t(lang, "Apply", "应用")}</button>
            </form>
            {rateRows.length === 0 ? (
              <div style={{ color: "#999" }}>{t(lang, "No editable rate rows.", "暂无可编辑费率项。")}</div>
            ) : (
              <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th align="left">{t(lang, "Teacher", "老师")}</th>
                    <th align="left">{t(lang, "Course Combo", "课程组合")}</th>
                    <th align="left">{t(lang, "Teaching Mode", "班型")}</th>
                    <th align="left">{t(lang, "Matched Sessions", "匹配课次")}</th>
                    <th align="left">{t(lang, "Matched Hours", "匹配课时")}</th>
                    <th align="left">{t(lang, "Edit Hourly Rate", "编辑课时费")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rateRows.map((row) => {
                    const rowKey = `rate-${row.teacherId}-${row.courseId}-${row.subjectId ?? "-"}-${row.levelId ?? "-"}-${row.teachingMode}`;
                    const isSavedRow = rowKey === savedRateRowKey;
                    return (
                    <tr
                      id={rowKey}
                      key={rowKey}
                      style={{
                        borderTop: "1px solid #eee",
                        background: isSavedRow ? "#ecfdf5" : undefined,
                        boxShadow: isSavedRow ? "inset 0 0 0 1px #86efac" : undefined,
                      }}
                    >
                      <td>
                        <div>{row.teacherName}</div>
                        {isSavedRow ? (
                          <div style={{ color: "#166534", fontSize: 12 }}>{t(lang, "Just saved", "刚刚已保存")}</div>
                        ) : null}
                      </td>
                      <td>{formatComboLabel(row.courseName, row.subjectName, row.levelName)}</td>
                      <td>
                        <div>{formatTeachingModeLabel(row.teachingMode)}</div>
                        {row.usesFallbackRate ? (
                          <div style={{ color: "#92400e", fontSize: 12 }}>
                            {t(lang, "Using 1-on-1 fallback", "正在使用一对一费率回退")}
                          </div>
                        ) : null}
                      </td>
                      <td>{row.matchedSessions}</td>
                      <td>{row.matchedHours}</td>
                      <td>
                        <form action={saveRateAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="hidden" name="month" value={month} />
                          <input type="hidden" name="scope" value={scope} />
                          <input type="hidden" name="q" value={String(sp?.q ?? "")} />
                          {pendingOnly ? <input type="hidden" name="pendingOnly" value="1" /> : null}
                          {unsentOnly ? <input type="hidden" name="unsentOnly" value="1" /> : null}
                          {rateMissingOnly ? <input type="hidden" name="rateMissingOnly" value="1" /> : null}
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
                          <select name="currencyCode" defaultValue={row.currencyCode} style={{ width: 90 }}>
                            {PAYROLL_CURRENCY_CODES.map((currencyCode) => (
                              <option key={currencyCode} value={currencyCode}>
                                {currencyCode}
                              </option>
                            ))}
                          </select>
                          <select name="teachingMode" defaultValue={row.teachingMode} style={{ width: 110 }}>
                            {PAYROLL_TEACHING_MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {formatTeachingModeLabel(mode)}
                              </option>
                            ))}
                          </select>
                          <button type="submit">{t(lang, "Save", "保存")}</button>
                        </form>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        </details>
      ) : null}

      {!isFinanceOnlyUser ? (
        <details
          id="approval-config"
          style={{ marginBottom: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", scrollMarginTop: 80 }}
        >
          <summary style={{ cursor: "pointer", padding: "10px 12px", fontWeight: 700 }}>
            {t(lang, "Approval Role Config", "审批角色配置")}
          </summary>
          <div style={{ padding: "0 12px 12px" }}>
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
        </details>
      ) : null}

    </div>
  );
}
