-- Add an isolated credit-note ledger for partner invoices.
-- Existing invoices, receipts, settlements, packages, attendance and teaching records are unchanged.
CREATE TYPE "CreditNoteSourceType" AS ENUM ('PARTNER_INVOICE');
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOID');

CREATE TABLE "CreditNote" (
  "id" TEXT NOT NULL,
  "sourceType" "CreditNoteSourceType" NOT NULL DEFAULT 'PARTNER_INVOICE',
  "sourceInvoiceId" TEXT NOT NULL,
  "sourceInvoiceNo" TEXT NOT NULL,
  "sourceInvoiceDate" TEXT NOT NULL,
  "sourceInvoiceSnapshot" JSONB NOT NULL,
  "creditNoteNo" TEXT NOT NULL,
  "issueDate" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SGD',
  "supplierName" TEXT NOT NULL,
  "supplierAddress" TEXT NOT NULL,
  "supplierRegistrationNo" TEXT NOT NULL,
  "supplierGstRegistrationNo" TEXT,
  "customerName" TEXT NOT NULL,
  "customerAddress" TEXT,
  "reason" TEXT NOT NULL,
  "originalInvoiceTotal" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "gstAmount" DECIMAL(12,2) NOT NULL,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "issuedBy" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidedBy" TEXT,
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreditNoteLine" (
  "id" TEXT NOT NULL,
  "creditNoteId" TEXT NOT NULL,
  "sourceInvoiceLineId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "amount" DECIMAL(12,2) NOT NULL,
  "gstAmount" DECIMAL(12,2) NOT NULL,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNoteLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditNote_creditNoteNo_key" ON "CreditNote"("creditNoteNo");
CREATE INDEX "CreditNote_sourceType_sourceInvoiceId_status_idx" ON "CreditNote"("sourceType", "sourceInvoiceId", "status");
CREATE INDEX "CreditNote_sourceInvoiceNo_createdAt_idx" ON "CreditNote"("sourceInvoiceNo", "createdAt");
CREATE INDEX "CreditNote_status_issueDate_idx" ON "CreditNote"("status", "issueDate");
CREATE INDEX "CreditNoteLine_creditNoteId_idx" ON "CreditNoteLine"("creditNoteId");
CREATE INDEX "CreditNoteLine_sourceInvoiceLineId_idx" ON "CreditNoteLine"("sourceInvoiceLineId");

ALTER TABLE "CreditNoteLine" ADD CONSTRAINT "CreditNoteLine_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
