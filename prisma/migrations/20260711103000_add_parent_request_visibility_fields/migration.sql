ALTER TABLE "Ticket"
  ADD COLUMN "parentVisible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "parentPublicSummary" TEXT,
  ADD COLUMN "parentInternalNote" TEXT,
  ADD COLUMN "parentCommunicationSource" TEXT,
  ADD COLUMN "parentCompletionResult" TEXT,
  ADD COLUMN "parentAssistedByUserId" TEXT,
  ADD COLUMN "parentAssistedByName" TEXT;

-- Existing miniapp requests should remain visible after this release. The current
-- Ticket summary stays intact; these values are a structured projection of it.
UPDATE "Ticket"
SET
  "parentVisible" = true,
  "parentPublicSummary" = COALESCE(
    NULLIF(BTRIM(SPLIT_PART(SPLIT_PART("summary", '【对外摘要】', 2), '【员工代录原始摘要】', 1)), ''),
    NULLIF(BTRIM(SPLIT_PART(SPLIT_PART("summary", '[SITUATION_CURRENT]', 2), '[SITUATION_ACTION]', 1)), '')
  ),
  "parentInternalNote" = NULLIF(BTRIM(SPLIT_PART(SPLIT_PART("summary", '【员工代录原始摘要】', 2), '【沟通入口】', 1)), ''),
  "parentCommunicationSource" = NULLIF(BTRIM(SPLIT_PART(SPLIT_PART("summary", '【沟通入口】', 2), '[SITUATION_ACTION]', 1)), ''),
  "parentCompletionResult" = "finalSchedule",
  "parentAssistedByName" = CASE
    WHEN "createdByName" LIKE '员工代录：%' THEN NULLIF(BTRIM(SUBSTRING("createdByName" FROM CHAR_LENGTH('员工代录：') + 1)), '')
    ELSE NULL
  END
WHERE "source" = '家长小程序';

CREATE INDEX "Ticket_parentVisible_studentId_isArchived_createdAt_idx"
  ON "Ticket"("parentVisible", "studentId", "isArchived", "createdAt");
