-- CreateEnum
CREATE TYPE "EduTrustCourseLine" AS ENUM (
  'INTERNATIONAL_SCHOOL_ADMISSION',
  'AEIS_ADMISSION',
  'ACADEMIC_ENGLISH_COMMUNICATION',
  'STANDARDIZED_ENGLISH_TESTS',
  'ACADEMIC_SUBJECT_BRIDGING',
  'SCHOLARSHIP_SELECTION_TESTS',
  'HIGHER_EDUCATION_SUPPORT',
  'NOT_FOR_EDUTRUST'
);

-- CreateEnum
CREATE TYPE "EduTrustPermissionStatus" AS ENUM (
  'NOT_FOR_EDUTRUST',
  'DRAFT',
  'READY_FOR_SSG',
  'SUBMITTED',
  'PERMITTED',
  'RETIRED'
);

-- CreateEnum
CREATE TYPE "EduTrustDeliveryMode" AS ENUM (
  'ONE_TO_ONE',
  'GROUP',
  'BLENDED',
  'ONLINE',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "EduTrustCourseFileStatus" AS ENUM (
  'NOT_STARTED',
  'DRAFTING',
  'READY_FOR_REVIEW',
  'APPROVED',
  'NEEDS_UPDATE'
);

-- CreateTable
CREATE TABLE "EduTrustCourseProfile" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "isEduTrustCourse" BOOLEAN NOT NULL DEFAULT false,
  "courseLine" "EduTrustCourseLine" NOT NULL DEFAULT 'NOT_FOR_EDUTRUST',
  "complianceName" TEXT,
  "publicName" TEXT,
  "trackLabel" TEXT,
  "minTotalHours" INTEGER NOT NULL DEFAULT 50,
  "deliveryMode" "EduTrustDeliveryMode" NOT NULL DEFAULT 'ONE_TO_ONE',
  "permissionStatus" "EduTrustPermissionStatus" NOT NULL DEFAULT 'DRAFT',
  "courseFileStatus" "EduTrustCourseFileStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EduTrustCourseProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EduTrustCourseProfile_courseId_key" ON "EduTrustCourseProfile"("courseId");

-- CreateIndex
CREATE INDEX "EduTrustCourseProfile_isEduTrustCourse_courseLine_idx" ON "EduTrustCourseProfile"("isEduTrustCourse", "courseLine");

-- CreateIndex
CREATE INDEX "EduTrustCourseProfile_permissionStatus_idx" ON "EduTrustCourseProfile"("permissionStatus");

-- CreateIndex
CREATE INDEX "EduTrustCourseProfile_courseFileStatus_idx" ON "EduTrustCourseProfile"("courseFileStatus");

-- AddForeignKey
ALTER TABLE "EduTrustCourseProfile"
ADD CONSTRAINT "EduTrustCourseProfile_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
