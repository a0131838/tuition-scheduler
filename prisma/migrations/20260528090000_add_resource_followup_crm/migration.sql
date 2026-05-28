CREATE TABLE "LeadDailyCounter" (
  "dayKey" TEXT NOT NULL,
  "nextSeq" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadDailyCounter_pkey" PRIMARY KEY ("dayKey")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "leadNo" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourcePlatform" TEXT,
  "sourceDetail" TEXT,
  "referralName" TEXT,
  "parentName" TEXT,
  "parentWechat" TEXT,
  "parentPhone" TEXT,
  "studentName" TEXT NOT NULL,
  "grade" TEXT,
  "school" TEXT,
  "target" TEXT,
  "needs" TEXT,
  "preferredCourse" TEXT,
  "budgetRange" TEXT,
  "urgency" TEXT,
  "intentLevel" TEXT NOT NULL DEFAULT 'Warm',
  "status" TEXT NOT NULL DEFAULT 'New Lead',
  "ownerUserId" TEXT,
  "ownerName" TEXT,
  "assignedSalesName" TEXT,
  "nextAction" TEXT,
  "nextActionDue" TIMESTAMP(3),
  "latestSummary" TEXT,
  "convertedStudentId" TEXT,
  "convertedSourceChannelId" TEXT,
  "schedulingTicketId" TEXT,
  "lostReason" TEXT,
  "createdByUserId" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadFollowUp" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT,
  "channel" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "nextAction" TEXT,
  "nextActionDue" TIMESTAMP(3),
  "nextStatus" TEXT,
  "intentLevelAfter" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadAssessmentRequest" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "teacherName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "dueAt" TIMESTAMP(3),
  "studentLevel" TEXT,
  "academicProblems" TEXT,
  "recommendedCourse" TEXT,
  "recommendedFrequency" TEXT,
  "recommendedPackage" TEXT,
  "teacherFit" TEXT,
  "recommendedTeacherType" TEXT,
  "risks" TEXT,
  "suggestionForSales" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reopenedAt" TIMESTAMP(3),
  "reopenedByUserId" TEXT,
  "reopenNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadAssessmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_leadNo_key" ON "Lead"("leadNo");
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_sourceType_createdAt_idx" ON "Lead"("sourceType", "createdAt");
CREATE INDEX "Lead_sourcePlatform_createdAt_idx" ON "Lead"("sourcePlatform", "createdAt");
CREATE INDEX "Lead_ownerName_createdAt_idx" ON "Lead"("ownerName", "createdAt");
CREATE INDEX "Lead_intentLevel_createdAt_idx" ON "Lead"("intentLevel", "createdAt");
CREATE INDEX "Lead_nextActionDue_idx" ON "Lead"("nextActionDue");
CREATE INDEX "Lead_parentWechat_idx" ON "Lead"("parentWechat");
CREATE INDEX "Lead_parentPhone_idx" ON "Lead"("parentPhone");
CREATE INDEX "Lead_convertedStudentId_idx" ON "Lead"("convertedStudentId");
CREATE INDEX "LeadFollowUp_leadId_createdAt_idx" ON "LeadFollowUp"("leadId", "createdAt");
CREATE INDEX "LeadFollowUp_actorName_createdAt_idx" ON "LeadFollowUp"("actorName", "createdAt");
CREATE INDEX "LeadAssessmentRequest_leadId_createdAt_idx" ON "LeadAssessmentRequest"("leadId", "createdAt");
CREATE INDEX "LeadAssessmentRequest_teacherId_status_dueAt_idx" ON "LeadAssessmentRequest"("teacherId", "status", "dueAt");
CREATE INDEX "LeadAssessmentRequest_status_dueAt_idx" ON "LeadAssessmentRequest"("status", "dueAt");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedStudentId_fkey" FOREIGN KEY ("convertedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedSourceChannelId_fkey" FOREIGN KEY ("convertedSourceChannelId") REFERENCES "StudentSourceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadAssessmentRequest" ADD CONSTRAINT "LeadAssessmentRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAssessmentRequest" ADD CONSTRAINT "LeadAssessmentRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAssessmentRequest" ADD CONSTRAINT "LeadAssessmentRequest_reopenedByUserId_fkey" FOREIGN KEY ("reopenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
