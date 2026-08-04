CREATE TABLE "MonthlySchedulingCampaign" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "teacherAvailabilityDueAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlySchedulingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonthlySchedulingItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "packageId" TEXT,
    "parentId" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "intent" TEXT,
    "expectedSessionsPerWeek" INTEGER,
    "expectedMinutes" INTEGER,
    "preferredMode" TEXT,
    "preferredCampus" TEXT,
    "preferredTeacher" TEXT,
    "availabilityJson" JSONB,
    "unavailableDatesJson" JSONB,
    "currentScheduleJson" JSONB,
    "parentNotes" TEXT,
    "internalNote" TEXT,
    "ownerUserId" TEXT,
    "ownerName" TEXT,
    "respondedByParentId" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "clarifiedAt" TIMESTAMP(3),
    "matchedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlySchedulingItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlySchedulingCampaign_month_key" ON "MonthlySchedulingCampaign"("month");
CREATE INDEX "MonthlySchedulingCampaign_status_month_idx" ON "MonthlySchedulingCampaign"("status", "month");
CREATE UNIQUE INDEX "MonthlySchedulingItem_token_key" ON "MonthlySchedulingItem"("token");
CREATE UNIQUE INDEX "MonthlySchedulingItem_campaignId_studentId_courseId_key" ON "MonthlySchedulingItem"("campaignId", "studentId", "courseId");
CREATE INDEX "MonthlySchedulingItem_campaignId_status_updatedAt_idx" ON "MonthlySchedulingItem"("campaignId", "status", "updatedAt");
CREATE INDEX "MonthlySchedulingItem_studentId_campaignId_idx" ON "MonthlySchedulingItem"("studentId", "campaignId");
CREATE INDEX "MonthlySchedulingItem_parentId_campaignId_idx" ON "MonthlySchedulingItem"("parentId", "campaignId");
CREATE INDEX "MonthlySchedulingItem_courseId_status_idx" ON "MonthlySchedulingItem"("courseId", "status");
CREATE INDEX "MonthlySchedulingItem_ownerUserId_status_idx" ON "MonthlySchedulingItem"("ownerUserId", "status");

ALTER TABLE "MonthlySchedulingItem" ADD CONSTRAINT "MonthlySchedulingItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MonthlySchedulingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlySchedulingItem" ADD CONSTRAINT "MonthlySchedulingItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlySchedulingItem" ADD CONSTRAINT "MonthlySchedulingItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MonthlySchedulingItem" ADD CONSTRAINT "MonthlySchedulingItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonthlySchedulingItem" ADD CONSTRAINT "MonthlySchedulingItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
