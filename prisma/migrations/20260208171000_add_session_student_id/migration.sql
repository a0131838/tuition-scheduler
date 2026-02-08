ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "studentId" TEXT;

CREATE INDEX IF NOT EXISTS "Session_studentId_idx" ON "Session"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Session_studentId_fkey'
  ) THEN
    ALTER TABLE "Session"
    ADD CONSTRAINT "Session_studentId_fkey"
    FOREIGN KEY ("studentId")
    REFERENCES "Student"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
