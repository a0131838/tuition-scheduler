-- CreateTable
CREATE TABLE "SchoolGuideAssessmentRequest" (
    "id" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "publicTokenHash" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "parentName" TEXT NOT NULL,
    "studentNickname" TEXT NOT NULL,
    "parentWechat" TEXT,
    "parentPhone" TEXT,
    "ageBand" TEXT NOT NULL,
    "currentGrade" TEXT,
    "targetPath" TEXT NOT NULL,
    "preferredTestDate" TEXT,
    "needType" TEXT NOT NULL,
    "note" TEXT,
    "ownerUserId" TEXT,
    "ownerName" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactedAt" TIMESTAMP(3),
    "contactedByUserId" TEXT,
    "contactedByName" TEXT,
    "readyAt" TIMESTAMP(3),
    "codeIssuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "interpretedAt" TIMESTAMP(3),
    "interpretedByUserId" TEXT,
    "interpretedByName" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "closedByName" TEXT,
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolGuideAssessmentRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SchoolGuideAssessmentCode" ADD COLUMN "assessmentRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SchoolGuideAssessmentRequest_requestNo_key" ON "SchoolGuideAssessmentRequest"("requestNo");
CREATE UNIQUE INDEX "SchoolGuideAssessmentRequest_publicTokenHash_key" ON "SchoolGuideAssessmentRequest"("publicTokenHash");
CREATE INDEX "SchoolGuideAssessmentRequest_status_createdAt_idx" ON "SchoolGuideAssessmentRequest"("status", "createdAt");
CREATE INDEX "SchoolGuideAssessmentRequest_ownerUserId_status_createdAt_idx" ON "SchoolGuideAssessmentRequest"("ownerUserId", "status", "createdAt");
CREATE INDEX "SchoolGuideAssessmentRequest_leadId_createdAt_idx" ON "SchoolGuideAssessmentRequest"("leadId", "createdAt");
CREATE INDEX "SchoolGuideAssessmentRequest_parentWechat_status_idx" ON "SchoolGuideAssessmentRequest"("parentWechat", "status");
CREATE INDEX "SchoolGuideAssessmentRequest_parentPhone_status_idx" ON "SchoolGuideAssessmentRequest"("parentPhone", "status");
CREATE UNIQUE INDEX "SchoolGuideAssessmentCode_assessmentRequestId_key" ON "SchoolGuideAssessmentCode"("assessmentRequestId");

-- AddForeignKey
ALTER TABLE "SchoolGuideAssessmentRequest" ADD CONSTRAINT "SchoolGuideAssessmentRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolGuideAssessmentCode" ADD CONSTRAINT "SchoolGuideAssessmentCode_assessmentRequestId_fkey" FOREIGN KEY ("assessmentRequestId") REFERENCES "SchoolGuideAssessmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
