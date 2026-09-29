ALTER TABLE "MonthlySchedulingOffer" ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 0;
DROP INDEX "MonthlySchedulingOffer_itemId_teacherId_weekdayLabel_startMin_endMin_key";
CREATE UNIQUE INDEX "MonthlySchedulingOffer_generation_slot_key" ON "MonthlySchedulingOffer"("itemId", "teacherId", "weekdayLabel", "startMin", "endMin", "generation");
