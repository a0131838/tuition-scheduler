-- Create enums
CREATE TYPE "PartnerSettlementMode" AS ENUM ('ONLINE_PACKAGE_END', 'OFFLINE_MONTHLY');
CREATE TYPE "PartnerSettlementStatus" AS ENUM ('PENDING', 'INVOICED', 'CANCELLED');

-- Add student settlement mode
ALTER TABLE "Student" ADD COLUMN "settlementMode" "PartnerSettlementMode";

-- Create settlement table
CREATE TABLE "PartnerSettlement" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "packageId" TEXT,
  "monthKey" TEXT,
  "mode" "PartnerSettlementMode" NOT NULL,
  "status" "PartnerSettlementStatus" NOT NULL DEFAULT 'PENDING',
  "hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "amount" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerSettlement_packageId_mode_key" ON "PartnerSettlement"("packageId", "mode");
CREATE UNIQUE INDEX "PartnerSettlement_studentId_monthKey_mode_key" ON "PartnerSettlement"("studentId", "monthKey", "mode");
CREATE INDEX "PartnerSettlement_mode_status_createdAt_idx" ON "PartnerSettlement"("mode", "status", "createdAt");
CREATE INDEX "PartnerSettlement_studentId_createdAt_idx" ON "PartnerSettlement"("studentId", "createdAt");

ALTER TABLE "PartnerSettlement"
  ADD CONSTRAINT "PartnerSettlement_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerSettlement"
  ADD CONSTRAINT "PartnerSettlement_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
