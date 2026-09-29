-- Nullable and deliberately unbackfilled: historical classification requires staff review.
ALTER TABLE "CareActivity" ADD COLUMN "parentVisibilitySection" TEXT;
ALTER TABLE "CareTask" ADD COLUMN "parentVisibilitySection" TEXT;
ALTER TABLE "CareRiskCase" ADD COLUMN "parentVisibilitySection" TEXT;
