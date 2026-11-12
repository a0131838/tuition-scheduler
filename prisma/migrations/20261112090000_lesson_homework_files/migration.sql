ALTER TABLE "SessionFeedback"
  ADD COLUMN "pendingHomeworkUploadIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "SessionFeedbackAttachment"
  ADD COLUMN "studentId" TEXT,
  ADD COLUMN "recipientStudentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "uploadKey" TEXT;

CREATE UNIQUE INDEX "SessionFeedbackAttachment_feedbackId_uploadKey_key"
  ON "SessionFeedbackAttachment"("feedbackId", "uploadKey");

-- Existing one-to-one files keep their audience where the student is unambiguous.
WITH recipients AS (
  SELECT f.id, COALESCE(s."studentId", c."oneOnOneStudentId", only_enrolment."studentId") AS "studentId"
  FROM "SessionFeedback" f
  JOIN "Session" s ON s.id = f."sessionId"
  JOIN "Class" c ON c.id = s."classId" AND c.capacity = 1
  LEFT JOIN LATERAL (
    SELECT MIN(e."studentId") AS "studentId"
    FROM "Enrollment" e
    WHERE e."classId" = c.id
    HAVING COUNT(*) = 1
  ) only_enrolment ON TRUE
)
UPDATE "SessionFeedbackAttachment" a
SET "studentId" = r."studentId", "recipientStudentIds" = ARRAY[r."studentId"]
FROM recipients r
WHERE a."feedbackId" = r.id AND a.visibility = 'PARENT' AND r."studentId" IS NOT NULL;
