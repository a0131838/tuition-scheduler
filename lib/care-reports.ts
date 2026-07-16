import type {
  CareReportStatus,
  CareReportType,
  CareRiskLevel,
  Prisma,
} from "@prisma/client";
import { isManagerUser } from "@/lib/auth";
import {
  assertCareReportReady,
  assertCareReportTransition,
  canEditCareReport,
  careReportRiskLevel,
  careReportText,
  careReportType,
  requiredCareReportText,
  reportTypeLabel,
} from "@/lib/care-report-validation";
import { compactParentProgressText } from "@/lib/miniapp-parent-service-progress";
import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";

type ReportActor = { id: string; email: string; name: string; role: string };

function reportDate(value: unknown, endOfDay = false) {
  const text = careReportText(value, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Valid report date is required");
  const date = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00"}+08:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Valid report date is required");
  return date;
}

function reportAudit(actor: ReportActor, action: string, reportId: string, meta?: Prisma.InputJsonValue) {
  return {
    actorEmail: actor.email.trim().toLowerCase(),
    actorName: actor.name,
    actorRole: actor.role,
    module: "CARE_REPORT",
    action,
    entityType: "CareReport",
    entityId: reportId,
    meta,
  };
}

function lines(values: Array<string | null | undefined>, fallback = "") {
  const unique = Array.from(new Set(values.map((item) => String(item ?? "").trim()).filter(Boolean)));
  return unique.length ? unique.map((item) => `- ${item}`).join("\n") : fallback;
}

function feedbackText(content: string) {
  const parsed = parseParentFeedbackSections(content);
  return compactParentProgressText(parsed.classPerformance || parsed.lessonFocus || content, 180);
}

function maxRisk(levels: CareRiskLevel[]): CareRiskLevel {
  const order: CareRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  return levels.reduce((current, level) => order.indexOf(level) > order.indexOf(current) ? level : current, "LOW");
}

