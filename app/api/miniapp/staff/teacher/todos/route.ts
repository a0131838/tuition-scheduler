import { ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import { getTeacherPayrollPublishForTeacher, monthKey } from "@/lib/teacher-payroll";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const now = new Date();
  const lookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const teacherWhere = { OR: [{ teacherId: access.teacherId }, { teacherId: null, class: { teacherId: access.teacherId } }] };
  const [payroll, sessions, rejectedExpenses, taughtRows] = await Promise.all([
    getTeacherPayrollPublishForTeacher({ teacherId: access.teacherId, month: monthKey(now), scope: "all" }),
    prisma.session.findMany({
      where: { ...teacherWhere, endAt: { gte: lookback, lte: now } },
      include: {
        attendances: { select: { studentId: true, status: true } },
        feedbacks: { where: { teacherId: access.teacherId }, select: { id: true, content: true } },
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
    prisma.expenseClaim.count({
      where: { submitterUserId: access.user.id, archivedAt: null, status: "REJECTED" },
    }),
    prisma.attendance.findMany({
      where: { session: teacherWhere },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
  ]);
  const visibleSessions = sessions.filter((row) => !isSessionFullyCancelled(row));
  const attendancePending = visibleSessions.filter((row) => {
    const names = getVisibleSessionStudentNames(row);
    return !names.length || row.attendances.length < names.length || row.attendances.some((item) => item.status === "UNMARKED");
  });
  const feedbackPending = visibleSessions.filter((row) => !row.feedbacks.some((item) => String(item.content ?? "").trim()));
  const taughtStudentIds = taughtRows.map((row) => row.studentId);
  let unreadOtherFeedback = 0;
  if (taughtStudentIds.length) {
    const feedbackRows = await prisma.sessionFeedback.findMany({
      where: {
        teacherId: { not: access.teacherId },
        submittedAt: { gte: recent, lte: now },
        content: { not: "" },
        session: { attendances: { some: { studentId: { in: taughtStudentIds } } } },
      },
      select: { id: true },
      take: 1000,
    });
    const readRows = feedbackRows.length
      ? await prisma.teacherFeedbackRead.findMany({
          where: { userId: access.user.id, feedbackId: { in: feedbackRows.map((row) => row.id) } },
          select: { feedbackId: true },
        })
      : [];
    const readSet = new Set(readRows.map((row) => row.feedbackId));
    unreadOtherFeedback = feedbackRows.filter((row) => !readSet.has(row.id)).length;
  }
  const payrollPending = Boolean(payroll && !payroll.confirmedAt);
  const total = Number(payrollPending) + attendancePending.length + feedbackPending.length + rejectedExpenses + unreadOtherFeedback;
  const items = [
    {
      key: "payroll",
      title: "确认工资单",
      detail: payrollPending ? `${payroll?.month} 工资单等待你核对` : "当前没有待确认工资单",
      count: payrollPending ? 1 : 0,
      urgent: payrollPending,
      target: "payroll",
    },
    {
      key: "attendance",
      title: "完成点名",
      detail: attendancePending.length ? "近 30 天有课程尚未完成点名" : "点名已完成",
      count: attendancePending.length,
      urgent: attendancePending.length > 0,
      target: "schedule",
    },
    {
      key: "feedback",
      title: "提交课后反馈",
      detail: feedbackPending.length ? "近 30 天有课程尚未提交反馈" : "课后反馈已完成",
      count: feedbackPending.length,
      urgent: feedbackPending.length > 0,
      target: "history",
    },
    {
      key: "student-feedbacks",
      title: "查看交接反馈",
      detail: unreadOtherFeedback ? "近 7 天有其他老师的新反馈" : "没有新的交接反馈",
      count: unreadOtherFeedback,
      urgent: false,
      target: "student-feedbacks",
    },
    {
      key: "expenses",
      title: "补充报销材料",
      detail: rejectedExpenses ? "有被退回的报销需要修改" : "没有待补件报销",
      count: rejectedExpenses,
      urgent: rejectedExpenses > 0,
      target: "expenses",
    },
  ];
  const sessionTodos = Array.from(new Map([...attendancePending, ...feedbackPending].map((row) => [row.id, row])).values())
    .slice(0, 20)
    .map((row) => ({
      id: row.id,
      timeText: formatBusinessDateTime(row.startAt),
      courseLabel: [row.class.course.name, row.class.subject?.name].filter(Boolean).join(" / "),
      studentText: getVisibleSessionStudentNames(row).join("、") || "-",
      attendancePending: attendancePending.some((item) => item.id === row.id),
      feedbackPending: feedbackPending.some((item) => item.id === row.id),
    }));
  return ok({ total, summary: { payrollPending: Number(payrollPending), attendancePending: attendancePending.length, feedbackPending: feedbackPending.length, unreadOtherFeedback, rejectedExpenses }, items, sessionTodos });
}
