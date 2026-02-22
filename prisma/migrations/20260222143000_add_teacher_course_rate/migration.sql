CREATE TABLE IF NOT EXISTS "TeacherCourseRate" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "subjectId" TEXT,
  "levelId" TEXT,
  "subjectKey" TEXT NOT NULL DEFAULT '',
  "levelKey" TEXT NOT NULL DEFAULT '',
  "hourlyRateCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherCourseRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherCourseRate_teacherId_courseId_subjectKey_levelKey_key"
  ON "TeacherCourseRate"("teacherId", "courseId", "subjectKey", "levelKey");

CREATE INDEX IF NOT EXISTS "TeacherCourseRate_teacherId_updatedAt_idx"
  ON "TeacherCourseRate"("teacherId", "updatedAt");

ALTER TABLE "TeacherCourseRate"
  ADD CONSTRAINT "TeacherCourseRate_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherCourseRate"
  ADD CONSTRAINT "TeacherCourseRate_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherCourseRate"
  ADD CONSTRAINT "TeacherCourseRate_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeacherCourseRate"
  ADD CONSTRAINT "TeacherCourseRate_levelId_fkey"
  FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
