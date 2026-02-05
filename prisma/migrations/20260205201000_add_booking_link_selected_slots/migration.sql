ALTER TABLE "StudentBookingLink"
  ADD COLUMN "onlySelectedSlots" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "StudentBookingLinkSelectedSlot" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentBookingLinkSelectedSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBookingLinkSelectedSlot_linkId_teacherId_startAt_endAt_key"
  ON "StudentBookingLinkSelectedSlot"("linkId", "teacherId", "startAt", "endAt");

CREATE INDEX "StudentBookingLinkSelectedSlot_linkId_startAt_idx"
  ON "StudentBookingLinkSelectedSlot"("linkId", "startAt");

CREATE INDEX "StudentBookingLinkSelectedSlot_teacherId_startAt_idx"
  ON "StudentBookingLinkSelectedSlot"("teacherId", "startAt");

ALTER TABLE "StudentBookingLinkSelectedSlot"
  ADD CONSTRAINT "StudentBookingLinkSelectedSlot_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "StudentBookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingLinkSelectedSlot"
  ADD CONSTRAINT "StudentBookingLinkSelectedSlot_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
