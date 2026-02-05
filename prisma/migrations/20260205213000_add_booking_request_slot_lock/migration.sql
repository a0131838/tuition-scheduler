CREATE TABLE "StudentBookingRequestSlotLock" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentBookingRequestSlotLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBookingRequestSlotLock_requestId_key"
  ON "StudentBookingRequestSlotLock"("requestId");

CREATE UNIQUE INDEX "StudentBookingRequestSlotLock_teacherId_startAt_endAt_key"
  ON "StudentBookingRequestSlotLock"("teacherId", "startAt", "endAt");

CREATE INDEX "StudentBookingRequestSlotLock_teacherId_startAt_idx"
  ON "StudentBookingRequestSlotLock"("teacherId", "startAt");

ALTER TABLE "StudentBookingRequestSlotLock"
  ADD CONSTRAINT "StudentBookingRequestSlotLock_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "StudentBookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingRequestSlotLock"
  ADD CONSTRAINT "StudentBookingRequestSlotLock_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
