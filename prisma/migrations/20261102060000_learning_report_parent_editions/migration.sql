CREATE TABLE "LearningReportParentEdition" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "sourceJson" JSONB NOT NULL,
    "contentJson" JSONB,
    "model" TEXT,
    "generationId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningReportParentEdition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LearningReportParentEdition_kind_check" CHECK ("kind" IN ('MIDTERM', 'FINAL')),
    CONSTRAINT "LearningReportParentEdition_status_check" CHECK ("status" IN ('GENERATING', 'READY', 'FAILED'))
);
CREATE UNIQUE INDEX "LearningReportParentEdition_kind_reportId_sourceHash_key" ON "LearningReportParentEdition"("kind", "reportId", "sourceHash");
CREATE INDEX "LearningReportParentEdition_kind_reportId_createdAt_idx" ON "LearningReportParentEdition"("kind", "reportId", "createdAt");
