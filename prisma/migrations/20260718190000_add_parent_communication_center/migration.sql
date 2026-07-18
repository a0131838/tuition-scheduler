ALTER TABLE "SessionFeedback"
  ADD COLUMN "parentContent" TEXT,
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByUserId" TEXT,
  ADD COLUMN "reviewedByName" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishedByUserId" TEXT,
  ADD COLUMN "publishedByName" TEXT;

UPDATE "SessionFeedback"
SET
  "parentContent" = "content",
  "reviewStatus" = CASE WHEN "isProxyDraft" = true OR "status"::text = 'PROXY_DRAFT' THEN 'DRAFT' ELSE 'PUBLISHED' END,
  "reviewedAt" = CASE WHEN "isProxyDraft" = false AND "status"::text <> 'PROXY_DRAFT' THEN "submittedAt" ELSE NULL END,
  "reviewedByName" = CASE WHEN "isProxyDraft" = false AND "status"::text <> 'PROXY_DRAFT' THEN COALESCE("forwardedBy", 'Existing system record') ELSE NULL END,
  "publishedAt" = CASE WHEN "isProxyDraft" = false AND "status"::text <> 'PROXY_DRAFT' THEN "submittedAt" ELSE NULL END,
  "publishedByName" = CASE WHEN "isProxyDraft" = false AND "status"::text <> 'PROXY_DRAFT' THEN COALESCE("forwardedBy", 'Existing system record') ELSE NULL END;

CREATE INDEX "SessionFeedback_reviewStatus_submittedAt_idx" ON "SessionFeedback"("reviewStatus", "submittedAt");
CREATE INDEX "SessionFeedback_publishedAt_submittedAt_idx" ON "SessionFeedback"("publishedAt", "submittedAt");

ALTER TABLE "ParentStudentLink"
  ADD COLUMN "wechatGroupName" TEXT,
  ADD COLUMN "communicationOwner" TEXT,
  ADD COLUMN "preferredLanguage" TEXT DEFAULT 'BILINGUAL',
  ADD COLUMN "manualReminderEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "ParentCommunicationTask" (
  "id" TEXT NOT NULL,
  "taskKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "studentId" TEXT,
  "sessionId" TEXT,
  "feedbackId" TEXT,
  "teacherId" TEXT,
  "parentId" TEXT,
  "title" TEXT NOT NULL,
  "messageText" TEXT NOT NULL,
  "contentFingerprint" TEXT,
  "dueAt" TIMESTAMP(3),
  "ownerUserId" TEXT,
  "ownerName" TEXT,
  "claimedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "publishedByUserId" TEXT,
  "publishedByName" TEXT,
  "copiedAt" TIMESTAMP(3),
  "copiedByUserId" TEXT,
  "copiedByName" TEXT,
  "manualSentAt" TIMESTAMP(3),
  "manualSentByUserId" TEXT,
  "manualSentByName" TEXT,
  "manualChannel" TEXT,
  "wechatGroupName" TEXT,
  "evidenceUrl" TEXT,
  "note" TEXT,
  "correctionOfTaskId" TEXT,
  "supersededAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentCommunicationTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentCommunicationTask_taskKey_key" ON "ParentCommunicationTask"("taskKey");
CREATE INDEX "ParentCommunicationTask_status_dueAt_idx" ON "ParentCommunicationTask"("status", "dueAt");
CREATE INDEX "ParentCommunicationTask_kind_status_createdAt_idx" ON "ParentCommunicationTask"("kind", "status", "createdAt");
CREATE INDEX "ParentCommunicationTask_studentId_createdAt_idx" ON "ParentCommunicationTask"("studentId", "createdAt");
CREATE INDEX "ParentCommunicationTask_sessionId_createdAt_idx" ON "ParentCommunicationTask"("sessionId", "createdAt");
CREATE INDEX "ParentCommunicationTask_feedbackId_createdAt_idx" ON "ParentCommunicationTask"("feedbackId", "createdAt");
CREATE INDEX "ParentCommunicationTask_ownerUserId_status_idx" ON "ParentCommunicationTask"("ownerUserId", "status");
