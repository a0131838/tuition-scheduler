-- CreateTable
CREATE TABLE "OneOnOneGroup" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "subjectId" TEXT,
    "levelId" TEXT,
    "campusId" TEXT NOT NULL,
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneOnOneGroup_pkey" PRIMARY KEY ("id")
);

-- Add columns to Class
ALTER TABLE "Class" ADD COLUMN "oneOnOneGroupId" TEXT;
ALTER TABLE "Class" ADD COLUMN "oneOnOneStudentId" TEXT;

-- AddForeignKey
ALTER TABLE "OneOnOneGroup" ADD CONSTRAINT "OneOnOneGroup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OneOnOneGroup" ADD CONSTRAINT "OneOnOneGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OneOnOneGroup" ADD CONSTRAINT "OneOnOneGroup_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OneOnOneGroup" ADD CONSTRAINT "OneOnOneGroup_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OneOnOneGroup" ADD CONSTRAINT "OneOnOneGroup_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OneOnOneGroup" ADD CONSTRAINT "OneOnOneGroup_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Class" ADD CONSTRAINT "Class_oneOnOneGroupId_fkey" FOREIGN KEY ("oneOnOneGroupId") REFERENCES "OneOnOneGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Class" ADD CONSTRAINT "Class_oneOnOneStudentId_fkey" FOREIGN KEY ("oneOnOneStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "OneOnOneGroup_teacherId_idx" ON "OneOnOneGroup"("teacherId");
CREATE INDEX "OneOnOneGroup_courseId_idx" ON "OneOnOneGroup"("courseId");
CREATE INDEX "OneOnOneGroup_campusId_idx" ON "OneOnOneGroup"("campusId");
CREATE INDEX "Class_oneOnOneGroupId_idx" ON "Class"("oneOnOneGroupId");
CREATE INDEX "Class_oneOnOneStudentId_idx" ON "Class"("oneOnOneStudentId");

