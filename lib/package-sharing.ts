import { Prisma } from "@prisma/client";

export function coursePackageAccessibleByStudent(studentId: string): Prisma.CoursePackageWhereInput {
  return {
    OR: [{ studentId }, { sharedStudents: { some: { studentId } } }],
  };
}

