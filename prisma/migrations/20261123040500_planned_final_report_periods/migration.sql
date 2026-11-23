BEGIN;
ALTER TABLE "FinalReportPeriod"
  ALTER COLUMN "startsAt" DROP NOT NULL,
  ALTER COLUMN "endsAt" DROP NOT NULL,
  ALTER COLUMN "confirmedAt" DROP DEFAULT,
  ALTER COLUMN "confirmedAt" DROP NOT NULL,
  ALTER COLUMN "confirmedByUserId" DROP NOT NULL,
  ADD CONSTRAINT "FinalReportPeriod_boundary_state" CHECK (
    num_nonnulls("startsAt", "endsAt", "confirmedAt", "confirmedByUserId") IN (0, 4)
  );
COMMIT;
