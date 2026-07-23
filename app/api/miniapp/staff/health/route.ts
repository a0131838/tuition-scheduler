import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { canUseMiniappApprovalDesk } from "@/lib/miniapp-staff-action-center";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";
import { syncRenewalTasks } from "@/lib/renewal-management";

const OPEN_TICKETS = ["Need Info", "Waiting Teacher", "Waiting Parent", "Confirmed", "Exception"];

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!(await canUseMiniappApprovalDesk(auth.user))) return bad("Management permission required", 403);
  const now = new Date();
  await syncRenewalTasks(auth.user);
  const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [unowned, overdue, waitingInfo, corrections, feedbackReview, feedbackSend, renewalOpen, renewalUrgent, renewalOverdue, failedReminders, dueLeads, approvalData, sessions] = await Promise.all([
    prisma.ticket.count({ where: { isArchived: false, status: { in: OPEN_TICKETS }, OR: [{ owner: null }, { owner: "" }] } }),
    prisma.ticket.count({ where: { isArchived: false, status: { in: OPEN_TICKETS }, nextActionDue: { lt: now } } }),
    prisma.ticket.count({ where: { isArchived: false, status: { in: ["Need Info", "Waiting Parent", "Waiting Teacher"] } } }),
    prisma.ticket.count({ where: { isArchived: false, status: { in: OPEN_TICKETS }, type: { in: ["操作纠正", "系统问题"] } } }),
    prisma.parentCommunicationTask.count({ where: { kind: "FEEDBACK", status: { in: ["PENDING_REVIEW", "RETURNED"] } } }),
    prisma.parentCommunicationTask.count({ where: { kind: "FEEDBACK", status: { in: ["READY_TO_SEND", "CLAIMED", "ATTENTION"] } } }),
    prisma.renewalTask.count({ where: { completedAt: null } }),
    prisma.renewalTask.count({ where: { completedAt: null, riskLevel: { in: ["RED", "EXHAUSTED"] } } }),
    prisma.renewalTask.count({ where: { completedAt: null, nextFollowUpAt: { lte: now } } }),
    prisma.miniappNotificationOutbox.count({ where: { status: "FAILED", createdAt: { gte: recent } } }),
    prisma.lead.count({ where: { isArchived: false, status: { notIn: ["Converted", "Lost"] }, nextActionDue: { lte: now } } }),
    getApprovalInboxData(auth.user.email, auth.user.role),
    prisma.session.findMany({
      where: { endAt: { gte: recent, lte: now } },
      include: {
        attendances: { select: { studentId: true, status: true } },
        feedbacks: { select: { id: true } },
        student: { select: { id: true, name: true } },
        class: { include: { oneOnOneStudent: { select: { id: true, name: true } }, enrollments: { include: { student: { select: { id: true, name: true } } } } } },
      },
      take: 1000,
    }),
  ]);
  const visible = sessions.filter((row) => !isSessionFullyCancelled(row));
  const attendanceMissing = visible.filter((row) => { const names = getVisibleSessionStudentNames(row); return !names.length || row.attendances.length < names.length || row.attendances.some((item) => item.status === "UNMARKED"); }).length;
  const feedbackMissing = visible.filter((row) => row.feedbacks.length === 0).length;
  const approvalCount = approvalData.summary.manager || 0;
  const items = [
    { key: "corrections", title: "纠正与系统问题", count: corrections, target: "operations", urgent: corrections > 0, definition: "未完成的操作纠正和小程序问题工单" },
    { key: "unowned", title: "未领取工单", count: unowned, target: "requests", urgent: unowned > 0, definition: "开放且没有负责人的全部来源工单" },
    { key: "overdue", title: "逾期工单", count: overdue, target: "requests", urgent: overdue > 0, definition: "下一步时间早于当前时间的开放工单" },
    { key: "waiting", title: "等待补充/回复", count: waitingInfo, target: "requests", urgent: false, definition: "等待资料、家长或老师回复的工单" },
    { key: "feedback-review", title: "反馈待审核", count: feedbackReview, target: "communications", urgent: feedbackReview > 0, definition: "待审核或已退回老师的课后反馈" },
    { key: "feedback-send", title: "已发布但未发群", count: feedbackSend, target: "communications-send", urgent: feedbackSend > 0, definition: "已进入人工微信群发送阶段的课后反馈" },
    { key: "renewals", title: "续费跟进", count: renewalOpen, target: "renewals", urgent: renewalUrgent > 0 || renewalOverdue > 0, definition: `紧急 ${renewalUrgent}，已到跟进时间 ${renewalOverdue}` },
    { key: "teacher-work", title: "老师点名/反馈缺失", count: attendanceMissing + feedbackMissing, target: "schedule", urgent: attendanceMissing + feedbackMissing > 0, definition: `近7天：点名 ${attendanceMissing}，反馈 ${feedbackMissing}` },
    { key: "approvals", title: "管理审批", count: approvalCount, target: "approvals", urgent: (approvalData.summary.overdue || 0) > 0, definition: `${approvalData.summary.overdue || 0} 项等待超过24小时` },
    { key: "leads", title: "新咨询逾期跟进", count: dueLeads, target: "leads", urgent: dueLeads > 0, definition: "超过下次跟进时间的未转化咨询" },
    { key: "reminders", title: "自动提醒失败", count: failedReminders, target: "reminders", urgent: failedReminders > 0, definition: "近7天发送失败的自动提醒" },
  ];
  return ok({ generatedAt: now.toISOString(), total: items.reduce((sum, item) => sum + item.count, 0), items });
}
