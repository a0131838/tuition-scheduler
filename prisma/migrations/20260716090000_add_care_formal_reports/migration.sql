CREATE TYPE "CareReportType" AS ENUM ('MONTHLY', 'MILESTONE', 'INCIDENT', 'TERM');

CREATE TYPE "CareReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'PUBLISHED', 'REVOKED');

CREATE TABLE "CareReport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "reportType" "CareReportType" NOT NULL,
    "status" "CareReportStatus" NOT NULL DEFAULT 'DRAFT',
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "riskLevel" "CareRiskLevel" NOT NULL DEFAULT 'LOW',
    "overallSummary" TEXT NOT NULL,
    "academicSummary" TEXT,
    "schoolSummary" TEXT,
    "lifeSummary" TEXT,
    "riskSummary" TEXT,
    "actionsCompleted" TEXT NOT NULL,
    "evidenceSummary" TEXT,
    "nextPlan" TEXT NOT NULL,
    "studentActions" TEXT,
    "parentActions" TEXT,
    "internalNote" TEXT,
    "sourceSnapshotJson" JSONB,
    "preparedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareReportActivity" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareReportActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareReportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareReportView" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgementNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareReportView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareReport_engagementId_reportType_periodStart_periodEnd_key" ON "CareReport"("engagementId", "reportType", "periodStart", "periodEnd");
CREATE INDEX "CareReport_studentId_status_periodEnd_idx" ON "CareReport"("studentId", "status", "periodEnd");
CREATE INDEX "CareReport_engagementId_createdAt_idx" ON "CareReport"("engagementId", "createdAt");
CREATE INDEX "CareReport_status_submittedAt_idx" ON "CareReport"("status", "submittedAt");
CREATE UNIQUE INDEX "CareReportActivity_reportId_activityId_key" ON "CareReportActivity"("reportId", "activityId");
CREATE INDEX "CareReportActivity_activityId_idx" ON "CareReportActivity"("activityId");
CREATE UNIQUE INDEX "CareReportAttachment_reportId_attachmentId_key" ON "CareReportAttachment"("reportId", "attachmentId");
CREATE INDEX "CareReportAttachment_attachmentId_idx" ON "CareReportAttachment"("attachmentId");
CREATE UNIQUE INDEX "CareReportView_reportId_parentId_key" ON "CareReportView"("reportId", "parentId");
CREATE INDEX "CareReportView_parentId_lastViewedAt_idx" ON "CareReportView"("parentId", "lastViewedAt");

ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_preparedByUserId_fkey" FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareReport" ADD CONSTRAINT "CareReport_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareReportActivity" ADD CONSTRAINT "CareReportActivity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CareReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareReportActivity" ADD CONSTRAINT "CareReportActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "CareActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareReportAttachment" ADD CONSTRAINT "CareReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CareReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareReportAttachment" ADD CONSTRAINT "CareReportAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "CareAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareReportView" ADD CONSTRAINT "CareReportView_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CareReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareReportView" ADD CONSTRAINT "CareReportView_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
