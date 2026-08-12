ALTER TABLE "ManagerTeacherFeedback"
  ADD COLUMN "ticketId" TEXT;

ALTER TABLE "ManagerTeacherFeedback"
  ADD CONSTRAINT "ManagerTeacherFeedback_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ManagerTeacherFeedback_ticketId_acknowledgedAt_idx"
  ON "ManagerTeacherFeedback"("ticketId", "acknowledgedAt");
