CREATE TYPE "BookingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "StudentBookingLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT,
    "note" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentBookingLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentBookingLinkTeacher" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentBookingLinkTeacher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentBookingRequest" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "coursePref" TEXT,
    "note" TEXT,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "adminNote" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentBookingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentBookingLink_token_key" ON "StudentBookingLink"("token");
CREATE INDEX "StudentBookingLink_studentId_createdAt_idx" ON "StudentBookingLink"("studentId", "createdAt");
CREATE INDEX "StudentBookingLink_token_isActive_idx" ON "StudentBookingLink"("token", "isActive");
CREATE UNIQUE INDEX "StudentBookingLinkTeacher_linkId_teacherId_key" ON "StudentBookingLinkTeacher"("linkId", "teacherId");
CREATE INDEX "StudentBookingLinkTeacher_teacherId_idx" ON "StudentBookingLinkTeacher"("teacherId");
CREATE INDEX "StudentBookingRequest_linkId_status_createdAt_idx" ON "StudentBookingRequest"("linkId", "status", "createdAt");
CREATE INDEX "StudentBookingRequest_teacherId_startAt_idx" ON "StudentBookingRequest"("teacherId", "startAt");
CREATE INDEX "StudentBookingRequest_studentId_startAt_idx" ON "StudentBookingRequest"("studentId", "startAt");

ALTER TABLE "StudentBookingLink"
  ADD CONSTRAINT "StudentBookingLink_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingLinkTeacher"
  ADD CONSTRAINT "StudentBookingLinkTeacher_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "StudentBookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingLinkTeacher"
  ADD CONSTRAINT "StudentBookingLinkTeacher_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingRequest"
  ADD CONSTRAINT "StudentBookingRequest_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "StudentBookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingRequest"
  ADD CONSTRAINT "StudentBookingRequest_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingRequest"
  ADD CONSTRAINT "StudentBookingRequest_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBookingRequest"
  ADD CONSTRAINT "StudentBookingRequest_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
