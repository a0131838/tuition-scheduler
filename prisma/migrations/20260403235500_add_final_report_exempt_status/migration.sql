-- AlterEnum
ALTER TYPE "FinalReportStatus" ADD VALUE 'EXEMPT';

-- AlterTable
ALTER TABLE "FinalReport"
ADD COLUMN "exemptReason" TEXT,
ADD COLUMN "exemptedAt" TIMESTAMP(3),
ADD COLUMN "exemptedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "FinalReport_exemptedAt_createdAt_idx" ON "FinalReport"("exemptedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "FinalReport"
ADD CONSTRAINT "FinalReport_exemptedByUserId_fkey"
FOREIGN KEY ("exemptedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
