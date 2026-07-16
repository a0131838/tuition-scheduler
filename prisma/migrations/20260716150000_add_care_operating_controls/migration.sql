CREATE TYPE "CareParentQuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');
CREATE TYPE "CareRiskCaseStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'MONITORING', 'RESOLVED', 'CLOSED');
CREATE TYPE "CareCoverageStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CareServiceReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');
CREATE TYPE "CareContinuationRecommendation" AS ENUM ('CONTINUE', 'EXPAND', 'ADJUST', 'COMPLETE', 'HOLD');

CREATE TABLE "CareParentQuestion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" "CareParentQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT NOT NULL,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedByUserId" TEXT,
    "parentViewedResponseAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "careTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareParentQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareRiskCase" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sourceActivityId" TEXT,
    "title" TEXT NOT NULL,
    "riskLevel" "CareRiskLevel" NOT NULL,
    "status" "CareRiskCaseStatus" NOT NULL DEFAULT 'OPEN',
    "facts" TEXT NOT NULL,
    "immediateAction" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "backupOwnerUserId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "responseDueAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionEvidence" TEXT,
    "parentVisible" BOOLEAN NOT NULL DEFAULT false,
    "publicSummary" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareRiskCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareCoveragePeriod" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "backupUserId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "handoverSummary" TEXT NOT NULL,
    "criticalActions" TEXT NOT NULL,
    "status" "CareCoverageStatus" NOT NULL DEFAULT 'SCHEDULED',
    "activatedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareCoveragePeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareServiceReview" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "CareServiceReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "goalsSummary" TEXT NOT NULL,
    "deliverySummary" TEXT NOT NULL,
    "outcomeSummary" TEXT NOT NULL,
    "evidenceSummary" TEXT NOT NULL,
    "continuationRecommendation" "CareContinuationRecommendation" NOT NULL,
    "nextStagePlan" TEXT NOT NULL,
    "internalCommercialNote" TEXT,
    "preparedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareServiceReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareParentQuestion_careTaskId_key" ON "CareParentQuestion"("careTaskId");
CREATE INDEX "CareParentQuestion_engagementId_status_createdAt_idx" ON "CareParentQuestion"("engagementId", "status", "createdAt");
CREATE INDEX "CareParentQuestion_assignedToUserId_status_createdAt_idx" ON "CareParentQuestion"("assignedToUserId", "status", "createdAt");
CREATE INDEX "CareParentQuestion_parentId_reportId_createdAt_idx" ON "CareParentQuestion"("parentId", "reportId", "createdAt");
CREATE INDEX "CareRiskCase_engagementId_status_responseDueAt_idx" ON "CareRiskCase"("engagementId", "status", "responseDueAt");
CREATE INDEX "CareRiskCase_ownerUserId_status_responseDueAt_idx" ON "CareRiskCase"("ownerUserId", "status", "responseDueAt");
CREATE INDEX "CareRiskCase_riskLevel_status_responseDueAt_idx" ON "CareRiskCase"("riskLevel", "status", "responseDueAt");
CREATE INDEX "CareCoveragePeriod_engagementId_status_startAt_endAt_idx" ON "CareCoveragePeriod"("engagementId", "status", "startAt", "endAt");
CREATE INDEX "CareCoveragePeriod_backupUserId_status_startAt_endAt_idx" ON "CareCoveragePeriod"("backupUserId", "status", "startAt", "endAt");
CREATE UNIQUE INDEX "CareServiceReview_engagementId_periodStart_periodEnd_key" ON "CareServiceReview"("engagementId", "periodStart", "periodEnd");
CREATE INDEX "CareServiceReview_status_periodEnd_idx" ON "CareServiceReview"("status", "periodEnd");
CREATE INDEX "CareServiceReview_studentId_periodEnd_idx" ON "CareServiceReview"("studentId", "periodEnd");

ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CareReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_respondedByUserId_fkey" FOREIGN KEY ("respondedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareParentQuestion" ADD CONSTRAINT "CareParentQuestion_careTaskId_fkey" FOREIGN KEY ("careTaskId") REFERENCES "CareTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "CareActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_backupOwnerUserId_fkey" FOREIGN KEY ("backupOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareRiskCase" ADD CONSTRAINT "CareRiskCase_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareCoveragePeriod" ADD CONSTRAINT "CareCoveragePeriod_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareCoveragePeriod" ADD CONSTRAINT "CareCoveragePeriod_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareCoveragePeriod" ADD CONSTRAINT "CareCoveragePeriod_backupUserId_fkey" FOREIGN KEY ("backupUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareCoveragePeriod" ADD CONSTRAINT "CareCoveragePeriod_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareServiceReview" ADD CONSTRAINT "CareServiceReview_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareServiceReview" ADD CONSTRAINT "CareServiceReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareServiceReview" ADD CONSTRAINT "CareServiceReview_preparedByUserId_fkey" FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareServiceReview" ADD CONSTRAINT "CareServiceReview_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareServiceReview" ADD CONSTRAINT "CareServiceReview_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
