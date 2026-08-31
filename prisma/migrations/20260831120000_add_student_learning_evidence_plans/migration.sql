-- CreateTable
CREATE TABLE "StudentLearningPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "evidenceSnapshotJson" JSONB NOT NULL,
    "goals" TEXT NOT NULL,
    "teacherActions" TEXT,
    "studentActions" TEXT,
    "parentActions" TEXT,
    "reviewDueAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLearningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentLearningPlan_studentId_periodStart_periodEnd_idx" ON "StudentLearningPlan"("studentId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "StudentLearningPlan_status_reviewDueAt_idx" ON "StudentLearningPlan"("status", "reviewDueAt");

-- AddForeignKey
ALTER TABLE "StudentLearningPlan" ADD CONSTRAINT "StudentLearningPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLearningPlan" ADD CONSTRAINT "StudentLearningPlan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLearningPlan" ADD CONSTRAINT "StudentLearningPlan_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
