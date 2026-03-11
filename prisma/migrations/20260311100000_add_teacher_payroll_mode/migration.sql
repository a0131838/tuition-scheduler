-- Add teaching mode dimension for teacher payroll rates.
ALTER TABLE "TeacherCourseRate"
ADD COLUMN "teachingMode" TEXT NOT NULL DEFAULT 'ONE_ON_ONE';

DROP INDEX IF EXISTS "TeacherCourseRate_teacherId_courseId_subjectKey_levelKey_key";
CREATE UNIQUE INDEX "TeacherCourseRate_teacherId_courseId_subjectKey_levelKey_teach_key"
ON "TeacherCourseRate"("teacherId", "courseId", "subjectKey", "levelKey", "teachingMode");
