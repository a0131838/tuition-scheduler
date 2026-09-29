import {
  CareContinuationRecommendation,
  CareCoverageStatus,
  CareParentQuestionStatus,
  CareRiskCaseStatus,
  CareRiskLevel,
  CareServiceReviewStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parentCareTransaction, requireParentCareReportAccess, type ParentCareReportScope } from "@/lib/parent-care-reports";
import { requireCareReportWriteAccess } from "@/lib/care-report-access";
import { careText, parseCareDateTime, requiredCareText } from "@/lib/care-validation";

type CareActor = { id: string; email: string; name: string; role: string };

const RISK_SLA_MINUTES: Record<CareRiskLevel, number> = {
  CRITICAL: 30,
  HIGH: 120,
  MEDIUM: 24 * 60,
  LOW: 72 * 60,
};

const RISK_TRANSITIONS: Record<CareRiskCaseStatus, CareRiskCaseStatus[]> = {
  OPEN: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["MONITORING", "RESOLVED"],
  MONITORING: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const COVERAGE_TRANSITIONS: Record<CareCoverageStatus, CareCoverageStatus[]> = {
  SCHEDULED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const REVIEW_TRANSITIONS: Record<CareServiceReviewStatus, CareServiceReviewStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED"],
  APPROVED: [],
};

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  const normalized = String(value ?? "").trim().toUpperCase() as T;
  if (!values.includes(normalized)) throw new Error(`Valid ${label} is required`);
  return normalized;
}

function auditData(actor: CareActor, action: string, entityType: string, entityId: string, meta?: Prisma.InputJsonValue) {
  return {
    actorEmail: actor.email.trim().toLowerCase(),
    actorName: actor.name,
    actorRole: actor.role,
    module: "CARE_MANAGEMENT",
    action,
    entityType,
    entityId,
    meta,
  };
}

export function careRiskResponseDueAt(riskLevel: CareRiskLevel, detectedAt: Date) {
  return new Date(detectedAt.getTime() + RISK_SLA_MINUTES[riskLevel] * 60_000);
}

export function careRiskSlaMinutes(riskLevel: CareRiskLevel) {
  return RISK_SLA_MINUTES[riskLevel];
}

export function isCareRiskSlaBreached(input: { status: CareRiskCaseStatus; responseDueAt: Date; acknowledgedAt: Date | null }, now = new Date()) {
  return input.status === "OPEN" && !input.acknowledgedAt && input.responseDueAt.getTime() < now.getTime();
}

