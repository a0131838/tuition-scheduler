CREATE TYPE "PackageFinanceGateStatus" AS ENUM ('EXEMPT', 'INVOICE_PENDING_MANAGER', 'SCHEDULABLE', 'BLOCKED');

CREATE TYPE "PackageInvoiceApprovalStatus" AS ENUM ('PENDING_MANAGER', 'APPROVED', 'REJECTED');

ALTER TABLE "CoursePackage"
ADD COLUMN "financeGateStatus" "PackageFinanceGateStatus" NOT NULL DEFAULT 'EXEMPT',
ADD COLUMN "financeGateReason" TEXT,
ADD COLUMN "financeGateUpdatedAt" TIMESTAMP(3),
ADD COLUMN "financeGateUpdatedBy" TEXT;

CREATE TABLE "PackageInvoiceApproval" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "status" "PackageInvoiceApprovalStatus" NOT NULL DEFAULT 'PENDING_MANAGER',
  "submittedBy" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "managerApprovedBy" TEXT,
  "managerApprovedAt" TIMESTAMP(3),
  "managerRejectReason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PackageInvoiceApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoursePackage_financeGateStatus_status_idx" ON "CoursePackage"("financeGateStatus", "status");
CREATE INDEX "PackageInvoiceApproval_packageId_status_submittedAt_idx" ON "PackageInvoiceApproval"("packageId", "status", "submittedAt");
CREATE INDEX "PackageInvoiceApproval_status_submittedAt_idx" ON "PackageInvoiceApproval"("status", "submittedAt");
CREATE INDEX "PackageInvoiceApproval_invoiceId_idx" ON "PackageInvoiceApproval"("invoiceId");

ALTER TABLE "PackageInvoiceApproval"
ADD CONSTRAINT "PackageInvoiceApproval_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "CoursePackage"
SET
  "financeGateStatus" = CASE
    WHEN "settlementMode" IS NULL THEN 'SCHEDULABLE'::"PackageFinanceGateStatus"
    ELSE 'EXEMPT'::"PackageFinanceGateStatus"
  END,
  "financeGateReason" = CASE
    WHEN "settlementMode" IS NULL THEN 'Legacy package created before invoice gate rollout.'
    ELSE 'Partner settlement package stays outside direct-billing invoice gate.'
  END,
  "financeGateUpdatedAt" = NOW(),
  "financeGateUpdatedBy" = 'system-backfill'
WHERE "financeGateUpdatedAt" IS NULL;
