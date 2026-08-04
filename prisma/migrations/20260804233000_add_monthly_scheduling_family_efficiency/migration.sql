ALTER TABLE "MonthlySchedulingItem"
  ADD COLUMN "carryForwardScheduleJson" JSONB,
  ADD COLUMN "familyDecisionBatchId" TEXT;

CREATE INDEX "MonthlySchedulingItem_familyDecisionBatchId_idx"
  ON "MonthlySchedulingItem"("familyDecisionBatchId");

ALTER TABLE "MonthlySchedulingOffer"
  ADD COLUMN "preferenceLevel" TEXT;
