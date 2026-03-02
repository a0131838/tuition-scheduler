-- Track which cross-teacher feedback entries have been viewed by a teacher user.
CREATE TABLE "TeacherFeedbackRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherFeedbackRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherFeedbackRead_userId_feedbackId_key"
ON "TeacherFeedbackRead"("userId", "feedbackId");

CREATE INDEX "TeacherFeedbackRead_userId_studentId_readAt_idx"
ON "TeacherFeedbackRead"("userId", "studentId", "readAt");
