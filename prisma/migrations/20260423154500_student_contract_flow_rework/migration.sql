ALTER TYPE "StudentContractStatus" ADD VALUE IF NOT EXISTS 'INTAKE_PENDING';
ALTER TYPE "StudentContractStatus" ADD VALUE IF NOT EXISTS 'INTAKE_SUBMITTED';
ALTER TYPE "StudentContractStatus" ADD VALUE IF NOT EXISTS 'CONTRACT_DRAFT';
ALTER TYPE "StudentContractStatus" ADD VALUE IF NOT EXISTS 'INVOICE_CREATED';

ALTER TYPE "StudentContractEventType" ADD VALUE IF NOT EXISTS 'BUSINESS_DRAFT_SAVED';
ALTER TYPE "StudentContractEventType" ADD VALUE IF NOT EXISTS 'SIGN_READY';
ALTER TYPE "StudentContractEventType" ADD VALUE IF NOT EXISTS 'INVOICE_CREATED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentContractFlowType') THEN
    CREATE TYPE "StudentContractFlowType" AS ENUM ('NEW_PURCHASE', 'RENEWAL');
  END IF;
END $$;

ALTER TABLE "StudentContract"
  ADD COLUMN IF NOT EXISTS "flowType" "StudentContractFlowType" NOT NULL DEFAULT 'NEW_PURCHASE',
  ADD COLUMN IF NOT EXISTS "invoiceCreatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "businessInfoJson" JSONB,
  ADD COLUMN IF NOT EXISTS "invoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT;

CREATE INDEX IF NOT EXISTS "StudentContract_flowType_status_createdAt_idx"
  ON "StudentContract"("flowType", "status", "createdAt");
