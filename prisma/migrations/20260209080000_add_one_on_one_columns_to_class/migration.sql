-- Add missing optional columns used by 1:1 / group linking.
ALTER TABLE "Class" ADD COLUMN "oneOnOneGroupId" TEXT;
ALTER TABLE "Class" ADD COLUMN "oneOnOneStudentId" TEXT;

-- Keep relations consistent with the Prisma schema.
ALTER TABLE "Class"
  ADD CONSTRAINT "Class_oneOnOneGroupId_fkey"
  FOREIGN KEY ("oneOnOneGroupId") REFERENCES "OneOnOneGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_oneOnOneStudentId_fkey"
  FOREIGN KEY ("oneOnOneStudentId") REFERENCES "Student"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Class_oneOnOneGroupId_idx" ON "Class"("oneOnOneGroupId");
CREATE INDEX "Class_oneOnOneStudentId_idx" ON "Class"("oneOnOneStudentId");

