-- AlterTable
ALTER TABLE "SessionFeedback"
ADD COLUMN "focusStudentName" TEXT,
ADD COLUMN "actualStartAt" TIMESTAMP(3),
ADD COLUMN "actualEndAt" TIMESTAMP(3),
ADD COLUMN "classPerformance" TEXT,
ADD COLUMN "homework" TEXT,
ADD COLUMN "previousHomeworkDone" BOOLEAN;
