ALTER TABLE "StudentBookingRequest" ADD COLUMN "sessionId" TEXT;

CREATE INDEX "StudentBookingRequest_sessionId_idx" ON "StudentBookingRequest"("sessionId");

ALTER TABLE "StudentBookingRequest"
  ADD CONSTRAINT "StudentBookingRequest_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;