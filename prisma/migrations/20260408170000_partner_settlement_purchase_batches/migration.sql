ALTER TYPE "PartnerSettlementStatus" ADD VALUE IF NOT EXISTS 'REVERTED';

ALTER TABLE "PartnerSettlement"
  ADD COLUMN IF NOT EXISTS "packageTxnId" TEXT,
  ADD COLUMN IF NOT EXISTS "settlementStartAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "settlementEndAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revertedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revertedBy" TEXT;

ALTER TABLE "PartnerSettlement"
  DROP CONSTRAINT IF EXISTS "PartnerSettlement_packageId_mode_onlineSnapshotTotalMinutes_key";

ALTER TABLE "PartnerSettlement"
  ADD CONSTRAINT "PartnerSettlement_packageTxnId_fkey"
  FOREIGN KEY ("packageTxnId") REFERENCES "PackageTxn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerSettlement_packageTxnId_mode_key"
  ON "PartnerSettlement"("packageTxnId", "mode");

CREATE INDEX IF NOT EXISTS "PartnerSettlement_packageTxnId_createdAt_idx"
  ON "PartnerSettlement"("packageTxnId", "createdAt");
