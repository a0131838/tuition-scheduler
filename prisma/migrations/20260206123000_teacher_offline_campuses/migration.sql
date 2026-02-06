-- Add offline teaching locations
ALTER TABLE "Teacher" ADD COLUMN "offlineShanghai" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Teacher" ADD COLUMN "offlineSingapore" BOOLEAN NOT NULL DEFAULT false;
