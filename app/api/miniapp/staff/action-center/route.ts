import { ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { getApprovalInboxData } from "@/lib/approval-inbox";
import { formatBusinessDateTime } from "@/lib/date-only";
import {
  canUseMiniappAcademicDesk,
  canUseMiniappApprovalDesk,
  canUseMiniappLeadDesk,
} from "@/lib/miniapp-staff-action-center";
import { getTeacherManagerFeedbackState } from "@/lib/manager-teacher-feedback";
import { prisma } from "@/lib/prisma";
import { getTeacherNoticeState } from "@/lib/teacher-notices";
import { getTeacherPayrollPublishForTeacher, monthKey } from "@/lib/teacher-payroll";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";
import { syncRenewalTasks } from "@/lib/renewal-management";
import { LEGACY_XDF_SOURCE_CHANNEL_NAME } from "@/lib/partners";

const OPEN_COMMUNICATION_STATUSES = ["PENDING_REVIEW", "READY_TO_SEND", "CLAIMED", "RETURNED", "ATTENTION"];
const OPEN_TICKET_STATUSES = ["Need Info", "Waiting Teacher", "Waiting Parent", "Confirmed", "Exception"];

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const now = new Date();

  if (user.role === "TEACHER" && user.teacherId) {
    const lookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const teacherWhere = { OR: [{ teacherId: user.teacherId }, { teacherId: null, class: { teacherId: user.teacherId } }] };
    const [feedbackState, noticeState, midtermReports, finalReports, rejectedExpenses, payroll, sessions, taughtRows] = await Promise.all([
      getTeacherManagerFeedbackState(user.teacherId),
      getTeacherNoticeState(user.id),
      prisma.midtermReport.findMany({
        where: { teacherId: user.teacherId, archivedAt: null, status: "ASSIGNED" },
        include: { student: { select: { name: true } }, course: { select: { name: true } } },
        orderBy: { assignedAt: "asc" },
        take: 30,
      }),
      prisma.finalReport.findMany({
        where: { teacherId: user.teacherId, archivedAt: null, status: "ASSIGNED" },
        include: { student: { select: { name: true } }, course: { select: { name: true } } },
        orderBy: { assignedAt: "asc" },
        take: 30,
      }),
      prisma.expenseClaim.count({ where: { submitterUserId: user.id, archivedAt: null, status: "REJECTED" } }),
      getTeacherPayrollPublishForTeacher({ teacherId: user.teacherId, month: monthKey(now), scope: "all" }),
      prisma.session.findMany({
        where: { ...teacherWhere, endAt: { gte: lookback, lte: now } },
        include: {
          attendances: { select: { studentId: true, status: true } },
          feedbacks: { where: { teacherId: user.teacherId }, select: { id: true, content: true } },
          student: { select: { id: true, name: true } },
          class: {
            include: {
              course: { select: { name: true } },
              subject: { select: { name: true } },
              oneOnOneStudent: { select: { id: true, name: true } },
              enrollments: { include: { student: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { endAt: "desc" },
        take: 200,
      }),
      prisma.attendance.findMany({ where: { session: teacherWhere }, select: { studentId: true }, distinct: ["studentId"] }),
    ]);
    const visibleSessions = sessions.filter((row) => !isSessionFullyCancelled(row));
    const attendancePending = visibleSessions.filter((row) => {
      const names = getVisibleSessionStudentNames(row);
      return !names.length || row.attendances.length < names.length || row.attendances.some((item) => item.status === "UNMARKED");
    });
    const lessonFeedbackPending = visibleSessions.filter((row) => !row.feedbacks.some((item) => String(item.content ?? "").trim()));
    const taughtStudentIds = taughtRows.map((row) => row.studentId);
    let unreadOtherFeedback = 0;
    if (taughtStudentIds.length) {
      const feedbackRows = await prisma.sessionFeedback.findMany({
        where: { teacherId: { not: user.teacherId }, submittedAt: { gte: recent, lte: now }, content: { not: "" }, session: { attendances: { some: { studentId: { in: taughtStudentIds } } } } },
        select: { id: true },
        take: 1000,
      });
      const readRows = feedbackRows.length
        ? await prisma.teacherFeedbackRead.findMany({ where: { userId: user.id, feedbackId: { in: feedbackRows.map((row) => row.id) } }, select: { feedbackId: true } })
        : [];
      const readSet = new Set(readRows.map((row) => row.feedbackId));
      unreadOtherFeedback = feedbackRows.filter((row) => !readSet.has(row.id)).length;
    }
    const payrollPending = Boolean(payroll && !payroll.confirmedAt);
    const reportItems = [
      ...midtermReports.map((row) => ({
        id: `MIDTERM:${row.id}`,
        kind: "MIDTERM",
        title: `${row.student.name}的阶段报告`,
        detail: `${row.course.name} · ${formatBusinessDateTime(row.assignedAt)}`,
        target: "teacher-reports",
        urgent: true,
      })),
      ...finalReports.map((row) => ({
        id: `FINAL:${row.id}`,
        kind: "FINAL",
        title: `${row.student.name}的结课报告`,
        detail: `${row.course.name} · ${formatBusinessDateTime(row.assignedAt)}`,
        target: "teacher-reports",
        urgent: true,
      })),
    ];
    const items = [
      {
        key: "payroll",
        title: "工资单待确认",
        detail: payrollPending ? `${payroll?.month} 工资单等待核对` : "当前没有待确认工资单",
        count: payrollPending ? 1 : 0,
        target: "teacher-payroll",
        urgent: payrollPending,
      },
      {
        key: "attendance",
        title: "课程点名待完成",
        detail: attendancePending.length ? "近30天有课程尚未完成点名" : "点名已完成",
        count: attendancePending.length,
        target: "teacher-schedule",
        urgent: attendancePending.length > 0,
      },
      {
        key: "lesson-feedback",
        title: "课后反馈待提交",
        detail: lessonFeedbackPending.length ? "近30天有课程尚未提交反馈" : "课后反馈已完成",
        count: lessonFeedbackPending.length,
        target: "teacher-history",
        urgent: lessonFeedbackPending.length > 0,
      },
      {
        key: "student-feedbacks",
        title: "其他老师反馈待阅读",
        detail: unreadOtherFeedback ? "近7天有带课学生的新反馈" : "没有新的交接反馈",
        count: unreadOtherFeedback,
        target: "teacher-student-feedbacks",
        urgent: false,
      },
      {
        key: "manager-feedback",
        title: "管理反馈待确认",
        detail: feedbackState.pendingAckCount ? "请阅读后确认已知悉" : "没有待确认管理反馈",
        count: feedbackState.pendingAckCount,
        target: "teacher-reports",
        urgent: feedbackState.pendingAckCount > 0,
      },
      {
        key: "notices",
        title: "公司通知待阅读",
        detail: noticeState.unreadNotices.length ? "重要通知需留下阅读记录" : "通知已读",
        count: noticeState.unreadNotices.length,
        target: "teacher-reports",
        urgent: noticeState.unreadNotices.some((row) => row.important),
      },
      {
        key: "reports",
        title: "教学报告待完成",
        detail: reportItems.length ? "阶段报告和结课报告可在手机保存草稿" : "当前没有待完成报告",
        count: reportItems.length,
        target: "teacher-reports",
        urgent: reportItems.length > 0,
      },
      {
        key: "expenses",
        title: "退回报销待补充",
        detail: rejectedExpenses ? "请查看退回原因并补充材料" : "没有待补件报销",
        count: rejectedExpenses,
        target: "teacher-expenses",
        urgent: rejectedExpenses > 0,
      },
    ];
    return ok({
      roleMode: "TEACHER",
      total: items.reduce((sum, item) => sum + item.count, 0),
      items,
      reportItems,
      capabilities: { studentWorkspace: false, operations: true, approvals: false, leads: false, teacherReports: true },
    });
  }

  const canAcademic = canUseMiniappAcademicDesk(user);
  const canLeads = canUseMiniappLeadDesk(user);
  const canApprovals = await canUseMiniappApprovalDesk(user);
  if (canAcademic) await syncRenewalTasks(user);
  const [openTickets, overdueTickets, communications, monthlyScheduling, renewalTasks, renewalXdf, overdueRenewals, dueLeads, approvalData] = await Promise.all([
    canAcademic ? prisma.ticket.count({ where: { isArchived: false, status: { in: OPEN_TICKET_STATUSES } } }) : 0,
    canAcademic
      ? prisma.ticket.count({ where: { isArchived: false, status: { in: OPEN_TICKET_STATUSES }, nextActionDue: { lt: now } } })
      : 0,
    canAcademic
      ? prisma.parentCommunicationTask.count({ where: { status: { in: OPEN_COMMUNICATION_STATUSES } } })
      : 0,
    canAcademic
      ? prisma.monthlySchedulingItem.count({ where: { campaign: { status: "OPEN" }, status: { in: ["NOT_SENT", "SENT", "VIEWED", "NO_RESPONSE", "NEEDS_CLARIFICATION"] } } })
      : 0,
    canAcademic
      ? prisma.renewalTask.count({ where: { completedAt: null } })
      : 0,
    canAcademic
      ? prisma.renewalTask.count({ where: { completedAt: null, student: { sourceChannel: { name: LEGACY_XDF_SOURCE_CHANNEL_NAME } } } })
      : 0,
    canAcademic
      ? prisma.renewalTask.count({ where: { completedAt: null, nextFollowUpAt: { lte: now } } })
      : 0,
    canLeads
      ? prisma.lead.count({ where: { isArchived: false, status: { notIn: ["Converted", "Lost"] }, nextActionDue: { lte: now } } })
      : 0,
    canApprovals ? getApprovalInboxData(user.email, user.role) : null,
  ]);
  const approvalCount = approvalData?.summary.manager ?? 0;
  const items = [
    ...(canAcademic
      ? [
          { key: "tickets", title: "工单待处理", detail: `${overdueTickets} 条已逾期`, count: openTickets, target: "requests", urgent: overdueTickets > 0 },
          { key: "communications", title: "家长沟通待完成", detail: "审核、转发微信群并留下发送记录", count: communications, target: "communications", urgent: communications > 0 },
          { key: "monthly-scheduling", title: "下月排课待确认", detail: "按学生和课程跟进家长时间", count: monthlyScheduling, target: "monthly-scheduling", urgent: monthlyScheduling > 0 },
          { key: "renewals", title: "续费待跟进", detail: `博思及其他 ${renewalTasks - renewalXdf} · 新东方 ${renewalXdf} · ${overdueRenewals} 条到期`, count: renewalTasks, target: "renewals", urgent: overdueRenewals > 0 },
        ]
      : []),
    ...(canApprovals
      ? [{ key: "approvals", title: "管理审批", detail: `${approvalData?.summary.overdue ?? 0} 项等待超过24小时`, count: approvalCount, target: "approvals", urgent: (approvalData?.summary.overdue ?? 0) > 0 }]
      : []),
    ...(canLeads
      ? [{ key: "leads", title: "新咨询待跟进", detail: "已超过下次跟进时间", count: dueLeads, target: "leads", urgent: dueLeads > 0 }]
      : []),
  ];
  return ok({
    roleMode: canApprovals ? "MANAGER" : canAcademic ? "ACADEMIC" : "STAFF",
    total: items.reduce((sum, item) => sum + item.count, 0),
    items,
    capabilities: { studentWorkspace: canAcademic, operations: canAcademic || canApprovals, approvals: canApprovals, leads: canLeads, teacherReports: false },
  });
}
