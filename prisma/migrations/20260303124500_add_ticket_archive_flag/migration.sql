ALTER TABLE "Ticket"
  ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Ticket_isArchived_createdAt_idx" ON "Ticket"("isArchived", "createdAt");
