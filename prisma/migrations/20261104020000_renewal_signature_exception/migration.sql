CREATE TYPE "RenewalSignatureExceptionStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'ACTIVATED');

CREATE TABLE "RenewalSignatureException" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "status" "RenewalSignatureExceptionStatus" NOT NULL DEFAULT 'REQUESTED',
  "snapshotHash" TEXT NOT NULL,
  "feeCents" INTEGER NOT NULL,
  "topUpMinutes" INTEGER NOT NULL,
  "requestReason" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "managerApprovedBy" TEXT,
  "managerApprovedAt" TIMESTAMP(3),
  "managerNote" TEXT,
  "managerRejectedBy" TEXT,
  "managerRejectedAt" TIMESTAMP(3),
  "managerRejectReason" TEXT,
  "activationReason" TEXT,
  "activatedBy" TEXT,
  "activatedAt" TIMESTAMP(3),
  "verifiedReceiptIds" JSONB,
  "verifiedAmountCents" INTEGER,
  "signatureFollowUpDueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalSignatureException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RenewalSignatureException_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "StudentContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RenewalSignatureException_status_evidence_check" CHECK (
    ("status" <> 'APPROVED' OR ("managerApprovedBy" IS NOT NULL AND "managerApprovedAt" IS NOT NULL)) AND
    ("status" <> 'ACTIVATED' OR ("managerApprovedBy" IS NOT NULL AND "managerApprovedAt" IS NOT NULL AND "activatedBy" IS NOT NULL AND "activatedAt" IS NOT NULL AND "verifiedReceiptIds" IS NOT NULL AND "verifiedAmountCents" IS NOT NULL AND "signatureFollowUpDueAt" IS NOT NULL))
  )
);

CREATE UNIQUE INDEX "RenewalSignatureException_contractId_key" ON "RenewalSignatureException"("contractId");
CREATE INDEX "RenewalSignatureException_invoiceId_idx" ON "RenewalSignatureException"("invoiceId");
CREATE INDEX "RenewalSignatureException_status_signatureFollowUpDueAt_idx" ON "RenewalSignatureException"("status", "signatureFollowUpDueAt");