async function sourceDraft(
  tx: Prisma.TransactionClient,
  engagement: { id: string; studentId: string; student: { name: string } },
  reportType: CareReportType,
  periodLabel: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const [sessions, activities, tasks, attachments] = await Promise.all([
    tx.session.findMany({
      where: {
        startAt: { gte: periodStart, lte: periodEnd },
        ...sessionBelongsToStudentWhere(engagement.studentId),
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        class: { select: { course: { select: { name: true } }, subject: { select: { name: true } } } },
        attendances: { where: { studentId: engagement.studentId }, select: { status: true }, take: 1 },
        feedbacks: {
          where: { content: { not: "" } },
          select: { id: true, content: true, submittedAt: true },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { startAt: "asc" },
      take: 300,
    }),
    tx.careActivity.findMany({
      where: { engagementId: engagement.id, occurredAt: { gte: periodStart, lte: periodEnd } },
      select: {
        id: true,
        category: true,
        title: true,
        factEvidence: true,
        professionalJudgment: true,
        actionTaken: true,
        outcomeVerification: true,
        nextAction: true,
        riskLevel: true,
        publicSummary: true,
      },
      orderBy: { occurredAt: "asc" },
      take: 200,
    }),
    tx.careTask.findMany({
      where: {
        engagementId: engagement.id,
        OR: [
          { status: { notIn: ["DONE", "CANCELLED"] }, createdAt: { lte: periodEnd } },
          { status: "DONE", completedAt: { gte: periodStart, lte: periodEnd } },
        ],
      },
      select: { id: true, title: true, status: true, dueAt: true, completionEvidence: true },
      orderBy: { dueAt: "asc" },
      take: 200,
    }),
    tx.careAttachment.findMany({
      where: {
        engagementId: engagement.id,
        archivedAt: null,
        OR: [
          { occurredAt: { gte: periodStart, lte: periodEnd } },
          { occurredAt: null, createdAt: { gte: periodStart, lte: periodEnd } },
        ],
      },
      select: { id: true, title: true, category: true, sourceLabel: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ]);

  const visibleSessions = sessions.filter((session) => !session.attendances.some((row) => row.status === "EXCUSED"));
  const feedbacks = visibleSessions.flatMap((session) => session.feedbacks);
  const attendanceIssues = visibleSessions.filter((session) =>
    session.attendances.some((row) => !["PRESENT", "UNMARKED"].includes(row.status)),
  );
  const courseNames = Array.from(new Set(visibleSessions.map((session) => session.class.course?.name || session.class.subject?.name).filter(Boolean)));
  const academicActivities = activities.filter((item) => item.category === "ACADEMIC");
  const schoolActivities = activities.filter((item) => item.category === "SCHOOL");
  const lifeActivities = activities.filter((item) => item.category === "LIFE");
  const riskActivities = activities.filter((item) => item.category === "RISK" || item.riskLevel !== "LOW");
  const completedTasks = tasks.filter((item) => item.status === "DONE");
  const openTasks = tasks.filter((item) => !["DONE", "CANCELLED"].includes(item.status));
  const title = `${engagement.student.name} ${periodLabel} ${reportTypeLabel(reportType)}`;
  const overallSummary = `${periodLabel}共安排或完成${visibleSessions.length}节课程，收到${feedbacks.length}条老师反馈，记录${activities.length}项托管跟进和${attachments.length}份服务证据。`;
  const academicSummary = lines([
    courseNames.length ? `涉及课程：${courseNames.join("、")}` : null,
    `课程记录${visibleSessions.length}节，老师反馈${feedbacks.length}条。`,
    attendanceIssues.length ? `有${attendanceIssues.length}节课程存在需核对的出勤状态。` : "未发现需要升级处理的出勤异常。",
    ...feedbacks.slice(0, 5).map((item) => feedbackText(item.content)),
    ...academicActivities.map((item) => item.publicSummary || item.factEvidence),
  ], "本期暂无学业来源记录，请负责人补充。 ");
  const actionsCompleted = lines([
    ...activities.map((item) => item.actionTaken),
    ...completedTasks.map((item) => item.completionEvidence || item.title),
  ], "本期已完成服务动作请负责人补充。");
  const nextPlan = lines([
    ...activities.map((item) => item.nextAction),
    ...openTasks.slice(0, 8).map((item) => `${item.title}（截止 ${item.dueAt.toISOString().slice(0, 10)}）`),
  ], "下一阶段计划请负责人补充。");
  const evidenceSummary = lines(attachments.map((item) => `${item.title}${item.sourceLabel ? `（${item.sourceLabel}）` : ""}`));
  const riskLevel = maxRisk(riskActivities.map((item) => item.riskLevel));
  const sourceSnapshotJson = {
    generatedAt: new Date().toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    lessonCount: visibleSessions.length,
    feedbackCount: feedbacks.length,
    activityCount: activities.length,
    attachmentCount: attachments.length,
    completedTaskCount: completedTasks.length,
    openTaskCount: openTasks.length,
    attendanceIssueCount: attendanceIssues.length,
    sessionIds: visibleSessions.map((item) => item.id),
    feedbackIds: feedbacks.map((item) => item.id),
  } satisfies Prisma.InputJsonObject;

  return {
    title,
    riskLevel,
    overallSummary,
    academicSummary,
    schoolSummary: lines(schoolActivities.map((item) => item.publicSummary || item.factEvidence)),
    lifeSummary: lines(lifeActivities.map((item) => item.publicSummary || item.factEvidence)),
    riskSummary: lines(riskActivities.map((item) => item.professionalJudgment || item.factEvidence), "本期未记录需要升级处理的风险。"),
    actionsCompleted,
    evidenceSummary,
    nextPlan,
    sourceSnapshotJson,
    activityIds: activities.map((item) => item.id),
    attachmentIds: attachments.map((item) => item.id),
  };
}

export async function createCareReportDraft(input: {
  actor: ReportActor;
  engagementId: string;
  reportType: unknown;
  periodLabel: unknown;
  periodStart: unknown;
  periodEnd: unknown;
}) {
  const reportType = careReportType(input.reportType);
  const periodLabel = requiredCareReportText(input.periodLabel, "Period label", 120);
  const periodStart = reportDate(input.periodStart);
  const periodEnd = reportDate(input.periodEnd, true);
  if (periodEnd < periodStart) throw new Error("Report end date must not be before start date");

  return prisma.$transaction(async (tx) => {
    const engagement = await tx.careEngagement.findUnique({
      where: { id: input.engagementId },
      select: { id: true, studentId: true, status: true, student: { select: { name: true } } },
    });
    if (!engagement) throw new Error("Care project not found");
    if (["COMPLETED", "CANCELLED"].includes(engagement.status)) throw new Error("Closed care projects cannot create reports");
    const existing = await tx.careReport.findUnique({
      where: { engagementId_reportType_periodStart_periodEnd: { engagementId: engagement.id, reportType, periodStart, periodEnd } },
      select: { id: true },
    });
    if (existing) throw new Error("A report already exists for this type and period");

    const draft = await sourceDraft(tx, engagement, reportType, periodLabel, periodStart, periodEnd);
    const report = await tx.careReport.create({
      data: {
        studentId: engagement.studentId,
        engagementId: engagement.id,
        reportType,
        periodLabel,
        periodStart,
        periodEnd,
        title: draft.title,
        riskLevel: draft.riskLevel,
        overallSummary: draft.overallSummary,
        academicSummary: draft.academicSummary,
        schoolSummary: draft.schoolSummary || null,
        lifeSummary: draft.lifeSummary || null,
        riskSummary: draft.riskSummary,
        actionsCompleted: draft.actionsCompleted,
        evidenceSummary: draft.evidenceSummary || null,
        nextPlan: draft.nextPlan,
        sourceSnapshotJson: draft.sourceSnapshotJson,
        preparedByUserId: input.actor.id,
      },
    });
    if (draft.activityIds.length) {
      await tx.careReportActivity.createMany({
        data: draft.activityIds.map((activityId) => ({ reportId: report.id, activityId })),
      });
    }
    if (draft.attachmentIds.length) {
      await tx.careReportAttachment.createMany({
        data: draft.attachmentIds.map((attachmentId) => ({ reportId: report.id, attachmentId })),
      });
    }
    await tx.auditLog.create({
      data: reportAudit(input.actor, "CREATE_DRAFT", report.id, {
        engagementId: engagement.id,
        reportType,
        periodLabel,
        sourceSnapshot: draft.sourceSnapshotJson,
      }),
    });
    return report;
  });
}

export async function updateCareReportDraft(input: {
  actor: ReportActor;
  engagementId: string;
  reportId: string;
  version: number;
  title: unknown;
  riskLevel: unknown;
  overallSummary: unknown;
  academicSummary: unknown;
  schoolSummary: unknown;
  lifeSummary: unknown;
  riskSummary: unknown;
  actionsCompleted: unknown;
  evidenceSummary: unknown;
  nextPlan: unknown;
  studentActions: unknown;
  parentActions: unknown;
  internalNote: unknown;
}) {
  const data = {
    title: requiredCareReportText(input.title, "Title", 240),
    riskLevel: careReportRiskLevel(input.riskLevel),
    overallSummary: requiredCareReportText(input.overallSummary, "Overall summary"),
    academicSummary: careReportText(input.academicSummary) || null,
    schoolSummary: careReportText(input.schoolSummary) || null,
    lifeSummary: careReportText(input.lifeSummary) || null,
    riskSummary: careReportText(input.riskSummary) || null,
    actionsCompleted: requiredCareReportText(input.actionsCompleted, "Completed actions"),
    evidenceSummary: careReportText(input.evidenceSummary) || null,
    nextPlan: requiredCareReportText(input.nextPlan, "Next plan"),
    studentActions: careReportText(input.studentActions) || null,
    parentActions: careReportText(input.parentActions) || null,
    internalNote: careReportText(input.internalNote) || null,
  };
  return prisma.$transaction(async (tx) => {
    const report = await tx.careReport.findFirst({
      where: { id: input.reportId, engagementId: input.engagementId },
      select: { status: true },
    });
    if (!report) throw new Error("Care report not found");
    if (!canEditCareReport(report.status)) throw new Error("Only draft or returned reports can be edited");
    const updated = await tx.careReport.updateMany({
      where: { id: input.reportId, version: input.version, status: report.status },
      data: { ...data, version: { increment: 1 } },
    });
    if (updated.count !== 1) throw new Error("This report was updated by another user. Refresh and try again");
    await tx.auditLog.create({ data: reportAudit(input.actor, "UPDATE_DRAFT", input.reportId, { riskLevel: data.riskLevel }) });
  });
}

async function canReview(actor: ReportActor, engagementId: string) {
  if (actor.role === "ADMIN" || await isManagerUser(actor as never)) return true;
  const membership = await prisma.careEngagementMember.findFirst({
    where: { engagementId, userId: actor.id, isActive: true, role: { in: ["REVIEWER", "EXECUTIVE_OWNER"] } },
    select: { id: true },
  });
  return Boolean(membership);
}

function nextMonthlyReportDue(periodEnd: Date) {
  const singapore = new Date(periodEnd.getTime() + 8 * 60 * 60 * 1000);
  const year = singapore.getUTCFullYear();
  const month = singapore.getUTCMonth();
  return new Date(Date.UTC(year, month + 2, 1) - 8 * 60 * 60 * 1000 - 1);
}

export async function changeCareReportStatus(input: {
  actor: ReportActor;
  engagementId: string;
  reportId: string;
  version: number;
  nextStatus: CareReportStatus;
  reviewNote?: unknown;
}) {
  const reviewNote = careReportText(input.reviewNote, 3000);
  const report = await prisma.careReport.findFirst({
    where: { id: input.reportId, engagementId: input.engagementId },
    include: {
      engagement: { include: { universityProfile: true } },
      _count: { select: { activityLinks: true, attachmentLinks: true } },
    },
  });
  if (!report) throw new Error("Care report not found");
  assertCareReportTransition(report.status, input.nextStatus);
  const reviewer = await canReview(input.actor, report.engagementId);
  if (["RETURNED", "APPROVED", "PUBLISHED", "REVOKED"].includes(input.nextStatus) && !reviewer) {
    throw new Error("Only the assigned reviewer or a manager can perform this report action");
  }
  if (input.nextStatus === "RETURNED" && !reviewNote) throw new Error("Return reason is required");
  if (input.nextStatus === "REVOKED" && !reviewNote) throw new Error("Revocation reason is required");
  if (input.nextStatus === "SUBMITTED") {
    assertCareReportReady({
      title: report.title,
      overallSummary: report.overallSummary,
      actionsCompleted: report.actionsCompleted,
      nextPlan: report.nextPlan,
      sourceSnapshotJson: report.sourceSnapshotJson,
      activityLinkCount: report._count.activityLinks,
      attachmentLinkCount: report._count.attachmentLinks,
    });
  }
  if (input.nextStatus === "PUBLISHED") {
    const profile = report.engagement.universityProfile;
    if (["UNIVERSITY_GROWTH", "POSTGRAD_PREPARATION", "CAREER_LAUNCH"].includes(report.engagement.programType)) {
      const visible = profile?.parentVisibilityJson && typeof profile.parentVisibilityJson === "object" && !Array.isArray(profile.parentVisibilityJson)
        ? (profile.parentVisibilityJson as { sectionIds?: unknown }).sectionIds
        : [];
      if (!profile || !["GRANTED", "LIMITED"].includes(profile.studentConsentStatus) || !Array.isArray(visible) || !visible.includes("formal_reports")) {
        throw new Error("Student consent for formal parent reports is required before publication");
      }
    }
  }

  const now = new Date();
  const statusData: Prisma.CareReportUncheckedUpdateManyInput = {
    status: input.nextStatus,
    version: { increment: 1 },
  };
  if (input.nextStatus === "SUBMITTED") {
    statusData.submittedAt = now;
    statusData.submittedByUserId = input.actor.id;
    statusData.reviewNote = null;
  } else if (input.nextStatus === "RETURNED") {
    statusData.reviewedAt = now;
    statusData.reviewedByUserId = input.actor.id;
    statusData.reviewNote = reviewNote;
  } else if (input.nextStatus === "APPROVED") {
    statusData.reviewedAt = now;
    statusData.reviewedByUserId = input.actor.id;
    statusData.approvedAt = now;
    statusData.approvedByUserId = input.actor.id;
    statusData.reviewNote = reviewNote || null;
  } else if (input.nextStatus === "PUBLISHED") {
    statusData.publishedAt = now;
    statusData.publishedByUserId = input.actor.id;
  } else if (input.nextStatus === "REVOKED") {
    statusData.revokedAt = now;
    statusData.revokedByUserId = input.actor.id;
    statusData.reviewNote = reviewNote;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.careReport.updateMany({
      where: { id: report.id, version: input.version, status: report.status },
      data: statusData,
    });
    if (updated.count !== 1) throw new Error("This report was updated by another user. Refresh and try again");
    if (input.nextStatus === "PUBLISHED" && report.reportType === "MONTHLY") {
      await tx.careEngagement.update({
        where: { id: report.engagementId },
        data: { nextReportDueAt: nextMonthlyReportDue(report.periodEnd) },
      });
    }
    await tx.auditLog.create({
      data: reportAudit(input.actor, `STATUS_${input.nextStatus}`, report.id, {
        from: report.status,
        to: input.nextStatus,
        reviewNote: reviewNote || null,
      }),
    });
  });
}

export function careReportParentAccessAllowed(report: {
  status: CareReportStatus;
  engagement: {
    programType: string;
    universityProfile: { studentConsentStatus: string; parentVisibilityJson: Prisma.JsonValue | null } | null;
  };
}) {
  if (report.status !== "PUBLISHED") return false;
  if (!["UNIVERSITY_GROWTH", "POSTGRAD_PREPARATION", "CAREER_LAUNCH"].includes(report.engagement.programType)) return true;
  const profile = report.engagement.universityProfile;
  if (!profile || !["GRANTED", "LIMITED"].includes(profile.studentConsentStatus)) return false;
  if (!profile.parentVisibilityJson || typeof profile.parentVisibilityJson !== "object" || Array.isArray(profile.parentVisibilityJson)) return false;
  const ids = (profile.parentVisibilityJson as { sectionIds?: unknown }).sectionIds;
  return Array.isArray(ids) && ids.includes("formal_reports");
}
