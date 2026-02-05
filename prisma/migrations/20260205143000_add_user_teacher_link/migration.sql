-- Add optional stable link from auth user to teacher profile
ALTER TABLE "User" ADD COLUMN "teacherId" TEXT;

-- Backfill for existing teacher users where name can match one teacher record
UPDATE "User" u
SET "teacherId" = t.id
FROM "Teacher" t
WHERE u.role = 'TEACHER'
  AND u."teacherId" IS NULL
  AND u.name = t.name
  AND (
    SELECT COUNT(*)
    FROM "Teacher" tx
    WHERE tx.name = u.name
  ) = 1;

CREATE UNIQUE INDEX "User_teacherId_key" ON "User"("teacherId");

ALTER TABLE "User"
ADD CONSTRAINT "User_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
