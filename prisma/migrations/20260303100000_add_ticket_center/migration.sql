CREATE TABLE "TicketDailyCounter" (
  "dayKey" TEXT NOT NULL,
  "nextSeq" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TicketDailyCounter_pkey" PRIMARY KEY ("dayKey")
);

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "ticketNo" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "grade" TEXT,
  "course" TEXT,
  "teacher" TEXT,
  "poc" TEXT,
  "wechat" TEXT,
  "phone" TEXT,
  "parentAvailability" TEXT,
  "teacherAvailability" TEXT,
  "durationMin" INTEGER,
  "mode" TEXT,
  "addressOrLink" TEXT,
  "confirmDeadline" TIMESTAMP(3),
  "slaDue" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "owner" TEXT,
  "version" TEXT,
  "systemUpdated" TEXT,
  "finalSchedule" TEXT,
  "lastUpdateAt" TIMESTAMP(3),
  "summary" TEXT,
  "risksNotes" TEXT,
  "nextAction" TEXT,
  "nextActionDue" TIMESTAMP(3),
  "proof" TEXT,
  "createdByName" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketHandover" (
  "id" TEXT NOT NULL,
  "handoverDate" TIMESTAMP(3) NOT NULL,
  "newTickets" INTEGER NOT NULL DEFAULT 0,
  "completed" INTEGER NOT NULL DEFAULT 0,
  "needInfo" TEXT,
  "waitingTeacher" TEXT,
  "waitingParentPartner" TEXT,
  "tomorrowLessonsCheck" TEXT,
  "exceptionsEscalations" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TicketHandover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ticket_ticketNo_key" ON "Ticket"("ticketNo");
CREATE UNIQUE INDEX "TicketHandover_handoverDate_key" ON "TicketHandover"("handoverDate");

CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");
CREATE INDEX "Ticket_priority_createdAt_idx" ON "Ticket"("priority", "createdAt");
CREATE INDEX "Ticket_studentName_createdAt_idx" ON "Ticket"("studentName", "createdAt");
CREATE INDEX "Ticket_type_createdAt_idx" ON "Ticket"("type", "createdAt");

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_completedByUserId_fkey"
  FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketHandover"
  ADD CONSTRAINT "TicketHandover_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
