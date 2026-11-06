ALTER TYPE "StudentContractStatus" ADD VALUE 'RENEWAL_CONFIRMED';
ALTER TABLE "RenewalOrder" ADD CONSTRAINT "RenewalOrder_positive_terms" CHECK ("feeCents">0 AND "topUpMinutes">0 AND "serviceTo">"serviceFrom" AND "paymentDueAt"<="serviceTo");
ALTER TABLE "RenewalOrder" ADD CONSTRAINT "RenewalOrder_activation_evidence" CHECK (
 "activatedAt" IS NULL OR ("activatedBy" IS NOT NULL AND "managerBy" IS NOT NULL AND "managerAt" IS NOT NULL AND "parentAcceptedAt" IS NOT NULL AND "invoiceId" IS NOT NULL AND "managerBy"<>"activatedBy")
);
ALTER TABLE "RenewalOrder" ADD CONSTRAINT "RenewalOrder_credit_evidence" CHECK (
 "creditPackageId" IS NULL OR ("creditMinutes" IS NOT NULL AND "creditLimitCents" IS NOT NULL AND "creditMinutes">0 AND "creditMinutes"<="topUpMinutes" AND "creditLimitCents">0 AND "creditLimitCents"<="feeCents" AND "creditDueAt" IS NOT NULL AND "creditApprovedBy" IS NOT NULL AND "creditReleasedBy" IS NOT NULL AND "creditApprovedAt" IS NOT NULL AND "collectionOwner" IS NOT NULL AND "creditReason" IS NOT NULL AND "creditApprovedBy"<>"creditReleasedBy")
);
