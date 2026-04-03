-- AlterTable
ALTER TABLE "FinalReport"
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "deliveredByUserId" TEXT,
ADD COLUMN "deliveryChannel" TEXT,
ADD COLUMN "shareToken" TEXT,
ADD COLUMN "shareEnabledAt" TIMESTAMP(3),
ADD COLUMN "shareRevokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "FinalReport_shareToken_key" ON "FinalReport"("shareToken");

-- CreateIndex
CREATE INDEX "FinalReport_deliveredAt_createdAt_idx" ON "FinalReport"("deliveredAt", "createdAt");

-- AddForeignKey
ALTER TABLE "FinalReport"
ADD CONSTRAINT "FinalReport_deliveredByUserId_fkey"
FOREIGN KEY ("deliveredByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
