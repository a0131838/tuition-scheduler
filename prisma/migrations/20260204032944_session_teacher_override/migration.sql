-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "teacherId" TEXT;

-- CreateTable
CREATE TABLE "SessionTeacherChange" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fromTeacherId" TEXT NOT NULL,
    "toTeacherId" TEXT NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTeacherChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionTeacherChange_sessionId_idx" ON "SessionTeacherChange"("sessionId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTeacherChange" ADD CONSTRAINT "SessionTeacherChange_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTeacherChange" ADD CONSTRAINT "SessionTeacherChange_fromTeacherId_fkey" FOREIGN KEY ("fromTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTeacherChange" ADD CONSTRAINT "SessionTeacherChange_toTeacherId_fkey" FOREIGN KEY ("toTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
