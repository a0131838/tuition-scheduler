ALTER TABLE "MidtermReport"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedByUserId" TEXT;

CREATE INDEX "MidtermReport_archivedAt_createdAt_idx" ON "MidtermReport"("archivedAt", "createdAt");

ALTER TABLE "MidtermReport"
ADD CONSTRAINT "MidtermReport_archivedByUserId_fkey"
FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinalReport"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedByUserId" TEXT;

CREATE INDEX "FinalReport_archivedAt_createdAt_idx" ON "FinalReport"("archivedAt", "createdAt");

ALTER TABLE "FinalReport"
ADD CONSTRAINT "FinalReport_archivedByUserId_fkey"
FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
