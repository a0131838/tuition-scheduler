import {
  CareAudience,
  CareEngagementStatus,
  CareMemberRole,
  CarePlanStatus,
  CarePublicationStatus,
  CareProgramType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertCareActivation,
  assertCareLaunchReadiness,
  assertCareActivity,
  assertCareActivityProgramType,
  assertCareStatusTransition,
  assertCareTaskUpdate,
  careActivityCategory,
  careActivitySource,
  careAttachmentCategory,
  careAudience,
  careProgramType,
  careParentVisibilityIds,
  careRiskLevel,
  careScopeIds,
  careStudentConsentStatus,
  careTaskPriority,
  careTaskStatus,
  careText,
  assertCareUniversityConsent,
  assertCareUniversityProfileReady,
  isUniversityCareProgram,
  parentVisibilityIdsFromJson,
  parseCareDateTime,
  annualCareEndDate,
  requiredCareText,
  scopeIdsFromJson,
} from "@/lib/care-validation";

type CareActor = { id: string; email: string; name: string; role: string };

const CARE_OWNER_ROLES: CareMemberRole[] = ["CASE_OWNER", "ACADEMIC_OWNER", "SCHOOL_OWNER", "LIFE_OWNER", "COORDINATOR"];

function isSignedFullCareContractForEngagement(
  contract: { status: string; businessInfoJson: Prisma.JsonValue | null },
  engagement: { id: string; programType: CareProgramType },
) {
  if (contract.status !== "SIGNED" && contract.status !== "INVOICE_CREATED") return false;
  if (!contract.businessInfoJson || typeof contract.businessInfoJson !== "object" || Array.isArray(contract.businessInfoJson)) return false;
  const info = contract.businessInfoJson as Record<string, unknown>;
  return info.careServiceIncluded === true && info.careEngagementId === engagement.id && info.careProgramType === engagement.programType;
}

export function careOwnerRolesForProgram(programType: CareProgramType): CareMemberRole[] {
  if (programType === "UNIVERSITY_GROWTH") return ["CASE_OWNER", "ACADEMIC_OWNER"];
  if (programType === "POSTGRAD_PREPARATION") return ["CASE_OWNER", "ACADEMIC_OWNER", "COORDINATOR"];
  if (programType === "CAREER_LAUNCH") return ["CASE_OWNER", "COORDINATOR"];
  return ["CASE_OWNER", "ACADEMIC_OWNER", "SCHOOL_OWNER", "LIFE_OWNER"];
}

