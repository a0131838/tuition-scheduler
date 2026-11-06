-- CreateTable
CREATE TABLE "RenewalOrder" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "baseContractId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "baseHash" TEXT NOT NULL,
    "topUpMinutes" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "serviceFrom" TIMESTAMP(3) NOT NULL,
    "serviceTo" TIMESTAMP(3) NOT NULL,
    "paymentDueAt" TIMESTAMP(3) NOT NULL,
    "academicNote" TEXT NOT NULL,
    "academicBy" TEXT NOT NULL,
    "salesNote" TEXT,
    "salesBy" TEXT,
    "qualificationRef" TEXT,
    "managerBy" TEXT,
    "managerAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "parentToken" TEXT NOT NULL,
    "parentExpiresAt" TIMESTAMP(3) NOT NULL,
    "parentName" TEXT,
    "parentAcceptedAt" TIMESTAMP(3),
    "parentIp" TEXT,
    "creditMinutes" INTEGER,
    "creditLimitCents" INTEGER,
    "creditDueAt" TIMESTAMP(3),
    "creditReason" TEXT,
    "collectionOwner" TEXT,
    "creditApprovedBy" TEXT,
    "creditApprovedAt" TIMESTAMP(3),
    "creditPackageId" TEXT,
    "creditReleasedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "activatedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RenewalOrder_contractId_key" ON "RenewalOrder"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalOrder_invoiceId_key" ON "RenewalOrder"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalOrder_parentToken_key" ON "RenewalOrder"("parentToken");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalOrder_creditPackageId_key" ON "RenewalOrder"("creditPackageId");

-- CreateIndex
CREATE INDEX "RenewalOrder_activatedAt_cancelledAt_idx" ON "RenewalOrder"("activatedAt", "cancelledAt");

-- CreateIndex
CREATE INDEX "RenewalOrder_creditDueAt_idx" ON "RenewalOrder"("creditDueAt");

-- AddForeignKey
ALTER TABLE "RenewalOrder" ADD CONSTRAINT "RenewalOrder_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "StudentContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
