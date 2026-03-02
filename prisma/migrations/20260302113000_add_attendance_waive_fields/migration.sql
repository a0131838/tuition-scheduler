ALTER TABLE "Attendance"
ADD COLUMN "waiveDeduction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "waiveReason" TEXT;

