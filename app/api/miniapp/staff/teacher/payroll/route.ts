import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { areAllApproversConfirmed, getApprovalRoleConfig } from "@/lib/approval-flow";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import {
  confirmTeacherPayroll,
  formatMoneyCents,
  getTeacherPayrollPublishForTeacher,
  loadTeacherPayrollDetail,
  monthKey,
  parseMonth,
} from "@/lib/teacher-payroll";

function payrollMonth(value: string | null) {
  return parseMonth(value) ? String(value) : monthKey(new Date());
}

function pendingReasonText(reason: string | null) {
  if (reason === "ATTENDANCE_MISSING") return "未点名";
  if (reason === "ATTENDANCE_UNMARKED") return "点名未完成";
  if (reason === "FEEDBACK_MISSING") return "未提交反馈";
  if (reason === "ATTENDANCE_AND_FEEDBACK_MISSING") return "点名与反馈均未完成";
  return "";
}

function comboLabel(row: { courseName: string; subjectName: string | null; levelName: string | null; teachingMode: string }) {
  return [row.courseName, row.subjectName, row.levelName, row.teachingMode === "GROUP" ? "班课" : "一对一"]
    .filter(Boolean)
    .join(" / ");
}

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const url = new URL(req.url);
  const month = payrollMonth(url.searchParams.get("month"));
  const scope = url.searchParams.get("scope") === "completed" ? "completed" : "all";
  const publish = await getTeacherPayrollPublishForTeacher({ teacherId: access.teacherId, month, scope });
  if (!publish) {
    return ok({ month, scope, available: false, status: { code: "NOT_SENT", text: "工资单暂未开放", needsAction: false } });
  }

  const [detail, approvalConfig] = await Promise.all([
    loadTeacherPayrollDetail(month, access.teacherId, scope),
    getApprovalRoleConfig(),
  ]);
  if (!detail) return bad("未找到工资数据", 404);
  const managerApproved = areAllApproversConfirmed(publish.managerApprovedBy, approvalConfig.managerApproverEmails);
  const stage = publish.financeRejectedAt
    ? "FINANCE_REJECTED"
    : !publish.confirmedAt
      ? "TEACHER_CONFIRM"
      : !managerApproved
        ? "MANAGER_APPROVAL"
        : !publish.financeConfirmedAt
          ? "FINANCE_CONFIRM"
          : !publish.financePaidAt
            ? "WAITING_PAYMENT"
            : "PAID";
  const stageText: Record<string, string> = {
    FINANCE_REJECTED: "财务已退回",
    TEACHER_CONFIRM: "等待你确认",
    MANAGER_APPROVAL: "等待管理审批",
    FINANCE_CONFIRM: "等待财务确认",
    WAITING_PAYMENT: "等待发薪",
    PAID: "已发薪",
  };

  return ok({
    month,
    scope,
    available: true,
    status: { code: stage, text: stageText[stage], needsAction: stage === "TEACHER_CONFIRM" },
    financeRejectReason: publish.financeRejectReason,
    summary: {
      totalAmountText: detail.totalCurrencyTotals.length
        ? detail.totalCurrencyTotals.map((item) => formatMoneyCents(item.amountCents, item.currencyCode)).join(" / ")
        : formatMoneyCents(0),
      totalSessions: detail.totalSessions,
      totalHours: detail.totalHours,
      periodText: `${formatBusinessDateOnly(detail.range.start)} - ${formatBusinessDateOnly(new Date(detail.range.end.getTime() - 1000))}`,
    },
    timeline: [
      { key: "sent", label: "已发送", at: publish.sentAt, done: true },
      { key: "teacher", label: "老师确认", at: publish.confirmedAt, done: Boolean(publish.confirmedAt) },
      { key: "manager", label: "管理审批", at: managerApproved ? publish.managerApprovedAt : null, done: managerApproved },
      { key: "finance", label: "财务确认", at: publish.financeConfirmedAt, done: Boolean(publish.financeConfirmedAt) },
      { key: "paid", label: "已发薪", at: publish.financePaidAt, done: Boolean(publish.financePaidAt) },
    ].map((item) => ({ ...item, atText: item.at ? formatBusinessDateTime(new Date(item.at)) : "" })),
    combos: detail.comboRows.map((row) => ({
      key: `${row.courseId}:${row.subjectId ?? ""}:${row.levelId ?? ""}:${row.teachingMode}:${row.currencyCode}`,
      label: comboLabel(row),
      sessionCount: row.sessionCount,
      totalHours: row.totalHours,
      hourlyRateText: formatMoneyCents(row.hourlyRateCents, row.currencyCode),
      amountText: formatMoneyCents(row.amountCents, row.currencyCode),
      usedRateFallback: row.usedRateFallback,
    })),
    sessions: detail.sessionRows.slice().reverse().map((row) => ({
      id: row.sessionId,
      startText: formatBusinessDateTime(row.startAt),
      studentName: row.studentName,
      comboLabel: comboLabel(row),
      totalHours: row.totalHours,
      amountText: formatMoneyCents(row.amountCents, row.currencyCode),
      completed: row.isCompleted,
      pendingReasonText: pendingReasonText(row.pendingReason),
    })),
  });
}

export async function POST(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => null);
  const month = payrollMonth(typeof body?.month === "string" ? body.month : null);
  const scope = body?.scope === "completed" ? "completed" : "all";
  if (body?.acknowledged !== true) return bad("请先确认已核对课程、课时和工资金额", 409);
  const publish = await getTeacherPayrollPublishForTeacher({ teacherId: access.teacherId, month, scope });
  if (!publish) return bad("该工资单尚未发送", 409);
  if (publish.confirmedAt) return ok({ message: "工资单已确认", alreadyConfirmed: true });
  const saved = await confirmTeacherPayroll({
    teacherId: access.teacherId,
    month,
    scope,
    actorEmail: access.user.email,
  });
  if (!saved) return bad("工资单确认失败，请刷新后重试", 409);
  return ok({ message: "工资单已确认" });
}
