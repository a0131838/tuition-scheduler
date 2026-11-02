ALTER TABLE "LearningReportParentEdition" ADD COLUMN "midtermReportId" TEXT, ADD COLUMN "finalReportId" TEXT;
UPDATE "LearningReportParentEdition" SET "midtermReportId" = "reportId" WHERE "kind" = 'MIDTERM';
UPDATE "LearningReportParentEdition" SET "finalReportId" = "reportId" WHERE "kind" = 'FINAL';
ALTER TABLE "LearningReportParentEdition" ADD CONSTRAINT "LearningReportParentEdition_midtermReportId_fkey" FOREIGN KEY ("midtermReportId") REFERENCES "MidtermReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningReportParentEdition" ADD CONSTRAINT "LearningReportParentEdition_finalReportId_fkey" FOREIGN KEY ("finalReportId") REFERENCES "FinalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningReportParentEdition" ADD CONSTRAINT "LearningReportParentEdition_report_relation_check" CHECK (
 ("kind"='MIDTERM' AND "midtermReportId" IS NOT NULL AND "midtermReportId"="reportId" AND "finalReportId" IS NULL) OR
 ("kind"='FINAL' AND "finalReportId" IS NOT NULL AND "finalReportId"="reportId" AND "midtermReportId" IS NULL)
);
CREATE INDEX "LearningReportParentEdition_midtermReportId_idx" ON "LearningReportParentEdition"("midtermReportId");
CREATE INDEX "LearningReportParentEdition_finalReportId_idx" ON "LearningReportParentEdition"("finalReportId");
