ALTER TABLE "Ticket"
ADD COLUMN "teacherId" TEXT;

CREATE INDEX "Ticket_teacherId_createdAt_idx"
ON "Ticket"("teacherId", "createdAt");

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

WITH matched AS (
  SELECT
    tk."id" AS ticket_id,
    MIN(tr."id") AS teacher_id,
    COUNT(tr."id") AS teacher_count
  FROM "Ticket" tk
  JOIN "Teacher" tr
    ON LOWER(BTRIM(COALESCE(tk."teacher", ''))) = LOWER(BTRIM(tr."name"))
  WHERE tk."teacherId" IS NULL
    AND BTRIM(COALESCE(tk."teacher", '')) <> ''
  GROUP BY tk."id"
)
UPDATE "Ticket" tk
SET "teacherId" = matched.teacher_id
FROM matched
WHERE tk."id" = matched.ticket_id
  AND matched.teacher_count = 1;
