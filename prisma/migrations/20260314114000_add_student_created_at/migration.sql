ALTER TABLE "Student"
ADD COLUMN "createdAt" TIMESTAMP(3);

UPDATE "Student"
SET "createdAt" = TIMESTAMP '2000-01-01 00:00:00'
WHERE "createdAt" IS NULL;

ALTER TABLE "Student"
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Student_createdAt_idx" ON "Student"("createdAt");
