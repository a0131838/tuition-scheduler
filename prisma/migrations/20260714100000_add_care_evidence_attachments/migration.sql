-- Add private evidence attachments to the isolated full-care domain.
-- Existing teaching, package, settlement, payroll and finance tables are unchanged.
CREATE TYPE "CareAttachmentCategory" AS ENUM (
  'SCHOOL_EMAIL',
  'SCHOOL_NOTICE',
  'MEETING_MINUTES',
  'ACADEMIC_REPORT',
  'MEDICAL',
  'TRANSPORT',
  'HOST_FAMILY',
  'VISA',
  'OTHER'
);

CREATE TABLE "CareAttachment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "activityId" TEXT,
  "taskId" TEXT,
  "category" "CareAttachmentCategory" NOT NULL,
  "occurredAt" TIMESTAMP(3),
  "title" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "note" TEXT,
  "filePath" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "mimeType" TEXT,
  "audience" "CareAudience" NOT NULL DEFAULT 'INTERNAL_ONLY',
  "uploadedByUserId" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "archivedByUserId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareAttachment_engagementId_archivedAt_createdAt_idx" ON "CareAttachment"("engagementId", "archivedAt", "createdAt");
CREATE INDEX "CareAttachment_studentId_category_occurredAt_idx" ON "CareAttachment"("studentId", "category", "occurredAt");
CREATE INDEX "CareAttachment_activityId_idx" ON "CareAttachment"("activityId");
CREATE INDEX "CareAttachment_taskId_idx" ON "CareAttachment"("taskId");

ALTER TABLE "CareAttachment" ADD CONSTRAINT "CareAttachment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareAttachment" ADD CONSTRAINT "CareAttachment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareAttachment" ADD CONSTRAINT "CareAttachment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "CareActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareAttachment" ADD CONSTRAINT "CareAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CareTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareAttachment" ADD CONSTRAINT "CareAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareAttachment" ADD CONSTRAINT "CareAttachment_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
