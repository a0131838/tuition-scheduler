CREATE TABLE "SchoolGuideAssessmentCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codeHint" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "ageBand" TEXT,
  "targetPath" TEXT,
  "studentNickname" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "createdByName" TEXT NOT NULL,
  "createdByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolGuideAssessmentCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolGuideAssessmentSession" (
  "id" TEXT NOT NULL,
  "accessCodeId" TEXT NOT NULL,
  "sessionTokenHash" TEXT NOT NULL,
  "studentCode" TEXT NOT NULL,
  "studentNickname" TEXT,
  "ageBand" TEXT NOT NULL,
  "currentGrade" TEXT,
  "targetPath" TEXT NOT NULL,
  "languageBackground" TEXT,
  "formId" TEXT NOT NULL,
  "formVariant" TEXT NOT NULL,
  "bankVersion" TEXT NOT NULL,
  "route" TEXT,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "questionIds" JSONB NOT NULL,
  "answers" JSONB NOT NULL,
  "currentQuestionId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" TEXT,
  "domainScores" JSONB,
  "overallScore" DOUBLE PRECISION,
  "overallBand" TEXT,
  "report" JSONB,
  "reviewerNote" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedByName" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolGuideAssessmentSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolGuideAssessmentCode_codeHash_key" ON "SchoolGuideAssessmentCode"("codeHash");
CREATE INDEX "SchoolGuideAssessmentCode_status_expiresAt_idx" ON "SchoolGuideAssessmentCode"("status", "expiresAt");
CREATE INDEX "SchoolGuideAssessmentCode_createdByUserId_createdAt_idx" ON "SchoolGuideAssessmentCode"("createdByUserId", "createdAt");
CREATE UNIQUE INDEX "SchoolGuideAssessmentSession_sessionTokenHash_key" ON "SchoolGuideAssessmentSession"("sessionTokenHash");
CREATE UNIQUE INDEX "SchoolGuideAssessmentSession_studentCode_key" ON "SchoolGuideAssessmentSession"("studentCode");
CREATE INDEX "SchoolGuideAssessmentSession_status_updatedAt_idx" ON "SchoolGuideAssessmentSession"("status", "updatedAt");
CREATE INDEX "SchoolGuideAssessmentSession_accessCodeId_createdAt_idx" ON "SchoolGuideAssessmentSession"("accessCodeId", "createdAt");
CREATE INDEX "SchoolGuideAssessmentSession_ageBand_formVariant_createdAt_idx" ON "SchoolGuideAssessmentSession"("ageBand", "formVariant", "createdAt");
ALTER TABLE "SchoolGuideAssessmentSession" ADD CONSTRAINT "SchoolGuideAssessmentSession_accessCodeId_fkey" FOREIGN KEY ("accessCodeId") REFERENCES "SchoolGuideAssessmentCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
