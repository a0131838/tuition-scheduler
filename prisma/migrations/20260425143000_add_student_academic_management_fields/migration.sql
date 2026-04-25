-- Add student-level academic management fields for risk tracking, service plans, and next actions.
ALTER TABLE "Student"
  ADD COLUMN "curriculum" TEXT,
  ADD COLUMN "englishLevel" TEXT,
  ADD COLUMN "parentExpectation" TEXT,
  ADD COLUMN "mainAnxiety" TEXT,
  ADD COLUMN "personalityNotes" TEXT,
  ADD COLUMN "academicRiskLevel" TEXT,
  ADD COLUMN "currentRiskSummary" TEXT,
  ADD COLUMN "nextAction" TEXT,
  ADD COLUMN "nextActionDue" TIMESTAMP(3),
  ADD COLUMN "advisorOwner" TEXT,
  ADD COLUMN "servicePlanType" TEXT;

CREATE INDEX "Student_academicRiskLevel_idx" ON "Student"("academicRiskLevel");
CREATE INDEX "Student_servicePlanType_idx" ON "Student"("servicePlanType");
CREATE INDEX "Student_nextActionDue_idx" ON "Student"("nextActionDue");
