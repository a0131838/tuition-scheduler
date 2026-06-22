CREATE TABLE "EduTrustContractSetup" (
  "id" TEXT NOT NULL,
  "courseProfileId" TEXT NOT NULL,
  "permittedCourseDurationMonths" TEXT,
  "courseLoadMode" TEXT,
  "courseCommencementBasis" TEXT,
  "courseCompletionBasis" TEXT,
  "studyCommencementDate" TEXT,
  "qualification" TEXT,
  "courseDeveloper" TEXT,
  "awardingOrganisation" TEXT,
  "courseEntryRequirements" TEXT,
  "courseSchedule" TEXT,
  "scheduledHolidays" TEXT,
  "assessmentPeriods" TEXT,
  "finalResultsReleaseDate" TEXT,
  "qualificationConfermentDate" TEXT,
  "industrialAttachmentIncluded" BOOLEAN NOT NULL DEFAULT false,
  "industrialAttachmentDuration" TEXT,
  "miscellaneousFees" TEXT,
  "refundEvent1Percent" TEXT,
  "refundEvent1DaysBefore" TEXT,
  "refundEvent2Percent" TEXT,
  "refundEvent2DaysBefore" TEXT,
  "refundEvent3Percent" TEXT,
  "refundEvent3DaysAfter" TEXT,
  "refundEvent4Percent" TEXT,
  "refundEvent4DaysAfter" TEXT,
  "latePaymentGraceValue" TEXT,
  "latePaymentGraceUnit" TEXT,
  "fpsRequired" BOOLEAN NOT NULL DEFAULT false,
  "fpsProvider" TEXT,
  "fpsPolicyNumber" TEXT,
  "evidenceNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EduTrustContractSetup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EduTrustContractSetup_courseProfileId_key" ON "EduTrustContractSetup"("courseProfileId");

ALTER TABLE "EduTrustContractSetup"
ADD CONSTRAINT "EduTrustContractSetup_courseProfileId_fkey"
FOREIGN KEY ("courseProfileId") REFERENCES "EduTrustCourseProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
