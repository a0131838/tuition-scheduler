-- Safety migration:
-- Some environments may have this migration recorded as applied but missing the actual column.
-- This makes the schema consistent without failing if already present.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Class'
      AND column_name = 'oneOnOneGroupId'
  ) THEN
    ALTER TABLE "Class" ADD COLUMN "oneOnOneGroupId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Class_oneOnOneGroupId_fkey'
  ) THEN
    ALTER TABLE "Class"
      ADD CONSTRAINT "Class_oneOnOneGroupId_fkey"
      FOREIGN KEY ("oneOnOneGroupId")
      REFERENCES "OneOnOneGroup"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Class_oneOnOneGroupId_idx'
  ) THEN
    CREATE INDEX "Class_oneOnOneGroupId_idx" ON "Class"("oneOnOneGroupId");
  END IF;
END $$;

