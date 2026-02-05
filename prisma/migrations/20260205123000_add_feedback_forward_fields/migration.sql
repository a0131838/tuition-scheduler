-- AlterTable
ALTER TABLE "SessionFeedback"
ADD COLUMN "forwardedAt" TIMESTAMP(3),
ADD COLUMN "forwardedBy" TEXT,
ADD COLUMN "forwardChannel" TEXT,
ADD COLUMN "forwardNote" TEXT;
