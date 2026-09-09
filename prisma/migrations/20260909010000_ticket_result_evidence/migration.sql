ALTER TABLE "TicketSchedulingAction" ADD COLUMN "resultSessionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
