CREATE TABLE "ManagerTeacherFeedback" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "managerUserId" TEXT,
  "sessionId" TEXT,
  "category" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "requiresAck" BOOLEAN NOT NULL DEFAULT true,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ManagerTeacherFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagerTeacherFeedback_teacherId_archivedAt_createdAt_idx"
  ON "ManagerTeacherFeedback"("teacherId", "archivedAt", "createdAt");

CREATE INDEX "ManagerTeacherFeedback_managerUserId_createdAt_idx"
  ON "ManagerTeacherFeedback"("managerUserId", "createdAt");

CREATE INDEX "ManagerTeacherFeedback_sessionId_idx"
  ON "ManagerTeacherFeedback"("sessionId");

ALTER TABLE "ManagerTeacherFeedback"
  ADD CONSTRAINT "ManagerTeacherFeedback_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManagerTeacherFeedback"
  ADD CONSTRAINT "ManagerTeacherFeedback_managerUserId_fkey"
  FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ManagerTeacherFeedback"
  ADD CONSTRAINT "ManagerTeacherFeedback_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
