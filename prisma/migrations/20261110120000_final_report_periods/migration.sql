BEGIN;

CREATE TABLE "FinalReportPeriod" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "purchaseTxnId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedByUserId" TEXT NOT NULL,
    CONSTRAINT "FinalReportPeriod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinalReportPeriod_valid_dates" CHECK ("startsAt" < "endsAt" AND "endsAt" <= "confirmedAt"),
    CONSTRAINT "FinalReportPeriod_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinalReportPeriod_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "FinalReportPeriod_packageId_studentId_purchaseTxnId_key" ON "FinalReportPeriod"("packageId", "studentId", "purchaseTxnId");
CREATE INDEX "FinalReportPeriod_packageId_studentId_startsAt_idx" ON "FinalReportPeriod"("packageId", "studentId", "startsAt");
CREATE INDEX "FinalReportPeriod_studentId_idx" ON "FinalReportPeriod"("studentId");

ALTER TABLE "FinalReport" ADD COLUMN "reportPeriodId" TEXT;
CREATE UNIQUE INDEX "FinalReport_reportPeriodId_teacherId_key" ON "FinalReport"("reportPeriodId", "teacherId");
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_reportPeriodId_fkey" FOREIGN KEY ("reportPeriodId") REFERENCES "FinalReportPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