export async function createCareRiskCase(input: {
  actor: CareActor;
  engagementId: string;
  title: unknown;
  riskLevel: unknown;
  facts: unknown;
  immediateAction: unknown;
  ownerUserId: unknown;
  backupOwnerUserId: unknown;
  detectedAt: unknown;
  parentVisible: boolean;
  publicSummary: unknown;
}) {
  const title = requiredCareText(input.title, "Risk title", 180);
  const riskLevel = enumValue(input.riskLevel, ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const, "risk level");
  const facts = requiredCareText(input.facts, "Facts", 4000);
  const immediateAction = requiredCareText(input.immediateAction, "Immediate action", 4000);
  const ownerUserId = requiredCareText(input.ownerUserId, "Owner", 80);
  const backupOwnerUserId = careText(input.backupOwnerUserId, 80);
  const detectedAt = parseCareDateTime(input.detectedAt);
  const publicSummary = careText(input.publicSummary, 2000);
  if (!detectedAt) throw new Error("Valid detected time is required");
  if (["HIGH", "CRITICAL"].includes(riskLevel) && !backupOwnerUserId) throw new Error("High and critical risks require a backup owner");
  if (backupOwnerUserId && backupOwnerUserId === ownerUserId) throw new Error("Backup owner must be different from the owner");
  if (input.parentVisible && !publicSummary) throw new Error("Parent-visible risks require a public summary");

  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    const [engagement, owner, backup] = await Promise.all([
      tx.careEngagement.findUnique({ where: { id: input.engagementId }, select: { id: true, studentId: true, status: true } }),
      tx.user.findUnique({ where: { id: ownerUserId }, select: { id: true } }),
      backupOwnerUserId ? tx.user.findUnique({ where: { id: backupOwnerUserId }, select: { id: true } }) : null,
    ]);
    if (!engagement) throw new Error("Care project not found");
    if (["COMPLETED", "CANCELLED"].includes(engagement.status)) throw new Error("Closed care projects cannot accept new risks");
    if (!owner) throw new Error("Risk owner not found");
    if (backupOwnerUserId && !backup) throw new Error("Backup owner not found");
    const risk = await tx.careRiskCase.create({
      data: {
        engagementId: engagement.id,
        studentId: engagement.studentId,
        title,
        riskLevel,
        facts,
        immediateAction,
        ownerUserId,
        backupOwnerUserId: backupOwnerUserId || null,
        detectedAt,
        responseDueAt: careRiskResponseDueAt(riskLevel, detectedAt),
        parentVisible: input.parentVisible,
        publicSummary: publicSummary || null,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      },
    });
    await tx.auditLog.create({ data: auditData(actor, "CREATE_RISK", "CareRiskCase", risk.id, { engagementId: engagement.id, riskLevel }) });
    return risk;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function changeCareRiskCaseStatus(input: {
  actor: CareActor;
  engagementId: string;
  riskCaseId: string;
  version: number;
  nextStatus: CareRiskCaseStatus;
  resolutionEvidence: unknown;
}) {
  const resolutionEvidence = careText(input.resolutionEvidence, 4000);
  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    const current = await tx.careRiskCase.findFirst({ where: { id: input.riskCaseId, engagementId: input.engagementId } });
    if (!current) throw new Error("Risk record not found");
    if (!RISK_TRANSITIONS[current.status].includes(input.nextStatus)) throw new Error(`Risk cannot move from ${current.status} to ${input.nextStatus}`);
    if (input.nextStatus === "RESOLVED" && !resolutionEvidence) throw new Error("Resolution evidence is required");
    const now = new Date();
    const result = await tx.careRiskCase.updateMany({
      where: { id: current.id, version: input.version },
      data: {
        status: input.nextStatus,
        acknowledgedAt: input.nextStatus === "ACKNOWLEDGED" ? now : undefined,
        resolvedAt: input.nextStatus === "RESOLVED" ? now : undefined,
        resolutionEvidence: input.nextStatus === "RESOLVED" ? resolutionEvidence : undefined,
        updatedByUserId: actor.id,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new Error("This risk was updated by another user. Refresh and try again");
    await tx.auditLog.create({ data: auditData(actor, "CHANGE_RISK_STATUS", "CareRiskCase", current.id, { from: current.status, to: input.nextStatus }) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function createCareCoveragePeriod(input: {
  actor: CareActor;
  engagementId: string;
  primaryUserId: unknown;
  backupUserId: unknown;
  startAt: unknown;
  endAt: unknown;
  reason: unknown;
  handoverSummary: unknown;
  criticalActions: unknown;
}) {
  const primaryUserId = requiredCareText(input.primaryUserId, "Primary owner", 80);
  const backupUserId = requiredCareText(input.backupUserId, "Backup owner", 80);
  const startAt = parseCareDateTime(input.startAt);
  const endAt = parseCareDateTime(input.endAt);
  const reason = requiredCareText(input.reason, "Coverage reason", 500);
  const handoverSummary = requiredCareText(input.handoverSummary, "Handover summary", 4000);
  const criticalActions = requiredCareText(input.criticalActions, "Critical actions", 4000);
  if (!startAt || !endAt || endAt <= startAt) throw new Error("Coverage end time must be after start time");
  if (primaryUserId === backupUserId) throw new Error("Backup owner must be different from the primary owner");

  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    const [engagement, primary, backup, overlap] = await Promise.all([
      tx.careEngagement.findUnique({ where: { id: input.engagementId }, select: { id: true, status: true } }),
      tx.user.findUnique({ where: { id: primaryUserId }, select: { id: true } }),
      tx.user.findUnique({ where: { id: backupUserId }, select: { id: true } }),
      tx.careCoveragePeriod.findFirst({
        where: {
          engagementId: input.engagementId,
          status: { in: ["SCHEDULED", "ACTIVE"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      }),
    ]);
    if (!engagement) throw new Error("Care project not found");
    if (["COMPLETED", "CANCELLED"].includes(engagement.status)) throw new Error("Closed care projects cannot schedule coverage");
    if (!primary || !backup) throw new Error("Coverage owner not found");
    if (overlap) throw new Error("This project already has overlapping backup coverage");
    const coverage = await tx.careCoveragePeriod.create({
      data: { engagementId: engagement.id, primaryUserId, backupUserId, startAt, endAt, reason, handoverSummary, criticalActions, createdByUserId: actor.id },
    });
    await tx.auditLog.create({ data: auditData(actor, "CREATE_COVERAGE", "CareCoveragePeriod", coverage.id, { engagementId: engagement.id, startAt: startAt.toISOString(), endAt: endAt.toISOString() }) });
    return coverage;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function changeCareCoverageStatus(input: {
  actor: CareActor;
  engagementId: string;
  coverageId: string;
  version: number;
  nextStatus: CareCoverageStatus;
}) {
  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    const current = await tx.careCoveragePeriod.findFirst({ where: { id: input.coverageId, engagementId: input.engagementId } });
    if (!current) throw new Error("Coverage record not found");
    if (!COVERAGE_TRANSITIONS[current.status].includes(input.nextStatus)) throw new Error(`Coverage cannot move from ${current.status} to ${input.nextStatus}`);
    const now = new Date();
    const result = await tx.careCoveragePeriod.updateMany({
      where: { id: current.id, version: input.version },
      data: {
        status: input.nextStatus,
        activatedAt: input.nextStatus === "ACTIVE" ? now : undefined,
        endedAt: input.nextStatus === "COMPLETED" || input.nextStatus === "CANCELLED" ? now : undefined,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new Error("This coverage record was updated by another user. Refresh and try again");
    await tx.auditLog.create({ data: auditData(actor, "CHANGE_COVERAGE_STATUS", "CareCoveragePeriod", current.id, { from: current.status, to: input.nextStatus }) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

function serviceReviewFields(input: {
  periodLabel: unknown;
  periodStart: unknown;
  periodEnd: unknown;
  goalsSummary: unknown;
  deliverySummary: unknown;
  outcomeSummary: unknown;
  evidenceSummary: unknown;
  continuationRecommendation: unknown;
  nextStagePlan: unknown;
  internalCommercialNote: unknown;
}) {
  const periodStart = parseCareDateTime(input.periodStart);
  const periodEnd = parseCareDateTime(input.periodEnd);
  if (!periodStart || !periodEnd || periodEnd < periodStart) throw new Error("Valid service review period is required");
  return {
    periodLabel: requiredCareText(input.periodLabel, "Period label", 120),
    periodStart,
    periodEnd,
    goalsSummary: requiredCareText(input.goalsSummary, "Goals summary", 4000),
    deliverySummary: requiredCareText(input.deliverySummary, "Delivery summary", 4000),
    outcomeSummary: requiredCareText(input.outcomeSummary, "Outcome summary", 4000),
    evidenceSummary: requiredCareText(input.evidenceSummary, "Evidence summary", 4000),
    continuationRecommendation: enumValue(input.continuationRecommendation, ["CONTINUE", "EXPAND", "ADJUST", "COMPLETE", "HOLD"] as const, "continuation recommendation"),
    nextStagePlan: requiredCareText(input.nextStagePlan, "Next stage plan", 4000),
    internalCommercialNote: careText(input.internalCommercialNote, 4000) || null,
  };
}

export async function createCareServiceReview(input: Parameters<typeof serviceReviewFields>[0] & { actor: CareActor; engagementId: string }) {
  const fields = serviceReviewFields(input);
  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    const engagement = await tx.careEngagement.findUnique({ where: { id: input.engagementId }, select: { id: true, studentId: true } });
    if (!engagement) throw new Error("Care project not found");
    const review = await tx.careServiceReview.create({ data: { engagementId: engagement.id, studentId: engagement.studentId, ...fields, preparedByUserId: actor.id } });
    await tx.auditLog.create({ data: auditData(actor, "CREATE_SERVICE_REVIEW", "CareServiceReview", review.id, { engagementId: engagement.id, periodLabel: fields.periodLabel }) });
    return review;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function updateCareServiceReview(input: Parameters<typeof serviceReviewFields>[0] & { actor: CareActor; engagementId: string; reviewId: string; version: number }) {
  const fields = serviceReviewFields(input);
  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    const current = await tx.careServiceReview.findFirst({ where: { id: input.reviewId, engagementId: input.engagementId }, select: { id: true, status: true } });
    if (!current) throw new Error("Service review not found");
    if (current.status !== "DRAFT") throw new Error("Only draft service reviews can be edited");
    const result = await tx.careServiceReview.updateMany({ where: { id: current.id, version: input.version }, data: { ...fields, version: { increment: 1 } } });
    if (result.count !== 1) throw new Error("This service review was updated by another user. Refresh and try again");
    await tx.auditLog.create({ data: auditData(actor, "UPDATE_SERVICE_REVIEW", "CareServiceReview", current.id) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function changeCareServiceReviewStatus(input: {
  actor: CareActor;
  engagementId: string;
  reviewId: string;
  version: number;
  nextStatus: CareServiceReviewStatus;
}) {
  return prisma.$transaction(async (tx) => {
    const access = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const { actor } = access;
    if (input.nextStatus === "APPROVED" && !access.canManage) throw new Error("Manager approval required / 此操作须由管理人员批准");
    const current = await tx.careServiceReview.findFirst({ where: { id: input.reviewId, engagementId: input.engagementId } });
    if (!current) throw new Error("Service review not found");
    if (!REVIEW_TRANSITIONS[current.status].includes(input.nextStatus)) throw new Error(`Service review cannot move from ${current.status} to ${input.nextStatus}`);
    const now = new Date();
    const result = await tx.careServiceReview.updateMany({
      where: { id: current.id, version: input.version },
      data: {
        status: input.nextStatus,
        submittedAt: input.nextStatus === "SUBMITTED" ? now : undefined,
        submittedByUserId: input.nextStatus === "SUBMITTED" ? actor.id : undefined,
        approvedAt: input.nextStatus === "APPROVED" ? now : undefined,
        approvedByUserId: input.nextStatus === "APPROVED" ? actor.id : undefined,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new Error("This service review was updated by another user. Refresh and try again");
    await tx.auditLog.create({ data: auditData(actor, "CHANGE_SERVICE_REVIEW_STATUS", "CareServiceReview", current.id, { from: current.status, to: input.nextStatus }) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

export async function createParentCareQuestion(input: ParentCareReportScope & { question: unknown }) {
  const question = requiredCareText(input.question, "Question / 提问", 2000);
  return parentCareTransaction(async tx => {
    const report = await requireParentCareReportAccess(tx, input);
    if (!report.engagement.caseOwnerUserId) throw new Error("This care project has no case owner / 此托管项目尚未指定负责人");
    const task = await tx.careTask.create({ data: {
      studentId: input.studentId, engagementId: report.engagementId,
      title: `Reply to parent / 回复家长: ${report.title}`.slice(0, 240), description: question,
      assignedToUserId: report.engagement.caseOwnerUserId, priority: "HIGH",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), createdByUserId: report.engagement.caseOwnerUserId,
    } });
    const created = await tx.careParentQuestion.create({ data: {
      reportId: report.id, engagementId: report.engagementId, studentId: input.studentId,
      parentId: input.parentId, question, assignedToUserId: report.engagement.caseOwnerUserId, careTaskId: task.id,
    } });
    await tx.parentPortalAudit.create({ data: { parentId: input.parentId, studentId: input.studentId, action: "ASK_CARE_REPORT_QUESTION", targetType: "CareParentQuestion", targetId: created.id, metaJson: { reportId: report.id } } });
    return created;
  });
}

export async function answerParentCareQuestion(input: {
  actor: CareActor; engagementId: string; reportId: string; questionId: string;
  expectedRespondedAt: string; response: unknown;
}) {
  const response = requiredCareText(input.response, "Response / 回复", 4000);
  return parentCareTransaction(async tx => {
    const { actor } = await requireCareReportWriteAccess(tx, input.actor.id, input.engagementId);
    const question = await tx.careParentQuestion.findFirst({ where: { id: input.questionId, engagementId: input.engagementId, reportId: input.reportId } });
    if (!question) throw new Error("Parent question not found in this report / 此报告中未找到家长提问");
    const report = await tx.careReport.findFirst({ where: { id: input.reportId, engagementId: input.engagementId, studentId: question.studentId }, select: { id: true } });
    if (!report) throw new Error("Report ownership needs review / 报告归属需要核对");
    if (question.status === "CLOSED") throw new Error("Closed parent questions cannot be changed / 已关闭的家长提问不能修改");
    if (question.status === "ANSWERED" && question.response === response) return;
    if ((question.respondedAt?.toISOString() ?? "") !== input.expectedRespondedAt) throw new Error("Response changed. Refresh before editing / 回复已更新，请刷新后修改");
    const now = new Date();
    const updated = await tx.careParentQuestion.update({ where: { id: question.id }, data: { response, status: "ANSWERED", respondedAt: now, respondedByUserId: actor.id, parentViewedResponseAt: null } });
    const task = question.careTaskId ? await tx.careTask.findFirst({ where: { id: question.careTaskId, engagementId: input.engagementId, studentId: question.studentId } }) : null;
    if (question.careTaskId && !task) throw new Error("Linked task needs ownership review / 关联任务归属需要核对");
    if (task && !["DONE", "CANCELLED"].includes(task.status)) {
      await tx.careTask.update({ where: { id: task.id }, data: { status: "DONE", completionEvidence: `Response saved in parent portal / 已在家长端保存回复: ${response}`.slice(0, 4000), completedAt: now, completedByUserId: actor.id, version: { increment: 1 } } });
    }
    const snapshot = (q: typeof question) => ({ response: q.response, respondedAt: q.respondedAt?.toISOString() ?? null, respondedByUserId: q.respondedByUserId, parentViewedResponseAt: q.parentViewedResponseAt?.toISOString() ?? null });
    await tx.auditLog.create({ data: auditData(actor, "ANSWER_PARENT_QUESTION", "CareParentQuestion", question.id, {
      reportId: question.reportId, before: snapshot(question), after: snapshot(updated),
      taskId: task?.id ?? null, previousTaskStatus: task?.status ?? null,
      previousTaskEvidence: task?.completionEvidence ?? null, delivery: "PORTAL_RESPONSE_SAVED",
    }) });
  });
}

export async function readParentCareQuestions(input: ParentCareReportScope) {
  return parentCareTransaction(async tx => {
    const report = await requireParentCareReportAccess(tx, input);
    const questions = await tx.careParentQuestion.findMany({ where: { engagementId: report.engagementId, reportId: input.reportId, studentId: input.studentId, parentId: input.parentId }, orderBy: { createdAt: "asc" } });
    for (const question of questions) {
      if (question.status !== "ANSWERED" || question.parentViewedResponseAt) continue;
      const now = new Date();
      await tx.careParentQuestion.update({ where: { id: question.id }, data: { parentViewedResponseAt: now } });
      await tx.parentPortalAudit.create({ data: { parentId: input.parentId, studentId: input.studentId, action: "VIEW_CARE_REPORT_RESPONSE", targetType: "CareParentQuestion", targetId: question.id, metaJson: { reportId: input.reportId, respondedAt: question.respondedAt?.toISOString() ?? null } } });
      question.parentViewedResponseAt = now;
    }
    return questions;
  });
}

export async function closeParentCareQuestion(input: ParentCareReportScope & { questionId: string }) {
  return parentCareTransaction(async tx => {
    const report = await requireParentCareReportAccess(tx, input);
    const question = await tx.careParentQuestion.findFirst({ where: { id: input.questionId, engagementId: report.engagementId, reportId: input.reportId, parentId: input.parentId, studentId: input.studentId } });
    if (!question) throw new Error("Parent question not found in this report / 此报告中未找到家长提问");
    if (question.status === "CLOSED") return;
    if (question.status !== "ANSWERED") throw new Error("Only answered questions can be closed / 仅可关闭已回复的提问");
    const now = new Date();
    await tx.careParentQuestion.update({ where: { id: question.id }, data: { status: "CLOSED", closedAt: now, parentViewedResponseAt: question.parentViewedResponseAt ?? now } });
    await tx.parentPortalAudit.create({ data: { parentId: input.parentId, studentId: input.studentId, action: "CLOSE_CARE_REPORT_QUESTION", targetType: "CareParentQuestion", targetId: question.id, metaJson: { reportId: input.reportId } } });
  });
}

export function parentQuestionStatusLabel(status: CareParentQuestionStatus) {
  return status === "OPEN" ? "待回复" : status === "ANSWERED" ? "已回复" : "已关闭";
}
