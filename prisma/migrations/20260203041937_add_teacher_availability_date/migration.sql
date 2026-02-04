-- CreateTable
CREATE TABLE "TeacherAvailabilityDate" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "TeacherAvailabilityDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAvailabilityDate_teacherId_date_idx" ON "TeacherAvailabilityDate"("teacherId", "date");

-- AddForeignKey
ALTER TABLE "TeacherAvailabilityDate" ADD CONSTRAINT "TeacherAvailabilityDate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
