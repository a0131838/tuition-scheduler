-- Add the isolated full-care management domain. Existing teaching and finance tables are unchanged.
ALTER TYPE "StaffWorkspace" ADD VALUE IF NOT EXISTS 'CARE';

CREATE TYPE "CareProgramType" AS ENUM ('PRE_U_ACADEMIC_CARE', 'PRE_U_FULL_COORDINATION', 'UNIVERSITY_GROWTH', 'CAREER_LAUNCH');
CREATE TYPE "CareEngagementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CareMemberRole" AS ENUM ('EXECUTIVE_OWNER', 'CASE_OWNER', 'ACADEMIC_OWNER', 'SCHOOL_OWNER', 'LIFE_OWNER', 'REVIEWER', 'COORDINATOR');
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CareActivityCategory" AS ENUM ('ACADEMIC', 'SCHOOL', 'LIFE', 'PARENT', 'RISK', 'APPLICATION', 'CAREER', 'GENERAL');
CREATE TYPE "CareAudience" AS ENUM ('INTERNAL_ONLY', 'PARENT', 'STUDENT', 'PARENT_AND_STUDENT');
CREATE TYPE "CarePublicationStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'REVOKED');
CREATE TYPE "CareTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'BLOCKED', 'DONE', 'CANCELLED');
CREATE TYPE "CareTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "CareRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "CareEngagement" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "programType" "CareProgramType" NOT NULL,
  "status" "CareEngagementStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "caseOwnerUserId" TEXT,
  "scopeJson" JSONB NOT NULL,
  "exclusionsJson" JSONB,
  "cadenceJson" JSONB,
  "baselineJson" JSONB,
  "currentGoalsJson" JSONB,
  "successCriteriaJson" JSONB,
  "lastActivityAt" TIMESTAMP(3),
  "nextReportDueAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareEngagement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareEngagementMember" (
  "id" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CareMemberRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "assignedByUserId" TEXT NOT NULL,
  "note" TEXT,
  CONSTRAINT "CareEngagementMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarePlan" (
  "id" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "baselineJson" JSONB,
  "goalsJson" JSONB NOT NULL,
  "successCriteriaJson" JSONB,
  "actionPlanJson" JSONB,
  "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareActivity" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "category" "CareActivityCategory" NOT NULL,
  "subtype" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "sourceLabel" TEXT,
  "factEvidence" TEXT NOT NULL,
  "professionalJudgment" TEXT,
  "actionTaken" TEXT,
  "outcomeVerification" TEXT,
  "nextAction" TEXT,
  "nextActionDue" TIMESTAMP(3),
  "riskLevel" "CareRiskLevel" NOT NULL DEFAULT 'LOW',
  "ownerUserId" TEXT,
  "internalNote" TEXT,
  "publicSummary" TEXT,
  "audience" "CareAudience" NOT NULL DEFAULT 'INTERNAL_ONLY',
  "publicationStatus" "CarePublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareTask" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "activityId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assignedToUserId" TEXT NOT NULL,
  "status" "CareTaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "CareTaskPriority" NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "nextFollowUpAt" TIMESTAMP(3),
  "waitingOn" TEXT,
  "blockedReason" TEXT,
  "completionEvidence" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "parentActionRequired" BOOLEAN NOT NULL DEFAULT false,
  "parentVisibleSummary" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareEngagement_status_caseOwnerUserId_nextReportDueAt_idx" ON "CareEngagement"("status", "caseOwnerUserId", "nextReportDueAt");
CREATE INDEX "CareEngagement_studentId_status_idx" ON "CareEngagement"("studentId", "status");
CREATE INDEX "CareEngagement_createdAt_idx" ON "CareEngagement"("createdAt");
CREATE UNIQUE INDEX "CareEngagement_one_active_program_per_student_idx" ON "CareEngagement"("studentId", "programType") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "CareEngagementMember_engagementId_userId_role_key" ON "CareEngagementMember"("engagementId", "userId", "role");
CREATE INDEX "CareEngagementMember_userId_isActive_idx" ON "CareEngagementMember"("userId", "isActive");
CREATE INDEX "CarePlan_engagementId_periodStart_periodEnd_idx" ON "CarePlan"("engagementId", "periodStart", "periodEnd");
CREATE INDEX "CarePlan_status_periodEnd_idx" ON "CarePlan"("status", "periodEnd");
CREATE INDEX "CareActivity_engagementId_occurredAt_idx" ON "CareActivity"("engagementId", "occurredAt");
CREATE INDEX "CareActivity_studentId_publicationStatus_occurredAt_idx" ON "CareActivity"("studentId", "publicationStatus", "occurredAt");
CREATE INDEX "CareActivity_riskLevel_nextActionDue_idx" ON "CareActivity"("riskLevel", "nextActionDue");
CREATE INDEX "CareTask_assignedToUserId_status_dueAt_idx" ON "CareTask"("assignedToUserId", "status", "dueAt");
CREATE INDEX "CareTask_engagementId_status_dueAt_idx" ON "CareTask"("engagementId", "status", "dueAt");
CREATE INDEX "CareTask_studentId_status_idx" ON "CareTask"("studentId", "status");

ALTER TABLE "CareEngagement" ADD CONSTRAINT "CareEngagement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareEngagement" ADD CONSTRAINT "CareEngagement_caseOwnerUserId_fkey" FOREIGN KEY ("caseOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareEngagement" ADD CONSTRAINT "CareEngagement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareEngagementMember" ADD CONSTRAINT "CareEngagementMember_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareEngagementMember" ADD CONSTRAINT "CareEngagementMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareEngagementMember" ADD CONSTRAINT "CareEngagementMember_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareActivity" ADD CONSTRAINT "CareActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareActivity" ADD CONSTRAINT "CareActivity_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareActivity" ADD CONSTRAINT "CareActivity_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareActivity" ADD CONSTRAINT "CareActivity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareActivity" ADD CONSTRAINT "CareActivity_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "CareActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
