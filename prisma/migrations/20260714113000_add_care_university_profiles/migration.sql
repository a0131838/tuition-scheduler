-- Differentiate university academic, postgraduate and career care without changing existing projects.
-- Existing teaching, package, settlement, payroll and finance tables are unchanged.
ALTER TYPE "CareProgramType" ADD VALUE IF NOT EXISTS 'POSTGRAD_PREPARATION';

CREATE TYPE "CareStudentConsentStatus" AS ENUM (
  'NOT_RECORDED',
  'GRANTED',
  'LIMITED',
  'WITHDRAWN'
);

CREATE TABLE "CareUniversityProfile" (
  "id" TEXT NOT NULL,
  "engagementId" TEXT NOT NULL,
  "institution" TEXT,
  "degreeProgram" TEXT,
  "currentAcademicYear" TEXT,
  "currentTerm" TEXT,
  "expectedGraduationDate" TIMESTAMP(3),
  "currentGpaLabel" TEXT,
  "targetGpaLabel" TEXT,
  "studentConsentStatus" "CareStudentConsentStatus" NOT NULL DEFAULT 'NOT_RECORDED',
  "parentVisibilityJson" JSONB,
  "consentNote" TEXT,
  "consentRecordedAt" TIMESTAMP(3),
  "consentRecordedByUserId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareUniversityProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareUniversityProfile_engagementId_key" ON "CareUniversityProfile"("engagementId");
CREATE INDEX "CareUniversityProfile_studentConsentStatus_expectedGraduationDate_idx" ON "CareUniversityProfile"("studentConsentStatus", "expectedGraduationDate");

ALTER TABLE "CareUniversityProfile" ADD CONSTRAINT "CareUniversityProfile_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CareEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareUniversityProfile" ADD CONSTRAINT "CareUniversityProfile_consentRecordedByUserId_fkey" FOREIGN KEY ("consentRecordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
