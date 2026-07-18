CREATE TABLE "TicketSchedulingAction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEED_INFO',
    "sourceSessionId" TEXT,
    "resultSessionId" TEXT,
    "requestedStartAt" TIMESTAMP(3),
    "requestedEndAt" TIMESTAMP(3),
    "requestedTeacherId" TEXT,
    "courseLabel" TEXT,
    "durationMin" INTEGER,
    "mode" TEXT,
    "chargePolicy" TEXT,
    "replacementRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3),
    "appliedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TicketSchedulingAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketSchedulingAction_ticketId_sequence_key" ON "TicketSchedulingAction"("ticketId", "sequence");
CREATE INDEX "TicketSchedulingAction_ticketId_status_idx" ON "TicketSchedulingAction"("ticketId", "status");
CREATE INDEX "TicketSchedulingAction_sourceSessionId_idx" ON "TicketSchedulingAction"("sourceSessionId");
CREATE INDEX "TicketSchedulingAction_resultSessionId_idx" ON "TicketSchedulingAction"("resultSessionId");
CREATE INDEX "TicketSchedulingAction_requestedTeacherId_idx" ON "TicketSchedulingAction"("requestedTeacherId");

ALTER TABLE "TicketSchedulingAction" ADD CONSTRAINT "TicketSchedulingAction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketSchedulingAction" ADD CONSTRAINT "TicketSchedulingAction_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketSchedulingAction" ADD CONSTRAINT "TicketSchedulingAction_resultSessionId_fkey" FOREIGN KEY ("resultSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketSchedulingAction" ADD CONSTRAINT "TicketSchedulingAction_requestedTeacherId_fkey" FOREIGN KEY ("requestedTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
