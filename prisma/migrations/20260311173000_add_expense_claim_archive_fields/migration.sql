ALTER TABLE "ExpenseClaim"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedByEmail" TEXT;

CREATE INDEX "ExpenseClaim_archivedAt_status_idx" ON "ExpenseClaim"("archivedAt", "status");
