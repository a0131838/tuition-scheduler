import { PackageStatus, PackageType, Prisma } from "@prisma/client";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";

type PackageQueryClient = Pick<Prisma.TransactionClient, "coursePackage">;

export async function hasSchedulablePackage(
  db: PackageQueryClient,
  opts: {
    studentId: string;
    courseId: string;
    at: Date;
    requiredHoursMinutes: number;
  }
) {
  const { studentId, courseId, at, requiredHoursMinutes } = opts;
  const needMinutes = Math.max(1, Math.floor(requiredHoursMinutes));

  const monthly = await db.coursePackage.findFirst({
    where: {
      ...coursePackageAccessibleByStudent(studentId),
      AND: [coursePackageMatchesCourse(courseId)],
      type: PackageType.MONTHLY,
      status: PackageStatus.ACTIVE,
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    select: { id: true },
  });
  if (monthly) return true;

  const hours = await db.coursePackage.findFirst({
    where: {
      ...coursePackageAccessibleByStudent(studentId),
      AND: [coursePackageMatchesCourse(courseId)],
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      remainingMinutes: { gte: needMinutes },
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    select: { id: true },
  });
  return Boolean(hours);
}

