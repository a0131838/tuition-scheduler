ALTER TABLE "RenewalOrder" ADD COLUMN "verifiedReceiptIds" JSONB, ADD COLUMN "verifiedAmountCents" INTEGER;
ALTER TABLE "RenewalOrder" ADD CONSTRAINT "RenewalOrder_paid_evidence" CHECK ("activatedAt" IS NULL OR ("verifiedReceiptIds" IS NOT NULL AND "verifiedAmountCents" IS NOT NULL AND "verifiedAmountCents"="feeCents"));
