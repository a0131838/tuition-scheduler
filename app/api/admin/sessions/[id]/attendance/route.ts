import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AttendanceStatus, PackageStatus, PackageType, Prisma } from "@prisma/client";
import { isGroupPackNote } from "@/lib/package-mode";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

const DEDUCTABLE_STATUS = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED,
]);

async function pickHoursPackageId(
  tx: Prisma.TransactionClient,
  opts: { studentId: string; courseId: string; at: Date; needMinutes: number }
) {
  const { studentId, courseId, at, needMinutes } = opts;

  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      studentId,
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
      studentId,
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
  excusedCharge?: boolean;
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

  const excusedCharge = desired.status === AttendanceStatus.EXCUSED ? desired.excusedCharge : false;
  const canDeduct =
    desired.status === AttendanceStatus.EXCUSED ? excusedCharge : DEDUCTABLE_STATUS.has(desired.status);
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
        studentId,
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
            ? `Auto deduct by attendance save (group count). studentId=${studentId}`
            : `Auto deduct by attendance save (minutes). studentId=${studentId}`,
        },
      });
    } else {
      const refund = -delta;

      await tx.coursePackage.update({
        where: { id: packageId },
        data: { remainingMinutes: { increment: refund } },
      });

      await tx.packageTxn.create({
        data: {
          packageId,
          kind: "ROLLBACK",
          deltaMinutes: refund,
          sessionId,
          note: isGroupClass
            ? `Auto rollback by attendance change (group count). studentId=${studentId}`
            : `Auto rollback by attendance change (minutes). studentId=${studentId}`,
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

function parseStatus(raw: any): AttendanceStatus {
  const v = String(raw ?? "UNMARKED");
  return (Object.values(AttendanceStatus) as string[]).includes(v) ? (v as AttendanceStatus) : AttendanceStatus.UNMARKED;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: sessionId } = await ctx.params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const items = Array.isArray(body?.items) ? (body.items as any[]) : [];
  if (items.length === 0) return bad("No items", 409);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      classId: true,
      startAt: true,
      studentId: true,
      class: { select: { courseId: true, capacity: true } },
    },
  });
  if (!session) return bad("Session not found", 404);

  const enrollments = await prisma.enrollment.findMany({
    where: { classId: session.classId },
    select: { studentId: true },
  });
  const expectedStudentIds =
    session.class.capacity === 1 && session.studentId ? [session.studentId] : enrollments.map((e) => e.studentId);
  const expectedSet = new Set(expectedStudentIds);

  const existingList = await prisma.attendance.findMany({
    where: { sessionId, studentId: { in: expectedStudentIds } },
    select: {
      studentId: true,
      status: true,
      deductedMinutes: true,
      deductedCount: true,
      packageId: true,
      excusedCharge: true,
    },
  });
  const existingMap = new Map(existingList.map((a) => [a.studentId, a]));

  const excusedTotals = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      studentId: { in: expectedStudentIds },
      status: AttendanceStatus.EXCUSED,
      NOT: { sessionId },
    },
    _count: { _all: true },
  });
  const excusedCountMap = new Map<string, number>(excusedTotals.map((r) => [r.studentId, r._count._all]));

  const desiredMap = new Map<string, DesiredAttendance>();
  const isGroupClass = session.class.capacity !== 1;

  for (const it of items) {
    const studentId = String(it?.studentId ?? "");
    if (!studentId || !expectedSet.has(studentId)) continue;

    const status = parseStatus(it?.status);
    const deductedCount = Math.max(0, Number(it?.deductedCount ?? 0));
    const deductedMinutes = Math.max(0, Number(it?.deductedMinutes ?? 0));
    const note = String(it?.note ?? "").trim() || null;
    const packageId = String(it?.packageId ?? "").trim() || null;
    const excusedCharge = Boolean(it?.excusedCharge);

    const prevExcused = excusedCountMap.get(studentId) ?? 0;
    const nextExcusedCount = prevExcused + (status === AttendanceStatus.EXCUSED ? 1 : 0);
    const excusedEligible = nextExcusedCount >= 4;
    const finalExcusedCharge = status === AttendanceStatus.EXCUSED && excusedEligible ? excusedCharge : false;

    desiredMap.set(studentId, {
      status,
      deductedCount: finalExcusedCharge ? deductedCount : 0,
      deductedMinutes,
      note,
      packageId,
      excusedCharge: finalExcusedCharge,
    });
  }

  let totalDeducted = 0;
  for (const studentId of expectedStudentIds) {
    const desired = desiredMap.get(studentId);
    if (!desired) continue;
    const existing = existingMap.get(studentId);
    const canDeduct = desired.status === AttendanceStatus.EXCUSED ? desired.excusedCharge : DEDUCTABLE_STATUS.has(desired.status);
    const prevUnits = isGroupClass ? existing?.deductedCount ?? 0 : existing?.deductedMinutes ?? 0;
    const nextUnits = canDeduct ? (isGroupClass ? 1 : desired.deductedMinutes) : 0;
    const delta = nextUnits - prevUnits;
    if (delta > 0) totalDeducted += delta;
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const studentId of expectedStudentIds) {
        const desired = desiredMap.get(studentId);
        if (!desired) continue;
        const existing = existingMap.get(studentId);
        await applyOneStudentAttendanceAndDeduct(tx, {
          sessionId,
          courseId: session.class.courseId,
          at: session.startAt,
          studentId,
          desired,
          existing,
          isGroupClass,
        });
      }
    });
  } catch (e: any) {
    return bad(e?.message ?? "Save failed", 409);
  }

  return Response.json({ ok: true, totalDeducted });
}

