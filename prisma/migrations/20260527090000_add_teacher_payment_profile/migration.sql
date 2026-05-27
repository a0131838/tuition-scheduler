ALTER TABLE "Teacher" ADD COLUMN "tutorCode" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "payNowType" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "payNowValue" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "payNowName" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "payNowNote" TEXT;

WITH ranked AS (
  SELECT
    id,
    'T' || LPAD(ROW_NUMBER() OVER (ORDER BY name ASC, id ASC)::text, 3, '0') AS code
  FROM "Teacher"
  WHERE "tutorCode" IS NULL
)
UPDATE "Teacher" t
SET "tutorCode" = ranked.code
FROM ranked
WHERE t.id = ranked.id;

CREATE UNIQUE INDEX "Teacher_tutorCode_key" ON "Teacher"("tutorCode");
