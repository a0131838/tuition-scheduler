-- AlterTable
ALTER TABLE "FinalReport"
ADD COLUMN "shareFirstViewedAt" TIMESTAMP(3),
ADD COLUMN "shareLastViewedAt" TIMESTAMP(3),
ADD COLUMN "shareViewCount" INTEGER NOT NULL DEFAULT 0;
