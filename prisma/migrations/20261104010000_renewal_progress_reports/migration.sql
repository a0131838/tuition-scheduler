CREATE TABLE "RenewalProgressReport" (
  "id" TEXT NOT NULL,
  "renewalTaskId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "assignedByUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "reviewNote" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "deliveredByUserId" TEXT,
  "deliveryChannel" TEXT,
  "snapshotJson" JSONB NOT NULL,
  "reportJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalProgressReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RenewalProgressReport_renewalTaskId_fkey" FOREIGN KEY ("renewalTaskId") REFERENCES "RenewalTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RenewalProgressReport_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RenewalProgressReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RenewalProgressReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RenewalProgressReport_status_check" CHECK ("status" IN ('ASSIGNED','SUBMITTED','APPROVED','DELIVERED')),
  CONSTRAINT "RenewalProgressReport_delivery_check" CHECK (
    ("status" <> 'DELIVERED' OR ("approvedAt" IS NOT NULL AND "deliveredAt" IS NOT NULL AND "deliveryChannel" IS NOT NULL))
  )
);
CREATE UNIQUE INDEX "RenewalProgressReport_renewalTaskId_key" ON "RenewalProgressReport"("renewalTaskId");
CREATE INDEX "RenewalProgressReport_teacherId_status_assignedAt_idx" ON "RenewalProgressReport"("teacherId", "status", "assignedAt");
CREATE INDEX "RenewalProgressReport_studentId_createdAt_idx" ON "RenewalProgressReport"("studentId", "createdAt");
CREATE INDEX "RenewalProgressReport_status_createdAt_idx" ON "RenewalProgressReport"("status", "createdAt");
ALTER TABLE "LearningReportParentEdition" ADD COLUMN "renewalProgressReportId" TEXT;
ALTER TABLE "LearningReportParentEdition" ADD CONSTRAINT "LearningReportParentEdition_renewalProgressReportId_fkey" FOREIGN KEY ("renewalProgressReportId") REFERENCES "RenewalProgressReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningReportParentEdition" DROP CONSTRAINT "LearningReportParentEdition_report_relation_check";
ALTER TABLE "LearningReportParentEdition" ADD CONSTRAINT "LearningReportParentEdition_report_relation_check" CHECK (
 ("kind"='MIDTERM' AND "midtermReportId" IS NOT NULL AND "midtermReportId"="reportId" AND "finalReportId" IS NULL AND "renewalProgressReportId" IS NULL) OR
 ("kind"='FINAL' AND "finalReportId" IS NOT NULL AND "finalReportId"="reportId" AND "midtermReportId" IS NULL AND "renewalProgressReportId" IS NULL) OR
 ("kind"='RENEWAL' AND "renewalProgressReportId" IS NOT NULL AND "renewalProgressReportId"="reportId" AND "midtermReportId" IS NULL AND "finalReportId" IS NULL)
);
CREATE INDEX "LearningReportParentEdition_renewalProgressReportId_idx" ON "LearningReportParentEdition"("renewalProgressReportId");
