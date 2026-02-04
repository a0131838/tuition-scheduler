-- Add online flag for campus
ALTER TABLE "Campus" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;
