-- CreateTable
CREATE TABLE "CoursePackageSharedCourse" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePackageSharedCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoursePackageSharedCourse_packageId_courseId_key" ON "CoursePackageSharedCourse"("packageId", "courseId");

-- CreateIndex
CREATE INDEX "CoursePackageSharedCourse_courseId_idx" ON "CoursePackageSharedCourse"("courseId");

-- AddForeignKey
ALTER TABLE "CoursePackageSharedCourse" ADD CONSTRAINT "CoursePackageSharedCourse_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoursePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePackageSharedCourse" ADD CONSTRAINT "CoursePackageSharedCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;