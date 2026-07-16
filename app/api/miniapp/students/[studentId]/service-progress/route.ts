import { academicRiskLabel } from "@/lib/academic-management";
import { careReportParentAccessAllowed } from "@/lib/care-reports";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import {
  compactParentProgressText,
  parentProgressTimelineItem,
  parentServicePlanCopy,
  parentServiceWeekRange,
  sortParentProgressTimeline,
} from "@/lib/miniapp-parent-service-progress";
import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { bad, courseLabel, ok, requireMiniappStudentAccess, sessionTeacherName } from "../../../_lib";

const CLOSED_TICKET_STATUSES = ["Completed", "Cancelled", "Closed", "已完成", "已关闭"];
const OPEN_CARE_TASK_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_EXTERNAL", "BLOCKED"] as const;

function isStudentSessionCancelled(session: { attendances: Array<{ status: string }> }) {
  return session.attendances.some((row) => row.status === "EXCUSED");
}

function feedbackSummary(content: string) {
  const sections = parseParentFeedbackSections(content);
  return compactParentProgressText(sections.classPerformance || sections.lessonFocus || content, 180);
}

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      servicePlanType: true,
      academicRiskLevel: true,
      nextAction: true,
      nextActionDue: true,
      advisorOwner: true,
    },
  });
  if (!student) return bad("Student not found", 404);

  const now = new Date();
  const week = parentServiceWeekRange(now);
  const historyFrom = new Date(week.start.getTime() - 45 * 24 * 60 * 60 * 1000);
  const upcomingTo = new Date(week.end.getTime() + 21 * 24 * 60 * 60 * 1000);
  const canViewSchedule = auth.link.canViewSchedule;
  const canViewFeedback = auth.link.canViewFeedback;
  const hasManagedCare = student.servicePlanType === "FULL_CARE" || student.servicePlanType === "ACADEMIC_MANAGEMENT";

  const [sessions, tickets, careEngagement] = await Promise.all([
    canViewSchedule
      ? prisma.session.findMany({
          where: {
            startAt: { gte: historyFrom, lte: upcomingTo },
            ...sessionBelongsToStudentWhere(studentId),
          },
          select: {
            id: true,
            startAt: true,
            endAt: true,
            teacher: { select: { name: true } },
            class: {
              select: {
                teacher: { select: { name: true } },
                course: { select: { name: true } },
                subject: { select: { name: true } },
                level: { select: { name: true } },
              },
            },
            attendances: { where: { studentId }, select: { status: true }, take: 1 },
            feedbacks: {
              where: canViewFeedback ? { content: { not: "" } } : { id: "__not_visible__" },
              select: { id: true, content: true, submittedAt: true, teacher: { select: { name: true } } },
              orderBy: { submittedAt: "desc" },
            },
          },
          orderBy: { startAt: "desc" },
          take: 180,
          relationLoadStrategy: "join",
        })
      : Promise.resolve([]),
    prisma.ticket.findMany({
      where: { studentId, isArchived: false, parentVisible: true },
      select: {
        id: true,
        ticketNo: true,
        type: true,
        status: true,
        owner: true,
        parentPublicSummary: true,
        parentCompletionResult: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    hasManagedCare
      ? prisma.careEngagement.findFirst({
          where: { studentId, status: "ACTIVE" },
          select: {
            id: true,
            programType: true,
            startDate: true,
            nextReportDueAt: true,
            caseOwner: { select: { name: true } },
            universityProfile: true,
            reports: {
              where: { status: "PUBLISHED" },
              select: {
                id: true,
                status: true,
                reportType: true,
                periodLabel: true,
                title: true,
                publishedAt: true,
              },
              orderBy: { publishedAt: "desc" },
              take: 12,
            },
            activities: {
              where: {
                publicationStatus: "PUBLISHED",
                audience: { in: ["PARENT", "PARENT_AND_STUDENT"] },
                publicSummary: { not: null },
              },
              select: { id: true, title: true, publicSummary: true, occurredAt: true },
              orderBy: { occurredAt: "desc" },
              take: 12,
            },
            tasks: {
              where: {
                parentActionRequired: true,
                parentVisibleSummary: { not: null },
                status: { in: [...OPEN_CARE_TASK_STATUSES] },
              },
              select: { id: true, parentVisibleSummary: true, dueAt: true, status: true },
              orderBy: { dueAt: "asc" },
              take: 5,
            },
          },
          orderBy: { createdAt: "desc" },
          relationLoadStrategy: "join",
        })
      : Promise.resolve(null),
  ]);

  const visibleSessions = sessions.filter((session) => !isStudentSessionCancelled(session));
  const completedThisWeek = visibleSessions.filter(
    (session) => session.startAt >= week.start && session.endAt <= now,
  );
  const scheduledThisWeek = visibleSessions.filter(
    (session) => session.startAt >= week.start && session.startAt <= week.end,
  );
  const feedbackThisWeek = completedThisWeek.reduce((sum, session) => sum + session.feedbacks.length, 0);
  const nextSession = visibleSessions
    .filter((session) => session.startAt > now)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
  const openTickets = tickets.filter((ticket) => !CLOSED_TICKET_STATUSES.includes(ticket.status));
  const parentActions = (careEngagement?.tasks ?? [])
    .map((task) => ({
      id: task.id,
      summary: compactParentProgressText(task.parentVisibleSummary, 180),
      dueAt: task.dueAt.toISOString(),
      dueAtText: formatBusinessDateOnly(task.dueAt),
      status: task.status,
    }))
    .filter((task) => task.summary);

  const nextStep = parentActions[0]
    ? { label: "需要家长配合", text: parentActions[0].summary, dueText: parentActions[0].dueAtText }
    : student.nextAction
      ? {
          label: "下一步",
          text: compactParentProgressText(student.nextAction, 180),
          dueText: student.nextActionDue ? formatBusinessDateOnly(student.nextActionDue) : null,
        }
      : nextSession
        ? {
            label: "下一节课",
            text: `${formatBusinessDateTime(nextSession.startAt)} · ${courseLabel(nextSession.class)}`,
            dueText: null,
          }
        : openTickets[0]
          ? { label: "服务请求处理中", text: openTickets[0].parentPublicSummary || openTickets[0].type, dueText: null }
          : { label: "当前状态", text: "暂无需要家长处理的事项", dueText: null };

  const lessonTimeline = visibleSessions
    .filter((session) => session.endAt <= now)
    .slice(0, 8)
    .map((session) =>
      parentProgressTimelineItem({
        id: `lesson-${session.id}`,
        kind: "LESSON",
        title: courseLabel(session.class),
        summary: `${sessionTeacherName(session) || "任课老师"} · 已完成`,
        occurredAt: session.endAt,
      }),
    );
  const feedbackTimeline = canViewFeedback
    ? visibleSessions.flatMap((session) =>
        session.feedbacks.slice(0, 1).map((feedback) =>
          parentProgressTimelineItem({
            id: `feedback-${feedback.id}`,
            kind: "FEEDBACK",
            title: `${feedback.teacher.name}的课后反馈`,
            summary: feedbackSummary(feedback.content),
            occurredAt: feedback.submittedAt,
          }),
        ),
      )
    : [];
  const requestTimeline = tickets.map((ticket) =>
    parentProgressTimelineItem({
      id: `request-${ticket.id}`,
      kind: "REQUEST",
      title: `${ticket.type} · ${ticket.status}`,
      summary: ticket.parentCompletionResult || ticket.parentPublicSummary || "服务请求状态已更新",
      occurredAt: ticket.updatedAt,
    }),
  );
  const careTimeline = (careEngagement?.activities ?? []).map((activity) =>
    parentProgressTimelineItem({
      id: `care-${activity.id}`,
      kind: "CARE",
      title: activity.title,
      summary: activity.publicSummary,
      occurredAt: activity.occurredAt,
    }),
  );

  const service = parentServicePlanCopy(student.servicePlanType);
  const visibleReports = (careEngagement?.reports ?? []).filter((report) => careReportParentAccessAllowed({
    status: report.status,
    engagement: {
      programType: careEngagement?.programType ?? "PRE_UNIVERSITY_CARE",
      universityProfile: careEngagement?.universityProfile ?? null,
    },
  }));
  return ok({
    student: {
      id: student.id,
      name: student.name,
      school: student.school,
      grade: student.grade,
      servicePlanType: student.servicePlanType || "STANDARD_COURSE",
      riskLabel: academicRiskLabel(student.academicRiskLevel),
    },
    service,
    period: { label: week.label, start: week.start.toISOString(), end: week.end.toISOString() },
    summary: {
      completedLessons: completedThisWeek.length,
      scheduledLessons: scheduledThisWeek.length,
      feedbackCount: canViewFeedback ? feedbackThisWeek : null,
      openRequestCount: openTickets.length,
    },
    permissions: { canViewSchedule, canViewFeedback },
    responsiblePerson: careEngagement?.caseOwner?.name || student.advisorOwner || "博思服务团队",
    nextStep,
    nextSession: nextSession
      ? {
          id: nextSession.id,
          startAt: nextSession.startAt.toISOString(),
          startText: formatBusinessDateTime(nextSession.startAt),
          courseLabel: courseLabel(nextSession.class),
          teacherName: sessionTeacherName(nextSession),
        }
      : null,
    care: {
      active: Boolean(careEngagement),
      startDate: careEngagement?.startDate ? formatBusinessDateOnly(careEngagement.startDate) : null,
      nextReportDue: careEngagement?.nextReportDueAt ? formatBusinessDateOnly(careEngagement.nextReportDueAt) : null,
      publishedActivityCount: careEngagement?.activities.length ?? 0,
      publishedReportCount: visibleReports.length,
      latestReport: visibleReports[0] ? {
        id: visibleReports[0].id,
        reportType: visibleReports[0].reportType,
        periodLabel: visibleReports[0].periodLabel,
        title: visibleReports[0].title,
        publishedAt: visibleReports[0].publishedAt?.toISOString() ?? null,
      } : null,
    },
    parentActions,
    timeline: sortParentProgressTimeline([...careTimeline, ...feedbackTimeline, ...requestTimeline, ...lessonTimeline]),
  });
}
