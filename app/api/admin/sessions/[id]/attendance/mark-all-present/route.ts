import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AttendanceStatus, PackageStatus, PackageType, Prisma } from "@prisma/client";
import { isGroupPackNote } from "@/lib/package-mode";
import { coursePackageAccessibleByStudent } from "@/lib/package-sharing";
import { logAudit } from "@/lib/audit-log";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

const DEDUCTABLE_STATUS = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED,
]);

function durationMinutes(startAt: Date, endAt: Date) {
  return Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

async function pickHoursPackageId(
  tx: Prisma.TransactionClient,
  opts: { studentId: string; courseId: string; at: Date; needMinutes: number }
) {
  const { studentId, courseId, at, needMinutes } = opts;

  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      ...coursePackageAccessibleByStudent(studentId),
      courseId,
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      remainingMinutes: { gte: Math.max(1, needMinutes) },
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const picked = pkgMatches.find((p) => !isGroupPackNote(p.note));
  return picked?.id ?? null;
}

async function pickGroupPackPackageId(
  tx: Prisma.TransactionClient,
  opts: { studentId: string; courseId: string; at: Date; needCount: number }
) {
  const { studentId, courseId, at, needCount } = opts;
  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      ...coursePackageAccessibleByStudent(studentId),
      courseId,
      type: PackageType.HOURS,
      status: PackageStatus.ACTIVE,
      remainingMinutes: { gte: Math.max(1, needCount) },
      validFrom: { lte: at },
      OR: [{ validTo: null }, { validTo: { gte: at } }],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const picked = pkgMatches.find((p) => isGroupPackNote(p.note));
  return picked?.id ?? null;
}

type ExistingAttendance = {
  studentId: string;
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  packageId: string | null;
};

type DesiredAttendance = {
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  note: string | null;
  packageId: string | null;
  excusedCharge: boolean;
};

async function applyOneStudentAttendanceAndDeduct(
  tx: Prisma.TransactionClient,
  opts: {
    sessionId: string;
    courseId: string;
    at: Date;
    studentId: string;
    desired: DesiredAttendance;
    existing?: ExistingAttendance;
    isGroupClass: boolean;
  }
) {
  const { sessionId, courseId, at, studentId, desired, existing, isGroupClass } = opts;

  const prevDm = existing?.deductedMinutes ?? 0;
  const prevDc = existing?.deductedCount ?? 0;
  const nextDmRaw = desired.deductedMinutes;

  const excusedCharge = false;
  const canDeduct = DEDUCTABLE_STATUS.has(desired.status);
  const normalizedNextDm = canDeduct ? nextDmRaw : 0;
  const normalizedNextDc = canDeduct ? (isGroupClass ? 1 : Math.max(0, desired.deductedCount)) : 0;
  const delta = isGroupClass ? normalizedNextDc - prevDc : normalizedNextDm - prevDm;

  let packageId: string | null = desired.packageId ?? existing?.packageId ?? null;

  if (delta !== 0) {
    if (!packageId && delta > 0) {
      packageId = isGroupClass
        ? await pickGroupPackPackageId(tx, { studentId, courseId, at, needCount: delta })
        : await pickHoursPackageId(tx, { studentId, courseId, at, needMinutes: delta });
    }

    if (!packageId) {
      throw new Error(
        isGroupClass
          ? `Student ${studentId} has no active GROUP package for this course.`
          : `Student ${studentId} has no active HOURS package to deduct minutes.`
      );
    }

    const pkg = await tx.coursePackage.findFirst({
      where: {
        id: packageId,
        ...coursePackageAccessibleByStudent(studentId),
        courseId,
        status: PackageStatus.ACTIVE,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gte: at } }],
      },
      select: { id: true, type: true, status: true, remainingMinutes: true, note: true },
    });

    if (!pkg) throw new Error(`Package not found: ${packageId}`);
    if (pkg.type !== PackageType.HOURS) throw new Error(`Selected package is not HOURS: ${packageId}`);
    if (pkg.status !== PackageStatus.ACTIVE) throw new Error(`Package is not ACTIVE: ${packageId}`);
    if (pkg.remainingMinutes == null) throw new Error(`Package remainingMinutes is null (please set it): ${packageId}`);
    const groupPack = isGroupPackNote(pkg.note);
    if (isGroupClass && !groupPack) throw new Error(`Selected package is not GROUP package: ${packageId}`);
    if (!isGroupClass && groupPack) throw new Error(`Selected package is GROUP package and cannot be used for 1-on-1: ${packageId}`);

    if (delta > 0) {
      if (pkg.remainingMinutes < delta) {
        throw new Error(`Not enough balance. package=${packageId}, remaining=${pkg.remainingMinutes}, need=${delta}`);
      }

      await tx.coursePackage.update({
        where: { id: packageId },
        data: { remainingMinutes: { decrement: delta } },
      });

      await tx.packageTxn.create({
        data: {
          packageId,
          kind: "DEDUCT",
          deltaMinutes: -delta,
          sessionId,
          note: isGroupClass
            ? `Auto deduct by mark-all-present (group count). studentId=${studentId}`
            : `Auto deduct by mark-all-present (minutes). studentId=${studentId}`,
        },
      });
    }
  }

  const finalDeductedMinutes = isGroupClass ? 0 : normalizedNextDm;
  const finalDeductedCount = isGroupClass ? normalizedNextDc : desired.deductedCount;
  const finalPackageId = (isGroupClass ? finalDeductedCount > 0 : finalDeductedMinutes > 0) ? packageId : null;

  await tx.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    create: {
      sessionId,
      studentId,
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
    },
    update: {
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id: sessionId } = await ctx.params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      classId: true,
      startAt: true,
      endAt: true,
      studentId: true,
      class: { select: { courseId: true, capacity: true } },
    },
  });
  if (!session) return bad("Session not found", 404);

  const enrollments = await prisma.enrollment.findMany({
    where: { classId: session.classId },
    select: { studentId: true },
  });
  const studentIds =
    session.class.capacity === 1 && session.studentId ? [session.studentId] : enrollments.map((e) => e.studentId);

  const isGroupClass = session.class.capacity !== 1;
  const dm = isGroupClass ? 0 : durationMinutes(session.startAt, session.endAt);

  const existingList = await prisma.attendance.findMany({
    where: { sessionId, studentId: { in: studentIds } },
    select: { studentId: true, status: true, deductedMinutes: true, deductedCount: true, packageId: true },
  });
  const existingMap = new Map(existingList.map((a) => [a.studentId, a]));

  try {
    await prisma.$transaction(async (tx) => {
      for (const studentId of studentIds) {
        await applyOneStudentAttendanceAndDeduct(tx, {
          sessionId,
          courseId: session.class.courseId,
          at: session.startAt,
          studentId,
          desired: {
            status: AttendanceStatus.PRESENT,
            deductedCount: isGroupClass ? 1 : 0,
            deductedMinutes: dm,
            note: null,
            packageId: null,
            excusedCharge: false,
          },
          existing: existingMap.get(studentId),
          isGroupClass,
        });
      }
    });
  } catch (e: any) {
    return bad(e?.message ?? "Mark all failed", 409);
  }

  await logAudit({
    actor: admin,
    module: "ATTENDANCE",
    action: "ADMIN_MARK_ALL_PRESENT",
    entityType: "Session",
    entityId: sessionId,
    meta: {
      studentCount: studentIds.length,
      isGroupClass,
      deductedMinutesPerStudent: dm,
    },
  });

  return Response.json({ ok: true, updatedCount: studentIds.length });
}
