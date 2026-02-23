-- Add package-level settlement mode to allow mixed billing modes per student.
ALTER TABLE "CoursePackage" ADD COLUMN "settlementMode" "PartnerSettlementMode";

-- Backfill from legacy student-level setting for existing records.
UPDATE "CoursePackage" p
SET "settlementMode" = s."settlementMode"
FROM "Student" s
WHERE p."studentId" = s."id"
  AND p."settlementMode" IS NULL
  AND s."settlementMode" IS NOT NULL;

CREATE INDEX "CoursePackage_settlementMode_status_idx" ON "CoursePackage"("settlementMode", "status");
