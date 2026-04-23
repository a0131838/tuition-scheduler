DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentParentIntakeStatus') THEN
    CREATE TYPE "StudentParentIntakeStatus" AS ENUM ('LINK_SENT', 'SUBMITTED', 'CONTRACT_READY', 'SIGNED', 'VOID');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "StudentParentIntake" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" "StudentParentIntakeStatus" NOT NULL DEFAULT 'LINK_SENT',
  "label" TEXT,
  "expiresAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "contractReadyAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "studentId" TEXT,
  "packageId" TEXT,
  "contractId" TEXT,
  "payloadJson" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentParentIntake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentParentIntake_token_key" ON "StudentParentIntake"("token");
CREATE INDEX IF NOT EXISTS "StudentParentIntake_status_createdAt_idx" ON "StudentParentIntake"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentParentIntake_studentId_createdAt_idx" ON "StudentParentIntake"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentParentIntake_createdByUserId_createdAt_idx" ON "StudentParentIntake"("createdByUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentParentIntake_studentId_fkey'
      AND table_name = 'StudentParentIntake'
  ) THEN
    ALTER TABLE "StudentParentIntake"
      ADD CONSTRAINT "StudentParentIntake_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentParentIntake_packageId_fkey'
      AND table_name = 'StudentParentIntake'
  ) THEN
    ALTER TABLE "StudentParentIntake"
      ADD CONSTRAINT "StudentParentIntake_packageId_fkey"
      FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentParentIntake_contractId_fkey'
      AND table_name = 'StudentParentIntake'
  ) THEN
    ALTER TABLE "StudentParentIntake"
      ADD CONSTRAINT "StudentParentIntake_contractId_fkey"
      FOREIGN KEY ("contractId") REFERENCES "StudentContract"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentParentIntake_createdByUserId_fkey'
      AND table_name = 'StudentParentIntake'
  ) THEN
    ALTER TABLE "StudentParentIntake"
      ADD CONSTRAINT "StudentParentIntake_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
