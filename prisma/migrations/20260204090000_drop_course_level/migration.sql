-- Drop legacy level column from Course (migrated to Subject/Level)
ALTER TABLE "Course" DROP COLUMN "level";