function assertUniversityParentEligibility(
  programType: CareProgramType,
  audience: CareAudience,
  universityProfile: { studentConsentStatus: string; parentVisibilityJson: Prisma.JsonValue | null } | null,
) {
  if (!isUniversityCareProgram(programType) || (audience !== "PARENT" && audience !== "PARENT_AND_STUDENT")) return;
  if (!universityProfile || !["GRANTED", "LIMITED"].includes(universityProfile.studentConsentStatus)) {
    throw new Error("Student consent is required before marking university records for parent reporting");
  }
  if (parentVisibilityIdsFromJson(universityProfile.parentVisibilityJson).length === 0) {
    throw new Error("Select at least one parent-visible section in the university profile");
  }
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

export async function createCareEngagement(input: {
  actor: CareActor;
  studentId: unknown;
  programType: unknown;
  startDate: unknown;
  caseOwnerUserId: unknown;
  reviewerUserId?: unknown;
  scopeIds: unknown;
}) {
  const studentId = requiredCareText(input.studentId, "Student", 80);
  const programType = careProgramType(input.programType);
  const startDate = parseCareDateTime(input.startDate);
  const caseOwnerUserId = requiredCareText(input.caseOwnerUserId, "Case owner", 80);
  const reviewerUserId = careText(input.reviewerUserId, 80);
  const scopeIds = careScopeIds(input.scopeIds);
  if (!startDate) throw new Error("Valid start date is required");
  if (scopeIds.length === 0) throw new Error("Select at least one service scope");

  return prisma.$transaction(async (tx) => {
    const [student, owner, reviewer, existing] = await Promise.all([
      tx.student.findUnique({ where: { id: studentId }, select: { id: true, name: true } }),
      tx.user.findUnique({ where: { id: caseOwnerUserId }, select: { id: true, name: true } }),
      reviewerUserId ? tx.user.findUnique({ where: { id: reviewerUserId }, select: { id: true, name: true } }) : null,
      tx.careEngagement.findFirst({
        where: {
          studentId,
          programType: programType === "PRE_U_ACADEMIC_CARE" || programType === "PRE_U_FULL_COORDINATION"
            ? { in: ["PRE_U_ACADEMIC_CARE", "PRE_U_FULL_COORDINATION"] }
            : programType,
          status: { in: ["DRAFT", "ACTIVE", "PAUSED"] },
        },
        select: { id: true, status: true },
      }),
    ]);
    if (!student) throw new Error("Student not found");
    if (!owner) throw new Error("Case owner not found");
    if (reviewerUserId && !reviewer) throw new Error("Reviewer not found");
    if (existing) throw new Error(`This student already has a ${existing.status.toLowerCase()} care project in the same service track`);

    const engagement = await tx.careEngagement.create({
      data: {
        studentId,
        programType,
        startDate,
        endDate: annualCareEndDate(startDate),
        caseOwnerUserId,
        scopeJson: { serviceIds: scopeIds },
        exclusionsJson: {
          items: [
            "third_party_costs",
            "medical_diagnosis",
            "immigration_legal_advice",
            "unlimited_onsite_support",
          ],
        },
        cadenceJson: isUniversityCareProgram(programType)
          ? { milestoneReview: true, monthlyReport: true }
          : { weeklyCheck: true, monthlyReport: true },
        createdByUserId: input.actor.id,
      },
    });

    const memberships: Array<{ userId: string; role: CareMemberRole }> = careOwnerRolesForProgram(programType)
      .map((role) => ({ userId: caseOwnerUserId, role }));
    if (reviewerUserId) {
      memberships.push({ userId: reviewerUserId, role: "REVIEWER" });
      memberships.push({ userId: reviewerUserId, role: "EXECUTIVE_OWNER" });
    }
    await tx.careEngagementMember.createMany({
      data: memberships.map((item) => ({
        engagementId: engagement.id,
        userId: item.userId,
        role: item.role,
        assignedByUserId: input.actor.id,
      })),
      skipDuplicates: true,
    });
    await tx.auditLog.create({
      data: auditData(input.actor, "CREATE_DRAFT", "CareEngagement", engagement.id, {
        studentId,
        studentName: student.name,
        programType,
        scopeIds,
      }),
    });
    return engagement;
  });
}

export async function changeCareEngagementStatus(input: {
  actor: CareActor;
  engagementId: string;
  version: number;
  nextStatus: CareEngagementStatus;
}) {
  return prisma.$transaction(async (tx) => {
    const engagement = await tx.careEngagement.findUnique({
      where: { id: input.engagementId },
      include: {
        members: { where: { isActive: true }, select: { userId: true, role: true } },
        plans: { select: { id: true }, take: 1 },
        student: {
          select: {
            parentLinks: { where: { canViewReports: true }, select: { id: true }, take: 1 },
            contracts: {
              where: { status: { in: ["SIGNED", "INVOICE_CREATED"] } },
              select: { status: true, businessInfoJson: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
        universityProfile: {
          select: { institution: true, degreeProgram: true, currentTerm: true, expectedGraduationDate: true },
        },
      },
    });
    if (!engagement) throw new Error("Care project not found");
    assertCareStatusTransition(engagement.status, input.nextStatus);
    if (input.nextStatus === "ACTIVE") {
      assertCareActivation({
        startDate: engagement.startDate,
        caseOwnerUserId: engagement.caseOwnerUserId,
        scopeIds: scopeIdsFromJson(engagement.scopeJson),
        hasActiveCaseOwner: engagement.members.some(
          (item) => item.role === "CASE_OWNER" && item.userId === engagement.caseOwnerUserId,
        ),
      });
      if (isUniversityCareProgram(engagement.programType)) {
        assertCareUniversityProfileReady({
          institution: engagement.universityProfile?.institution ?? null,
          degreeProgram: engagement.universityProfile?.degreeProgram ?? null,
          currentTerm: engagement.universityProfile?.currentTerm ?? null,
          expectedGraduationDate: engagement.universityProfile?.expectedGraduationDate ?? null,
        });
      }
      if (engagement.status === "DRAFT") {
        assertCareLaunchReadiness({
          hasSignedCareContract: engagement.student.contracts.some((contract) => isSignedFullCareContractForEngagement(contract, engagement)),
          hasParentReportAccess: engagement.student.parentLinks.length > 0,
          hasReviewer: engagement.members.some((item) => item.role === "REVIEWER"),
          hasInitialPlan: engagement.plans.length > 0,
        });
      }
    }
    const updated = await tx.careEngagement.updateMany({
      where: { id: input.engagementId, version: input.version },
      data: {
        status: input.nextStatus,
        version: { increment: 1 },
        endDate: input.nextStatus === "COMPLETED" || input.nextStatus === "CANCELLED" ? new Date() : undefined,
      },
    });
    if (updated.count !== 1) throw new Error("This project was updated by another user. Refresh and try again");
    await tx.auditLog.create({
      data: auditData(input.actor, "CHANGE_STATUS", "CareEngagement", input.engagementId, {
        from: engagement.status,
        to: input.nextStatus,
      }),
    });
  });
}

export async function updateCareEngagementConfig(input: {
  actor: CareActor;
  engagementId: string;
  version: number;
  startDate: unknown;
  caseOwnerUserId: unknown;
  reviewerUserId?: unknown;
  scopeIds: unknown;
}) {
  const startDate = parseCareDateTime(input.startDate);
  const caseOwnerUserId = requiredCareText(input.caseOwnerUserId, "Case owner", 80);
  const reviewerUserId = careText(input.reviewerUserId, 80);
  const scopeIds = careScopeIds(input.scopeIds);
  if (!startDate) throw new Error("Valid start date is required");
  if (scopeIds.length === 0) throw new Error("Select at least one service scope");

  return prisma.$transaction(async (tx) => {
    const [engagement, owner, reviewer] = await Promise.all([
      tx.careEngagement.findUnique({
        where: { id: input.engagementId },
        select: { id: true, status: true, version: true, programType: true, startDate: true, caseOwnerUserId: true, scopeJson: true },
      }),
      tx.user.findUnique({ where: { id: caseOwnerUserId }, select: { id: true } }),
      reviewerUserId ? tx.user.findUnique({ where: { id: reviewerUserId }, select: { id: true } }) : null,
    ]);
    if (!engagement) throw new Error("Care project not found");
    if (engagement.status === "COMPLETED" || engagement.status === "CANCELLED") throw new Error("Closed care projects cannot be reconfigured");
    if (!owner) throw new Error("Case owner not found");
    if (reviewerUserId && !reviewer) throw new Error("Reviewer not found");

    const updated = await tx.careEngagement.updateMany({
      where: { id: engagement.id, version: input.version },
      data: {
        startDate,
        caseOwnerUserId,
        scopeJson: { serviceIds: scopeIds },
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new Error("This project was updated by another user. Refresh and try again");

    const ownerRoles = careOwnerRolesForProgram(engagement.programType);
    await tx.careEngagementMember.updateMany({
      where: { engagementId: engagement.id, role: { in: CARE_OWNER_ROLES }, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });
    for (const role of ownerRoles) {
      await tx.careEngagementMember.upsert({
        where: { engagementId_userId_role: { engagementId: engagement.id, userId: caseOwnerUserId, role } },
        update: { isActive: true, endedAt: null, assignedByUserId: input.actor.id },
        create: {
          engagementId: engagement.id,
          userId: caseOwnerUserId,
          role,
          assignedByUserId: input.actor.id,
        },
      });
    }

    await tx.careEngagementMember.updateMany({
      where: {
        engagementId: engagement.id,
        role: { in: ["REVIEWER", "EXECUTIVE_OWNER"] },
        ...(reviewerUserId ? { userId: { not: reviewerUserId } } : {}),
        isActive: true,
      },
      data: { isActive: false, endedAt: new Date() },
    });
    if (reviewerUserId) {
      for (const role of ["REVIEWER", "EXECUTIVE_OWNER"] as CareMemberRole[]) {
        await tx.careEngagementMember.upsert({
          where: { engagementId_userId_role: { engagementId: engagement.id, userId: reviewerUserId, role } },
          update: { isActive: true, endedAt: null, assignedByUserId: input.actor.id },
          create: {
            engagementId: engagement.id,
            userId: reviewerUserId,
            role,
            assignedByUserId: input.actor.id,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: auditData(input.actor, "UPDATE_CONFIG", "CareEngagement", engagement.id, {
        before: {
          startDate: engagement.startDate?.toISOString() ?? null,
          caseOwnerUserId: engagement.caseOwnerUserId,
          scopeIds: scopeIdsFromJson(engagement.scopeJson),
        },
        after: { startDate: startDate.toISOString(), caseOwnerUserId, reviewerUserId: reviewerUserId || null, scopeIds },
      }),
    });
  });
}

export async function upsertCareUniversityProfile(input: {
  actor: CareActor;
  engagementId: string;
  version: number;
  institution: unknown;
  degreeProgram: unknown;
  currentAcademicYear: unknown;
  currentTerm: unknown;
  expectedGraduationDate: unknown;
  currentGpaLabel: unknown;
  targetGpaLabel: unknown;
  studentConsentStatus: unknown;
  parentVisibilityIds: unknown;
  consentNote: unknown;
}) {
  const institution = careText(input.institution, 240);
  const degreeProgram = careText(input.degreeProgram, 240);
  const currentAcademicYear = careText(input.currentAcademicYear, 80);
  const currentTerm = careText(input.currentTerm, 120);
  const expectedGraduationDate = parseCareDateTime(input.expectedGraduationDate);
  const currentGpaLabel = careText(input.currentGpaLabel, 40);
  const targetGpaLabel = careText(input.targetGpaLabel, 40);
  const studentConsentStatus = careStudentConsentStatus(input.studentConsentStatus);
  const selectedParentVisibilityIds = careParentVisibilityIds(input.parentVisibilityIds);
  const parentVisibilityIds = studentConsentStatus === "NOT_RECORDED" || studentConsentStatus === "WITHDRAWN"
    ? []
    : selectedParentVisibilityIds;
  const consentNote = careText(input.consentNote, 2000);
  assertCareUniversityConsent({ status: studentConsentStatus, parentVisibilityIds, consentNote });

  return prisma.$transaction(async (tx) => {
    const engagement = await tx.careEngagement.findUnique({
      where: { id: input.engagementId },
      select: {
        id: true,
        programType: true,
        status: true,
        universityProfile: {
          select: {
            id: true,
            version: true,
            studentConsentStatus: true,
            parentVisibilityJson: true,
          },
        },
      },
    });
    if (!engagement) throw new Error("Care project not found");
    if (!isUniversityCareProgram(engagement.programType)) throw new Error("University profile is available only for university-stage projects");
    if (engagement.status === "COMPLETED" || engagement.status === "CANCELLED") {
      throw new Error("Closed care projects cannot change university profile settings");
    }

    const data = {
      institution: institution || null,
      degreeProgram: degreeProgram || null,
      currentAcademicYear: currentAcademicYear || null,
      currentTerm: currentTerm || null,
      expectedGraduationDate,
      currentGpaLabel: currentGpaLabel || null,
      targetGpaLabel: targetGpaLabel || null,
      studentConsentStatus,
      parentVisibilityJson: { sectionIds: parentVisibilityIds },
      consentNote: consentNote || null,
      consentRecordedAt: studentConsentStatus === "NOT_RECORDED" ? null : new Date(),
      consentRecordedByUserId: studentConsentStatus === "NOT_RECORDED" ? null : input.actor.id,
    };

    let profileId: string;
    if (engagement.universityProfile) {
      const updated = await tx.careUniversityProfile.updateMany({
        where: { id: engagement.universityProfile.id, version: input.version },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("This university profile was updated by another user. Refresh and try again");
      profileId = engagement.universityProfile.id;
    } else {
      if (input.version !== 0) throw new Error("University profile version is invalid. Refresh and try again");
      const created = await tx.careUniversityProfile.create({
        data: { engagementId: engagement.id, ...data },
        select: { id: true },
      });
      profileId = created.id;
    }

    await tx.auditLog.create({
      data: auditData(input.actor, engagement.universityProfile ? "UPDATE_UNIVERSITY_PROFILE" : "CREATE_UNIVERSITY_PROFILE", "CareUniversityProfile", profileId, {
        engagementId: engagement.id,
        programType: engagement.programType,
        consentBefore: engagement.universityProfile?.studentConsentStatus ?? null,
        consentAfter: studentConsentStatus,
        visibilityBefore: parentVisibilityIdsFromJson(engagement.universityProfile?.parentVisibilityJson),
        visibilityAfter: parentVisibilityIds,
      }),
    });
  });
}

export async function addCarePlan(input: {
  actor: CareActor;
  engagementId: string;
  periodLabel: unknown;
  periodStart: unknown;
  periodEnd: unknown;
  baseline: unknown;
  goals: unknown;
  successCriteria: unknown;
  actionPlan: unknown;
}) {
  const periodLabel = requiredCareText(input.periodLabel, "Period", 120);
  const periodStart = parseCareDateTime(input.periodStart);
  const periodEnd = parseCareDateTime(input.periodEnd);
  const baseline = careText(input.baseline, 4000);
  const goals = requiredCareText(input.goals, "Goals", 4000);
  const successCriteria = careText(input.successCriteria, 4000);
  const actionPlan = careText(input.actionPlan, 4000);
  if (!periodStart || !periodEnd || periodEnd < periodStart) throw new Error("Enter a valid plan date range");

  return prisma.$transaction(async (tx) => {
    const engagement = await tx.careEngagement.findUnique({ where: { id: input.engagementId }, select: { id: true } });
    if (!engagement) throw new Error("Care project not found");
    const plan = await tx.carePlan.create({
      data: {
        engagementId: input.engagementId,
        periodLabel,
        periodStart,
        periodEnd,
        baselineJson: baseline ? { summary: baseline } : undefined,
        goalsJson: { summary: goals },
        successCriteriaJson: successCriteria ? { summary: successCriteria } : undefined,
        actionPlanJson: actionPlan ? { summary: actionPlan } : undefined,
        status: "ACTIVE" as CarePlanStatus,
        createdByUserId: input.actor.id,
      },
    });
    await tx.auditLog.create({ data: auditData(input.actor, "CREATE_PLAN", "CarePlan", plan.id, { engagementId: input.engagementId }) });
    return plan;
  });
}

export async function addCareActivity(input: {
  actor: CareActor;
  engagementId: string;
  category: unknown;
  subtype: unknown;
  occurredAt: unknown;
  title: unknown;
  sourceType?: unknown;
  sourceLabel?: unknown;
  factEvidence: unknown;
  professionalJudgment: unknown;
  actionTaken: unknown;
  outcomeVerification: unknown;
  nextAction: unknown;
  nextActionDue: unknown;
  riskLevel: unknown;
  ownerUserId: unknown;
  internalNote: unknown;
  audience: unknown;
  publicSummary: unknown;
}) {
  const category = careActivityCategory(input.category);
  const subtype = careText(input.subtype, 80);
  const occurredAt = parseCareDateTime(input.occurredAt) ?? new Date();
  const title = requiredCareText(input.title, "Title", 180);
  const sourceType = careActivitySource(input.sourceType);
  const sourceLabel = careText(input.sourceLabel, 240);
  const factEvidence = requiredCareText(input.factEvidence, "Facts", 5000);
  const professionalJudgment = careText(input.professionalJudgment, 5000);
  const actionTaken = careText(input.actionTaken, 5000);
  const outcomeVerification = careText(input.outcomeVerification, 5000);
  const nextAction = careText(input.nextAction, 1000);
  const nextActionDue = parseCareDateTime(input.nextActionDue);
  const riskLevel = careRiskLevel(input.riskLevel);
  const ownerUserId = careText(input.ownerUserId, 80) || null;
  const internalNote = careText(input.internalNote, 5000);
  const audience = careAudience(input.audience);
  const publicSummary = careText(input.publicSummary, 3000);
  assertCareActivity({ riskLevel, ownerUserId, nextAction, nextActionDue, audience, publicSummary });

  return prisma.$transaction(async (tx) => {
    const engagement = await tx.careEngagement.findUnique({
      where: { id: input.engagementId },
      select: {
        id: true,
        studentId: true,
        status: true,
        programType: true,
        universityProfile: { select: { studentConsentStatus: true, parentVisibilityJson: true } },
      },
    });
    if (!engagement) throw new Error("Care project not found");
    if (engagement.status === "COMPLETED" || engagement.status === "CANCELLED") throw new Error("Closed care projects cannot receive new records");
    assertCareActivityProgramType(engagement.programType, category);
    assertUniversityParentEligibility(engagement.programType, audience, engagement.universityProfile);
    if (ownerUserId) {
      const owner = await tx.careEngagementMember.findFirst({
        where: { engagementId: engagement.id, userId: ownerUserId, isActive: true },
        select: { id: true },
      });
      if (!owner) throw new Error("Activity owner must be an active care team member");
    }
    const activity = await tx.careActivity.create({
      data: {
        studentId: engagement.studentId,
        engagementId: engagement.id,
        category,
        subtype: subtype || null,
        occurredAt,
        title,
        sourceType,
        sourceLabel: sourceLabel || null,
        factEvidence,
        professionalJudgment: professionalJudgment || null,
        actionTaken: actionTaken || null,
        outcomeVerification: outcomeVerification || null,
        nextAction: nextAction || null,
        nextActionDue,
        riskLevel,
        ownerUserId,
        internalNote: internalNote || null,
        audience,
        publicSummary: publicSummary || null,
        createdByUserId: input.actor.id,
        updatedByUserId: input.actor.id,
      },
    });
    if (nextAction && nextActionDue && ownerUserId) {
      await tx.careTask.create({
        data: {
          studentId: engagement.studentId,
          engagementId: engagement.id,
          activityId: activity.id,
          title: nextAction,
          assignedToUserId: ownerUserId,
          dueAt: nextActionDue,
          priority: riskLevel === "CRITICAL" ? "URGENT" : riskLevel === "HIGH" ? "HIGH" : "NORMAL",
          createdByUserId: input.actor.id,
        },
      });
    }
    await tx.careEngagement.update({
      where: { id: engagement.id },
      data: { lastActivityAt: occurredAt, version: { increment: 1 } },
    });
    await tx.auditLog.create({
      data: auditData(input.actor, "CREATE_ACTIVITY", "CareActivity", activity.id, {
        engagementId: engagement.id,
        category,
        riskLevel,
        audience,
      }),
    });
    return activity;
  });
}

export async function changeCareActivityPublicationStatus(input: {
  actor: CareActor;
  engagementId: string;
  activityId: string;
  version: number;
  nextStatus: CarePublicationStatus;
}) {
  if (!(["PUBLISHED", "REVOKED"] as CarePublicationStatus[]).includes(input.nextStatus)) {
    throw new Error("Invalid publication status");
  }
  return prisma.$transaction(async (tx) => {
    const current = await tx.careActivity.findFirst({
      where: { id: input.activityId, engagementId: input.engagementId },
      select: { id: true, audience: true, publicSummary: true, publicationStatus: true },
    });
    if (!current) throw new Error("Care update not found");
    if (input.nextStatus === "PUBLISHED") {
      if (current.audience === "INTERNAL_ONLY" || !current.publicSummary?.trim()) {
        throw new Error("Only updates with a parent summary can be published");
      }
    }
    if (current.publicationStatus === input.nextStatus) throw new Error("Publication status is unchanged");
    const now = new Date();
    const result = await tx.careActivity.updateMany({
      where: { id: current.id, engagementId: input.engagementId, version: input.version },
      data: {
        publicationStatus: input.nextStatus,
        publishedAt: input.nextStatus === "PUBLISHED" ? now : undefined,
        revokedAt: input.nextStatus === "REVOKED" ? now : null,
        updatedByUserId: input.actor.id,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new Error("This update was changed by another user. Refresh and try again");
    await tx.auditLog.create({
      data: auditData(input.actor, `PUBLICATION_${input.nextStatus}`, "CareActivity", current.id, {
        engagementId: input.engagementId,
        from: current.publicationStatus,
        to: input.nextStatus,
      }),
    });
  });
}

export async function createCareAttachment(input: {
  actor: CareActor;
  engagementId: string;
  activityId?: unknown;
  taskId?: unknown;
  category: unknown;
  occurredAt?: unknown;
  title: unknown;
  sourceLabel?: unknown;
  note?: unknown;
  audience: unknown;
  filePath: unknown;
  originalFileName: unknown;
  fileSizeBytes: number;
  mimeType?: unknown;
}) {
  const activityId = careText(input.activityId, 80) || null;
  const taskId = careText(input.taskId, 80) || null;
  const category = careAttachmentCategory(input.category);
  const occurredAt = parseCareDateTime(input.occurredAt);
  const title = requiredCareText(input.title, "Title", 180);
  const sourceLabel = careText(input.sourceLabel, 240);
  const note = careText(input.note, 2000);
  const audience = careAudience(input.audience);
  const filePath = requiredCareText(input.filePath, "Stored file", 1200);
  const originalFileName = requiredCareText(input.originalFileName, "File name", 255);
  const mimeType = careText(input.mimeType, 160);
  if (!Number.isInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) throw new Error("Invalid evidence file size");

  return prisma.$transaction(async (tx) => {
    const engagement = await tx.careEngagement.findUnique({
      where: { id: input.engagementId },
      select: {
        id: true,
        studentId: true,
        status: true,
        programType: true,
        universityProfile: { select: { studentConsentStatus: true, parentVisibilityJson: true } },
      },
    });
    if (!engagement) throw new Error("Care project not found");
    if (engagement.status === "COMPLETED" || engagement.status === "CANCELLED") {
      throw new Error("Closed care projects cannot receive new evidence");
    }
    assertUniversityParentEligibility(engagement.programType, audience, engagement.universityProfile);

    const [activity, task] = await Promise.all([
      activityId
        ? tx.careActivity.findFirst({ where: { id: activityId, engagementId: engagement.id }, select: { id: true } })
        : null,
      taskId
        ? tx.careTask.findFirst({ where: { id: taskId, engagementId: engagement.id }, select: { id: true } })
        : null,
    ]);
    if (activityId && !activity) throw new Error("Selected update does not belong to this care project");
    if (taskId && !task) throw new Error("Selected task does not belong to this care project");

    const attachment = await tx.careAttachment.create({
      data: {
        studentId: engagement.studentId,
        engagementId: engagement.id,
        activityId,
        taskId,
        category,
        occurredAt,
        title,
        sourceLabel: sourceLabel || null,
        note: note || null,
        filePath,
        originalFileName,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: mimeType || null,
        audience,
        uploadedByUserId: input.actor.id,
      },
    });
    await tx.auditLog.create({
      data: auditData(input.actor, "UPLOAD_ATTACHMENT", "CareAttachment", attachment.id, {
        engagementId: engagement.id,
        activityId,
        taskId,
        category,
        audience,
        originalFileName,
        fileSizeBytes: input.fileSizeBytes,
      }),
    });
    return attachment;
  });
}

export async function setCareAttachmentArchived(input: {
  actor: CareActor;
  attachmentId: string;
  engagementId: string;
  version: number;
  archived: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.careAttachment.findFirst({
      where: { id: input.attachmentId, engagementId: input.engagementId },
      select: { id: true, archivedAt: true },
    });
    if (!current) throw new Error("Evidence file not found");
    if (Boolean(current.archivedAt) === input.archived) throw new Error("Evidence status is unchanged");
    const updated = await tx.careAttachment.updateMany({
      where: { id: current.id, engagementId: input.engagementId, version: input.version },
      data: {
        archivedAt: input.archived ? new Date() : null,
        archivedByUserId: input.archived ? input.actor.id : null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new Error("This evidence file was updated by another user. Refresh and try again");
    await tx.auditLog.create({
      data: auditData(input.actor, input.archived ? "ARCHIVE_ATTACHMENT" : "RESTORE_ATTACHMENT", "CareAttachment", current.id, {
        engagementId: input.engagementId,
      }),
    });
  });
}

export async function addCareTask(input: {
  actor: CareActor;
  engagementId: string;
  title: unknown;
  description: unknown;
  assignedToUserId: unknown;
  priority: unknown;
  dueAt: unknown;
  parentActionRequired?: boolean;
  parentVisibleSummary?: unknown;
}) {
  const title = requiredCareText(input.title, "Task", 180);
  const description = careText(input.description, 3000);
  const assignedToUserId = requiredCareText(input.assignedToUserId, "Assignee", 80);
  const priority = careTaskPriority(input.priority);
  const dueAt = parseCareDateTime(input.dueAt);
  const parentActionRequired = Boolean(input.parentActionRequired);
  const parentVisibleSummary = careText(input.parentVisibleSummary, 1000);
  if (!dueAt) throw new Error("Task due time is required");
  if (parentActionRequired && !parentVisibleSummary) throw new Error("Parent action summary is required");
  return prisma.$transaction(async (tx) => {
    const [engagement, assignee] = await Promise.all([
      tx.careEngagement.findUnique({ where: { id: input.engagementId }, select: { id: true, studentId: true, status: true } }),
      tx.careEngagementMember.findFirst({
        where: { engagementId: input.engagementId, userId: assignedToUserId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!engagement) throw new Error("Care project not found");
    if (!assignee) throw new Error("Assignee must be an active care team member");
    if (engagement.status === "COMPLETED" || engagement.status === "CANCELLED") throw new Error("Closed care projects cannot receive new tasks");
    const task = await tx.careTask.create({
      data: {
        studentId: engagement.studentId,
        engagementId: engagement.id,
        title,
        description: description || null,
        assignedToUserId,
        priority,
        dueAt,
        parentActionRequired,
        parentVisibleSummary: parentActionRequired ? parentVisibleSummary : null,
        createdByUserId: input.actor.id,
      },
    });
    await tx.auditLog.create({ data: auditData(input.actor, "CREATE_TASK", "CareTask", task.id, { engagementId: engagement.id, priority, parentActionRequired }) });
    return task;
  });
}

export async function updateCareTask(input: {
  actor: CareActor;
  taskId: string;
  version: number;
  status: unknown;
  completionEvidence: unknown;
  nextFollowUpAt: unknown;
}) {
  const status = careTaskStatus(input.status);
  const completionEvidence = careText(input.completionEvidence, 3000);
  const nextFollowUpAt = parseCareDateTime(input.nextFollowUpAt);
  assertCareTaskUpdate({ status, completionEvidence, nextFollowUpAt });
  return prisma.$transaction(async (tx) => {
    const current = await tx.careTask.findUnique({ where: { id: input.taskId }, select: { id: true, status: true } });
    if (!current) throw new Error("Task not found");
    const result = await tx.careTask.updateMany({
      where: { id: input.taskId, version: input.version },
      data: {
        status,
        completionEvidence: completionEvidence || undefined,
        nextFollowUpAt,
        completedAt: status === "DONE" ? new Date() : null,
        completedByUserId: status === "DONE" ? input.actor.id : null,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) throw new Error("This task was updated by another user. Refresh and try again");
    await tx.auditLog.create({ data: auditData(input.actor, "UPDATE_TASK", "CareTask", input.taskId, { from: current.status, to: status }) });
  });
}

export function jsonSummary(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const summary = (value as { summary?: unknown }).summary;
  return typeof summary === "string" ? summary : "";
}

export function audienceLabel(value: CareAudience) {
  return value === "INTERNAL_ONLY" ? "内部" : "家长摘要";
}
