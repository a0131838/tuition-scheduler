import { requireAdmin } from "@/lib/auth";
import { getApprovalRoleConfig, areAllApproversConfirmed } from "@/lib/approval-flow";
import { getLang, type Lang } from "@/lib/i18n";
import {
  formatCurrencyTotals,
  getTeacherPayrollPublishStatus,
  loadTeacherPayroll,
  monthKey,
  parseMonth,
} from "@/lib/teacher-payroll";

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? monthKey(new Date());
  const scope = url.searchParams.get("scope") === "completed" ? "completed" : "all";
  const q = String(url.searchParams.get("q") ?? "").trim().toLowerCase();
  const pendingOnly = url.searchParams.get("pendingOnly") === "1";
  const unsentOnly = url.searchParams.get("unsentOnly") === "1";
  const lang = await getLang();

  if (!parseMonth(month)) {
    return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  }

  const [data, publishMap, roleConfig] = await Promise.all([
    loadTeacherPayroll(month, scope),
    getTeacherPayrollPublishStatus(month, scope),
    getApprovalRoleConfig(),
  ]);

  if (!data) {
    return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  }

  const rows = data.summaryRows.filter((row) => {
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

  const header = [
    choose(lang, "Payroll Month", "工资月份"),
    choose(lang, "Scope", "统计口径"),
    choose(lang, "Teacher", "老师"),
    choose(lang, "Sessions", "课次数"),
    choose(lang, "Cancelled+Charged", "取消但计薪"),
    choose(lang, "Completed", "已完成"),
    choose(lang, "Pending", "未完成"),
    choose(lang, "Hours", "课时"),
    choose(lang, "Salary", "工资"),
    choose(lang, "Sent", "已发送"),
    choose(lang, "Teacher Confirmed At", "老师确认时间"),
    choose(lang, "Manager Approval", "管理审批"),
    choose(lang, "Finance Confirmed At", "财务确认时间"),
    choose(lang, "Finance Paid At", "财务发薪时间"),
    choose(lang, "Finance Rejected At", "财务驳回时间"),
    choose(lang, "Finance Reject Reason", "财务驳回原因"),
    choose(lang, "Workflow", "流程状态"),
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    const publish = publishMap.get(row.teacherId) ?? null;
    const managerApprovedCount = publish?.managerApprovedBy.length ?? 0;
    const managerAllConfirmed = publish
      ? areAllApproversConfirmed(publish.managerApprovedBy, roleConfig.managerApproverEmails)
      : false;

    let workflow = choose(lang, "Completed workflow", "流程已完成");
    if (!publish) workflow = choose(lang, "Ready to send", "可发送");
    else if (!publish.confirmedAt) workflow = choose(lang, "Waiting for teacher confirmation", "等待老师确认");
    else if (!managerAllConfirmed) workflow = choose(lang, "Waiting for manager approval", "等待管理审批");
    else if (!publish.financeConfirmedAt) workflow = choose(lang, "Waiting for finance confirmation", "等待财务确认");
    else if (!publish.financePaidAt) workflow = choose(lang, "Ready for finance payout", "可继续发薪");

    lines.push(
      [
        month,
        scope,
        row.teacherName,
        row.totalSessions,
        row.chargedExcusedSessions,
        row.completedSessions,
        row.pendingSessions,
        row.totalHours.toFixed(2),
        formatCurrencyTotals(row.currencyTotals),
        publish ? "true" : "false",
        publish?.confirmedAt ?? "",
        `${managerApprovedCount}/${roleConfig.managerApproverEmails.length}`,
        publish?.financeConfirmedAt ?? "",
        publish?.financePaidAt ?? "",
        publish?.financeRejectedAt ?? "",
        publish?.financeRejectReason ?? "",
        workflow,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const fileName = `teacher-payroll-${month}-${scope}.csv`;
  return new Response(`\uFEFF${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
