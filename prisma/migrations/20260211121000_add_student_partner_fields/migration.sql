-- Add structured partner intake fields on student profile
ALTER TABLE "Student"
ADD COLUMN "targetSchool" TEXT,
ADD COLUMN "currentMajor" TEXT,
ADD COLUMN "coachingContent" TEXT;

