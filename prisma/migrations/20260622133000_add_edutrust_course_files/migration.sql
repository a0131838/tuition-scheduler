-- CreateTable
CREATE TABLE "EduTrustCourseFile" (
  "id" TEXT NOT NULL,
  "courseProfileId" TEXT NOT NULL,
  "courseWriteup" TEXT,
  "admissionRequirements" TEXT,
  "learningOutcomes" TEXT,
  "syllabus" TEXT,
  "lessonPlan" TEXT,
  "assessmentPlan" TEXT,
  "teacherDeployment" TEXT,
  "academicBoardApproval" TEXT,
  "examinationBoardApproval" TEXT,
  "courseReview" TEXT,
  "evidenceNotes" TEXT,
  "lastReviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EduTrustCourseFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EduTrustCourseFile_courseProfileId_key" ON "EduTrustCourseFile"("courseProfileId");

-- AddForeignKey
ALTER TABLE "EduTrustCourseFile"
ADD CONSTRAINT "EduTrustCourseFile_courseProfileId_fkey"
FOREIGN KEY ("courseProfileId") REFERENCES "EduTrustCourseProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
