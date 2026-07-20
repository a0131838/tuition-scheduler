CREATE TABLE "SessionFeedbackAttachment" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "storedPath" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'PARENT',
  "uploadedByUserId" TEXT NOT NULL,
  "uploadedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SessionFeedbackAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionFeedbackAttachment_feedbackId_visibility_createdAt_idx"
  ON "SessionFeedbackAttachment"("feedbackId", "visibility", "createdAt");

CREATE INDEX "SessionFeedbackAttachment_uploadedByUserId_createdAt_idx"
  ON "SessionFeedbackAttachment"("uploadedByUserId", "createdAt");

ALTER TABLE "SessionFeedbackAttachment"
  ADD CONSTRAINT "SessionFeedbackAttachment_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "SessionFeedback"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
