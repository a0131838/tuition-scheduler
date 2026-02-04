-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_subjectCourseId_fkey";

-- DropForeignKey
ALTER TABLE "_TeacherSubjects" DROP CONSTRAINT "_TeacherSubjects_A_fkey";

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "levelId" TEXT,
ADD COLUMN     "subjectId" TEXT;

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "level" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- Seed default Subject/Level for existing courses and backfill relations
INSERT INTO "Subject" ("id", "name", "courseId")
SELECT 'subj_' || c.id, 'General', c.id
FROM "Course" c;

INSERT INTO "Level" ("id", "name", "subjectId")
SELECT 'lvl_' || c.id, COALESCE(NULLIF(BTRIM(c.level), ''), 'Default'), 'subj_' || c.id
FROM "Course" c;

UPDATE "Class"
SET "subjectId" = 'subj_' || "courseId",
    "levelId" = 'lvl_' || "courseId"
WHERE "subjectId" IS NULL OR "levelId" IS NULL;

UPDATE "Teacher"
SET "subjectCourseId" = 'subj_' || "subjectCourseId"
WHERE "subjectCourseId" IS NOT NULL AND "subjectCourseId" NOT LIKE 'subj_%';

UPDATE "_TeacherSubjects"
SET "A" = 'subj_' || "A"
WHERE "A" NOT LIKE 'subj_%';

-- CreateIndex
CREATE INDEX "Subject_courseId_idx" ON "Subject"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_courseId_name_key" ON "Subject"("courseId", "name");

-- CreateIndex
CREATE INDEX "Level_subjectId_idx" ON "Level"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_subjectId_name_key" ON "Level"("subjectId", "name");

-- CreateIndex
CREATE INDEX "Class_subjectId_idx" ON "Class"("subjectId");

-- CreateIndex
CREATE INDEX "Class_levelId_idx" ON "Class"("levelId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_subjectCourseId_fkey" FOREIGN KEY ("subjectCourseId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherSubjects" ADD CONSTRAINT "_TeacherSubjects_A_fkey" FOREIGN KEY ("A") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
