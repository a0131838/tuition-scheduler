-- CreateEnum
CREATE TYPE "TeachingLanguage" AS ENUM ('CHINESE', 'ENGLISH', 'BILINGUAL');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "almaMater" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "subjectCourseId" TEXT,
ADD COLUMN     "teachingLanguage" "TeachingLanguage",
ADD COLUMN     "yearsExperience" INTEGER;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_subjectCourseId_fkey" FOREIGN KEY ("subjectCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
