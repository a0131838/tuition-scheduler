CREATE TABLE "SopAuthorAccess" ("userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE, "grantedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "SopReview" ("key" TEXT PRIMARY KEY, "sourceHash" TEXT, "topicKey" TEXT, "status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED', "ownerName" TEXT NOT NULL, "reviewedAt" TIMESTAMP(3), "nextReviewAt" TIMESTAMP(3), "replacementKey" TEXT, "note" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "SopReview_status" CHECK ("status" IN ('CURRENT','REVIEW_REQUIRED','WITHDRAWN')),
CONSTRAINT "SopReview_no_self_replacement" CHECK ("replacementKey" IS NULL OR "replacementKey" <> "key"));
CREATE TABLE "SopFeedback" ("id" TEXT PRIMARY KEY, "key" TEXT NOT NULL, "reporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "reporterName" TEXT NOT NULL, "step" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "resolution" TEXT, "resolvedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3), CONSTRAINT "SopFeedback_status" CHECK ("status" IN ('OPEN','RESOLVED')));
CREATE INDEX "SopFeedback_status_createdAt_idx" ON "SopFeedback"("status","createdAt");
CREATE INDEX "SopFeedback_key_createdAt_idx" ON "SopFeedback"("key","createdAt");
