-- AlterEnum
ALTER TYPE "MidtermReportStatus" ADD VALUE 'EXEMPT';

-- AlterTable
ALTER TABLE "MidtermReport"
ADD COLUMN "exemptReason" TEXT,
ADD COLUMN "exemptedAt" TIMESTAMP(3),
ADD COLUMN "exemptedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "MidtermReport_exemptedAt_createdAt_idx" ON "MidtermReport"("exemptedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "MidtermReport"
ADD CONSTRAINT "MidtermReport_exemptedByUserId_fkey"
FOREIGN KEY ("exemptedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
