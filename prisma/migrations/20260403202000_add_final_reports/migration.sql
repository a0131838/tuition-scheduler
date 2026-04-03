-- CreateEnum
CREATE TYPE "FinalReportStatus" AS ENUM ('ASSIGNED', 'SUBMITTED', 'FORWARDED');

-- CreateTable
CREATE TABLE "FinalReport" (
  "id" TEXT NOT NULL,
  "status" "FinalReportStatus" NOT NULL DEFAULT 'ASSIGNED',
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "subjectId" TEXT,
  "packageId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "forwardedAt" TIMESTAMP(3),
  "reportPeriodLabel" TEXT,
  "finalLevel" TEXT,
  "overallScore" DECIMAL(5,2),
  "recommendation" TEXT,
  "reportJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinalReport_teacherId_status_assignedAt_idx" ON "FinalReport"("teacherId", "status", "assignedAt");
CREATE INDEX "FinalReport_studentId_createdAt_idx" ON "FinalReport"("studentId", "createdAt");
CREATE INDEX "FinalReport_courseId_createdAt_idx" ON "FinalReport"("courseId", "createdAt");
CREATE INDEX "FinalReport_status_createdAt_idx" ON "FinalReport"("status", "createdAt");
CREATE INDEX "FinalReport_packageId_createdAt_idx" ON "FinalReport"("packageId", "createdAt");

-- AddForeignKey
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
