CREATE TABLE "TeacherAvailabilityBlock" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "startMin" INTEGER NOT NULL,
  "endMin" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherAvailabilityBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherAvailabilityBlock_valid_range" CHECK ("startMin" >= 0 AND "endMin" <= 1440 AND "endMin" > "startMin")
);
CREATE UNIQUE INDEX "TeacherAvailabilityBlock_teacherId_date_startMin_endMin_key" ON "TeacherAvailabilityBlock"("teacherId", "date", "startMin", "endMin");
CREATE INDEX "TeacherAvailabilityBlock_teacherId_date_idx" ON "TeacherAvailabilityBlock"("teacherId", "date");
ALTER TABLE "TeacherAvailabilityBlock" ADD CONSTRAINT "TeacherAvailabilityBlock_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
