ALTER TABLE "Ticket"
ADD COLUMN "studentId" TEXT;

CREATE INDEX "Ticket_studentId_isArchived_createdAt_idx" ON "Ticket"("studentId", "isArchived", "createdAt");

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
