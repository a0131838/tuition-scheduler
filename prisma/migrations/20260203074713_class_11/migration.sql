-- CreateTable
CREATE TABLE "TeacherOneOnOneTemplate" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherOneOnOneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherOneOnOneTemplate_teacherId_idx" ON "TeacherOneOnOneTemplate"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherOneOnOneTemplate_studentId_idx" ON "TeacherOneOnOneTemplate"("studentId");

-- AddForeignKey
ALTER TABLE "TeacherOneOnOneTemplate" ADD CONSTRAINT "TeacherOneOnOneTemplate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherOneOnOneTemplate" ADD CONSTRAINT "TeacherOneOnOneTemplate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherOneOnOneTemplate" ADD CONSTRAINT "TeacherOneOnOneTemplate_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
