-- CreateTable
CREATE TABLE "CoursePackageSharedStudent" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePackageSharedStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoursePackageSharedStudent_packageId_studentId_key" ON "CoursePackageSharedStudent"("packageId", "studentId");

-- CreateIndex
CREATE INDEX "CoursePackageSharedStudent_studentId_idx" ON "CoursePackageSharedStudent"("studentId");

-- AddForeignKey
ALTER TABLE "CoursePackageSharedStudent" ADD CONSTRAINT "CoursePackageSharedStudent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePackageSharedStudent" ADD CONSTRAINT "CoursePackageSharedStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

