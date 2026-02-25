-- CreateEnum
CREATE TYPE "MidtermReportStatus" AS ENUM ('ASSIGNED', 'SUBMITTED');

-- CreateTable
CREATE TABLE "MidtermReport" (
  "id" TEXT NOT NULL,
  "status" "MidtermReportStatus" NOT NULL DEFAULT 'ASSIGNED',
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "subjectId" TEXT,
  "packageId" TEXT,
  "assignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "progressPercent" INTEGER NOT NULL,
  "consumedMinutes" INTEGER NOT NULL,
  "totalMinutes" INTEGER NOT NULL,
  "reportPeriodLabel" TEXT,
  "examTargetStatus" TEXT,
  "overallScore" DECIMAL(5,2),
  "reportJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MidtermReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MidtermReport_teacherId_status_assignedAt_idx" ON "MidtermReport"("teacherId", "status", "assignedAt");
CREATE INDEX "MidtermReport_studentId_createdAt_idx" ON "MidtermReport"("studentId", "createdAt");
CREATE INDEX "MidtermReport_courseId_createdAt_idx" ON "MidtermReport"("courseId", "createdAt");
CREATE INDEX "MidtermReport_status_createdAt_idx" ON "MidtermReport"("status", "createdAt");
CREATE INDEX "MidtermReport_packageId_createdAt_idx" ON "MidtermReport"("packageId", "createdAt");

-- AddForeignKey
ALTER TABLE "MidtermReport" ADD CONSTRAINT "MidtermReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidtermReport" ADD CONSTRAINT "MidtermReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidtermReport" ADD CONSTRAINT "MidtermReport_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MidtermReport" ADD CONSTRAINT "MidtermReport_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MidtermReport" ADD CONSTRAINT "MidtermReport_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MidtermReport" ADD CONSTRAINT "MidtermReport_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
