CREATE TYPE "TrainingPracticalStatus" AS ENUM ('NOT_STARTED', 'SUBMITTED', 'APPROVED', 'NEEDS_REWORK');

CREATE TABLE "StaffTrainingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "moduleVersion" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "quizScore" INTEGER,
    "quizPassedAt" TIMESTAMP(3),
    "practicalStatus" "TrainingPracticalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "practicalSubmittedAt" TIMESTAMP(3),
    "practicalEvidence" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTrainingProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffTrainingProgress_userId_moduleCode_moduleVersion_key"
ON "StaffTrainingProgress"("userId", "moduleCode", "moduleVersion");

CREATE INDEX "StaffTrainingProgress_moduleCode_moduleVersion_idx"
ON "StaffTrainingProgress"("moduleCode", "moduleVersion");

CREATE INDEX "StaffTrainingProgress_practicalStatus_updatedAt_idx"
ON "StaffTrainingProgress"("practicalStatus", "updatedAt");

ALTER TABLE "StaffTrainingProgress"
ADD CONSTRAINT "StaffTrainingProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffTrainingProgress"
ADD CONSTRAINT "StaffTrainingProgress_approvedByUserId_fkey"
FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
