-- Allow multiple ONLINE_PACKAGE_END settlements per package by cumulative snapshot point
ALTER TABLE "PartnerSettlement"
  ADD COLUMN IF NOT EXISTS "onlineSnapshotTotalMinutes" INTEGER;

-- Backfill existing online rows with current package total as snapshot point
UPDATE "PartnerSettlement" ps
SET "onlineSnapshotTotalMinutes" = cp."totalMinutes"
FROM "CoursePackage" cp
WHERE ps."packageId" = cp."id"
  AND ps."mode" = 'ONLINE_PACKAGE_END'
  AND ps."onlineSnapshotTotalMinutes" IS NULL;

-- Replace old unique constraint with snapshot-based uniqueness
DROP INDEX IF EXISTS "PartnerSettlement_packageId_mode_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerSettlement_packageId_mode_onlineSnapshotTotalMinutes_key"
  ON "PartnerSettlement"("packageId", "mode", "onlineSnapshotTotalMinutes");
