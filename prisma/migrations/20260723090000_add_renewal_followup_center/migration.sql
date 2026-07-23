CREATE TABLE "RenewalTask" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_CONTACT',
  "riskLevel" TEXT NOT NULL,
  "remainingMinutes" INTEGER NOT NULL,
  "scheduledMinutes" INTEGER NOT NULL DEFAULT 0,
  "recentWeeklyMinutes" INTEGER NOT NULL DEFAULT 0,
  "lessonsRemaining" INTEGER,
  "expectedDepletionAt" TIMESTAMP(3),
  "packageValidTo" TIMESTAMP(3),
  "ownerUserId" TEXT,
  "ownerName" TEXT,
  "parentWechatGroupName" TEXT,
  "parentMessage" TEXT,
  "parentResponse" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "contactAt" TIMESTAMP(3),
  "contractId" TEXT,
  "invoiceId" TEXT,
  "paymentConfirmedAt" TIMESTAMP(3),
  "activatedPackageId" TEXT,
  "evidenceUrl" TEXT,
  "note" TEXT,
  "snoozedUntil" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "completedByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RenewalTask_status_nextFollowUpAt_idx" ON "RenewalTask"("status", "nextFollowUpAt");
CREATE INDEX "RenewalTask_riskLevel_status_createdAt_idx" ON "RenewalTask"("riskLevel", "status", "createdAt");
CREATE INDEX "RenewalTask_studentId_status_createdAt_idx" ON "RenewalTask"("studentId", "status", "createdAt");
CREATE INDEX "RenewalTask_packageId_status_createdAt_idx" ON "RenewalTask"("packageId", "status", "createdAt");
CREATE INDEX "RenewalTask_ownerUserId_status_nextFollowUpAt_idx" ON "RenewalTask"("ownerUserId", "status", "nextFollowUpAt");
CREATE UNIQUE INDEX "RenewalTask_one_open_per_package_idx"
  ON "RenewalTask"("packageId")
  WHERE "completedAt" IS NULL;

ALTER TABLE "RenewalTask"
  ADD CONSTRAINT "RenewalTask_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RenewalTask"
  ADD CONSTRAINT "RenewalTask_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
