CREATE TYPE "EduTrustStudentRecordStatus" AS ENUM (
  'DRAFT',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'COMPLETED',
  'NEEDS_REVIEW'
);

CREATE TABLE "EduTrustStudentCourseRecord" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "packageId" TEXT,
  "status" "EduTrustStudentRecordStatus" NOT NULL DEFAULT 'DRAFT',
  "diagnosticAssessment" TEXT,
  "individualLearningPlan" TEXT,
  "progressReview" TEXT,
  "finalAssessment" TEXT,
  "completionRecord" TEXT,
  "attendanceEvidenceNote" TEXT,
  "contractEvidenceNote" TEXT,
  "outcomeSummary" TEXT,
  "externalOutcome" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EduTrustStudentCourseRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EduTrustStudentCourseRecord_studentId_courseId_packageId_key"
ON "EduTrustStudentCourseRecord"("studentId", "courseId", "packageId");

CREATE INDEX "EduTrustStudentCourseRecord_courseId_status_createdAt_idx"
ON "EduTrustStudentCourseRecord"("courseId", "status", "createdAt");

CREATE INDEX "EduTrustStudentCourseRecord_studentId_status_createdAt_idx"
ON "EduTrustStudentCourseRecord"("studentId", "status", "createdAt");

CREATE INDEX "EduTrustStudentCourseRecord_packageId_idx"
ON "EduTrustStudentCourseRecord"("packageId");

CREATE INDEX "EduTrustStudentCourseRecord_status_completedAt_idx"
ON "EduTrustStudentCourseRecord"("status", "completedAt");

ALTER TABLE "EduTrustStudentCourseRecord"
ADD CONSTRAINT "EduTrustStudentCourseRecord_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EduTrustStudentCourseRecord"
ADD CONSTRAINT "EduTrustStudentCourseRecord_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EduTrustStudentCourseRecord"
ADD CONSTRAINT "EduTrustStudentCourseRecord_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
