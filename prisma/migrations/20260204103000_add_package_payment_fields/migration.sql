-- Add payment fields to CoursePackage
ALTER TABLE "CoursePackage"
  ADD COLUMN "paid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "paidAmount" INTEGER,
  ADD COLUMN "paidNote" TEXT;
