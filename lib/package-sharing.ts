import { Prisma } from "@prisma/client";

export function coursePackageAccessibleByStudent(studentId: string): Prisma.CoursePackageWhereInput {
  return {
    OR: [{ studentId }, { sharedStudents: { some: { studentId } } }],
  };
}

export function coursePackageMatchesCourse(courseId: string): Prisma.CoursePackageWhereInput {
  return {
    OR: [{ courseId }, { sharedCourses: { some: { courseId } } }],
  };
}

export function coursePackageAccessibleByStudentAndCourse(
  studentId: string,
  courseId: string
): Prisma.CoursePackageWhereInput {
  return {
    AND: [coursePackageAccessibleByStudent(studentId), coursePackageMatchesCourse(courseId)],
  };
}
