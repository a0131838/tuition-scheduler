-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('ON_TIME', 'LATE', 'PROXY_DRAFT');

-- AlterTable
ALTER TABLE "SessionFeedback"
ADD COLUMN "status" "FeedbackStatus" NOT NULL DEFAULT 'ON_TIME',
ADD COLUMN "dueAt" TIMESTAMP(3),
ADD COLUMN "submittedByRole" TEXT,
ADD COLUMN "submittedByUserId" TEXT,
ADD COLUMN "isProxyDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "proxyNote" TEXT;

-- CreateIndex
CREATE INDEX "SessionFeedback_status_dueAt_idx" ON "SessionFeedback"("status", "dueAt");
