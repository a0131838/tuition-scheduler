import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AttendanceStatus, PackageStatus, PackageType, Prisma } from "@prisma/client";
import { packageModeFromNote, type PackageMode } from "@/lib/package-mode";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { logAudit } from "@/lib/audit-log";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

const DEDUCTABLE_STATUS = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.ABSENT,
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
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { remainingMinutes: { gte: Math.max(1, needMinutes) } },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const picked = pkgMatches.find((p) => packageModeFromNote(p.note) === "HOURS_MINUTES");
  return picked?.id ?? null;
}

async function pickGroupPackPackage(
  tx: Prisma.TransactionClient,
  opts: { studentId: string; courseId: string; at: Date; needMinutes: number; needCount: number }
) {
  const { studentId, courseId, at, needMinutes, needCount } = opts;

  const minuteMatches = await tx.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { remainingMinutes: { gte: Math.max(1, needMinutes) } },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const minutesPicked = minuteMatches.find((p) => packageModeFromNote(p.note) === "GROUP_MINUTES");
  if (minutesPicked) return { id: minutesPicked.id, mode: "GROUP_MINUTES" as const };

  const countMatches = await tx.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { remainingMinutes: { gte: Math.max(1, needCount) } },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const countPicked = countMatches.find((p) => packageModeFromNote(p.note) === "GROUP_COUNT");
  return countPicked ? { id: countPicked.id, mode: "GROUP_COUNT" as const } : null;
}

async function loadAttendancePackage(
  tx: Prisma.TransactionClient,
  opts: { packageId: string; studentId: string; courseId: string; at: Date }
) {
  const { packageId, studentId, courseId, at } = opts;
  const pkg = await tx.coursePackage.findFirst({
    where: {
      id: packageId,
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { status: PackageStatus.ACTIVE },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    select: { id: true, type: true, status: true, remainingMinutes: true, note: true },
  });

  if (!pkg) throw new Error(`Package not found: ${packageId}`);
  if (pkg.type !== PackageType.HOURS) throw new Error(`Selected package is not HOURS: ${packageId}`);
  if (pkg.status !== PackageStatus.ACTIVE) throw new Error(`Package is not ACTIVE: ${packageId}`);
  if (pkg.remainingMinutes == null) throw new Error(`Package remainingMinutes is null (please set it): ${packageId}`);

  const remainingMinutes = pkg.remainingMinutes;
  return { ...pkg, remainingMinutes, mode: packageModeFromNote(pkg.note) };
}

function assertPackageModeMatchesClass(mode: PackageMode, isGroupClass: boolean, packageId: string) {
  if (isGroupClass && mode === "HOURS_MINUTES") {
    throw new Error(`Selected package is not GROUP package: ${packageId}`);
  }
  if (!isGroupClass && mode !== "HOURS_MINUTES") {
    throw new Error(`Selected package is GROUP package and cannot be used for 1-on-1: ${packageId}`);
  }
}

function resolveDeductionByMode(
  mode: PackageMode,
  desired: DesiredAttendance,
  sessionDurationMinutes: number
) {
  if (mode === "GROUP_COUNT") {
    return {
      deductedMinutes: 0,
      deductedCount: Math.max(1, Number(desired.deductedCount ?? 0) || 0),
    };
  }

  const fallbackMinutes = mode === "GROUP_MINUTES" ? sessionDurationMinutes : 0;
  const deductedMinutes = Math.max(0, Number(desired.deductedMinutes ?? 0) || 0) || fallbackMinutes;
  if (deductedMinutes <= 0) {
    throw new Error("Deducted minutes must be > 0 for deductible attendance unless waived.");
  }

  return {
    deductedMinutes,
    deductedCount: 0,
  };
}

function unitsForMode(mode: PackageMode, deductedMinutes: number, deductedCount: number) {
  return mode === "GROUP_COUNT" ? deductedCount : deductedMinutes;
}

function ledgerModeLabel(mode: PackageMode) {
  if (mode === "GROUP_COUNT") return "group count";
  if (mode === "GROUP_MINUTES") return "group minutes";
  return "minutes";
}

function canRowDeduct(status: AttendanceStatus, excusedCharge: boolean, waiveDeduction: boolean) {
  if (waiveDeduction) return false;
  if (status === AttendanceStatus.EXCUSED) return excusedCharge;
  return DEDUCTABLE_STATUS.has(status);
}

function parseStudentIdFromTxnNote(note: string | null | undefined) {
  if (!note) return null;
  const match = note.match(/studentId=([0-9a-fA-F-]{20,})/);
  return match?.[1] ?? null;
}

async function assertTouchedStudentsLedgerConsistency(
  tx: Prisma.TransactionClient,
  opts: { sessionId: string; studentIds: string[] }
) {
  const { sessionId, studentIds } = opts;
  if (studentIds.length === 0) return;
  const studentIdSet = new Set(studentIds);

  const rows = await tx.attendance.findMany({
    where: { sessionId, studentId: { in: studentIds } },
    select: {
      studentId: true,
      status: true,
      deductedMinutes: true,
      deductedCount: true,
      packageId: true,
      excusedCharge: true,
      waiveDeduction: true,
      package: { select: { note: true } },
    },
  });
  const rowMap = new Map(rows.map((r) => [r.studentId, r]));

  const txns = await tx.packageTxn.findMany({
    where: { sessionId },
    select: { deltaMinutes: true, note: true },
  });
  const actualNetByStudent = new Map<string, number>();
  for (const txn of txns) {
    const sid = parseStudentIdFromTxnNote(txn.note);
    if (!sid || !studentIdSet.has(sid)) continue;
    actualNetByStudent.set(sid, (actualNetByStudent.get(sid) ?? 0) + txn.deltaMinutes);
  }

  for (const sid of studentIds) {
    const row = rowMap.get(sid);
    let expectedNet = 0;
    if (row && row.packageId && canRowDeduct(row.status, Boolean(row.excusedCharge), Boolean(row.waiveDeduction))) {
      const mode = packageModeFromNote(row.package?.note);
      const units = unitsForMode(mode, Math.max(0, row.deductedMinutes ?? 0), Math.max(0, row.deductedCount ?? 0));
      expectedNet = units > 0 ? -units : 0;
    }
    const actualNet = actualNetByStudent.get(sid) ?? 0;
    if (actualNet !== expectedNet) {
      throw new Error(
        `Ledger mismatch after save. session=${sessionId}, student=${sid}, expectedNet=${expectedNet}, actualNet=${actualNet}`
      );
    }
  }
}

async function applyPackageChange(
  tx: Prisma.TransactionClient,
  opts: {
    packageId: string;
    remainingMinutes: number;
    amount: number;
    kind: "DEDUCT" | "ROLLBACK";
    sessionId: string;
    studentId: string;
    mode: PackageMode;
    reason: string;
  }
) {
  const { packageId, remainingMinutes, amount, kind, sessionId, studentId, mode, reason } = opts;
  if (amount <= 0) return;

  if (kind === "DEDUCT" && remainingMinutes < amount) {
    throw new Error(`Not enough balance. package=${packageId}, remaining=${remainingMinutes}, need=${amount}`);
  }

  await tx.coursePackage.update({
    where: { id: packageId },
    data: {
      remainingMinutes: kind === "DEDUCT" ? { decrement: amount } : { increment: amount },
    },
  });

  await tx.packageTxn.create({
    data: {
      packageId,
      kind,
      deltaMinutes: kind === "DEDUCT" ? -amount : amount,
      sessionId,
      note: `Auto ${kind === "DEDUCT" ? "deduct" : "rollback"} by ${reason} (${ledgerModeLabel(mode)}). studentId=${studentId}`,
    },
  });
}

type ExistingAttendance = {
  studentId: string;
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  packageId: string | null;
  excusedCharge?: boolean;
  waiveDeduction?: boolean;
  waiveReason?: string | null;
};

type DesiredAttendance = {
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  note: string | null;
  packageId: string | null;
  excusedCharge: boolean;
  waiveDeduction: boolean;
  waiveReason: string | null;
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
    sessionDurationMinutes: number;
  }
) {
  const { sessionId, courseId, at, studentId, desired, existing, isGroupClass, sessionDurationMinutes } = opts;

  const excusedCharge = desired.status === AttendanceStatus.EXCUSED ? desired.excusedCharge : false;
  const waiveDeduction = Boolean(desired.waiveDeduction);
  const canDeduct =
    !waiveDeduction && (desired.status === AttendanceStatus.EXCUSED ? excusedCharge : DEDUCTABLE_STATUS.has(desired.status));

  const previousCanDeduct =
    !!existing &&
    !Boolean(existing.waiveDeduction) &&
    (existing.status === AttendanceStatus.EXCUSED ? Boolean(existing.excusedCharge) : DEDUCTABLE_STATUS.has(existing.status));

  let previousPackage:
    | (Awaited<ReturnType<typeof loadAttendancePackage>> & { mode: PackageMode })
    | null = null;
  let previousUnits = 0;
  const hasLegacyUnboundDeduction = previousCanDeduct && !existing?.packageId;

  if (previousCanDeduct && existing?.packageId) {
    previousPackage = await loadAttendancePackage(tx, {
      packageId: existing.packageId,
      studentId,
      courseId,
      at,
    });
    assertPackageModeMatchesClass(previousPackage.mode, isGroupClass, previousPackage.id);
    previousUnits = unitsForMode(
      previousPackage.mode,
      Math.max(0, existing.deductedMinutes ?? 0),
      Math.max(0, existing.deductedCount ?? 0)
    );
  }

  let nextPackage:
    | (Awaited<ReturnType<typeof loadAttendancePackage>> & { mode: PackageMode })
    | null = null;
  let finalDeductedMinutes = 0;
  let finalDeductedCount = 0;

  if (canDeduct) {
    if (desired.packageId) {
      nextPackage = await loadAttendancePackage(tx, {
        packageId: desired.packageId,
        studentId,
        courseId,
        at,
      });
    } else if (previousPackage) {
      nextPackage = previousPackage;
    } else if (isGroupClass) {
      const picked = await pickGroupPackPackage(tx, {
        studentId,
        courseId,
        at,
        needMinutes: Math.max(1, Number(desired.deductedMinutes ?? 0) || sessionDurationMinutes),
        needCount: Math.max(1, Number(desired.deductedCount ?? 0) || 1),
      });
      if (picked) {
        nextPackage = await loadAttendancePackage(tx, {
          packageId: picked.id,
          studentId,
          courseId,
          at,
        });
      }
    } else {
      const pickedId = await pickHoursPackageId(tx, {
        studentId,
        courseId,
        at,
        needMinutes: Math.max(1, Number(desired.deductedMinutes ?? 0)),
      });
      if (pickedId) {
        nextPackage = await loadAttendancePackage(tx, {
          packageId: pickedId,
          studentId,
          courseId,
          at,
        });
      }
    }

    if (!nextPackage) {
      throw new Error(
        isGroupClass
          ? `Student ${studentId} has no active GROUP package for this course.`
          : `Student ${studentId} has no active HOURS package to deduct minutes.`
      );
    }

    assertPackageModeMatchesClass(nextPackage.mode, isGroupClass, nextPackage.id);
    const resolved = resolveDeductionByMode(nextPackage.mode, desired, sessionDurationMinutes);
    finalDeductedMinutes = resolved.deductedMinutes;
    finalDeductedCount = resolved.deductedCount;
  }

  const nextUnits = nextPackage ? unitsForMode(nextPackage.mode, finalDeductedMinutes, finalDeductedCount) : 0;
  const sameBinding =
    previousPackage != null &&
    nextPackage != null &&
    previousPackage.id === nextPackage.id &&
    previousPackage.mode === nextPackage.mode;
  const shouldReapply = !sameBinding || previousUnits !== nextUnits;

  if (previousPackage && previousUnits > 0 && shouldReapply) {
    await applyPackageChange(tx, {
      packageId: previousPackage.id,
      remainingMinutes: previousPackage.remainingMinutes,
      amount: previousUnits,
      kind: "ROLLBACK",
      sessionId,
      studentId,
      mode: previousPackage.mode,
      reason: "attendance change",
    });
  }

  if (nextPackage && nextUnits > 0 && shouldReapply) {
    const availableMinutes =
      sameBinding && previousPackage ? previousPackage.remainingMinutes + previousUnits : nextPackage.remainingMinutes;
    await applyPackageChange(tx, {
      packageId: nextPackage.id,
      remainingMinutes: availableMinutes,
      amount: nextUnits,
      kind: "DEDUCT",
      sessionId,
      studentId,
      mode: nextPackage.mode,
      reason: "attendance save",
    });
  }

  // Older attendance rows may have deductible status/count/minutes saved without a package binding.
  // In that case there is nothing we can roll back safely, so we treat this save as a fresh bind+d
  // educt against the currently selected/auto-picked package instead of hard failing.
  if (hasLegacyUnboundDeduction && !nextPackage && canDeduct) {
    throw new Error("Student has deductible attendance but no package could be bound for this save.");
  }

  const finalPackageId = canDeduct && nextUnits > 0 ? nextPackage?.id ?? null : null;
  if (canDeduct && nextUnits > 0 && !finalPackageId) {
    throw new Error("Package binding is required for deductible attendance unless waived.");
  }

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
      waiveDeduction: waiveDeduction && !canDeduct,
      waiveReason: waiveDeduction && !canDeduct ? desired.waiveReason : null,
    },
    update: {
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
      waiveDeduction: waiveDeduction && !canDeduct,
      waiveReason: waiveDeduction && !canDeduct ? desired.waiveReason : null,
    },
  });

  return {
    studentId,
    status: desired.status,
    packageId: finalPackageId,
    deductedMinutes: finalDeductedMinutes,
    deductedCount: finalDeductedCount,
    finalUnits: nextUnits,
  };
}

function parseStatus(raw: any): AttendanceStatus {
  const v = String(raw ?? "UNMARKED");
  return (Object.values(AttendanceStatus) as string[]).includes(v) ? (v as AttendanceStatus) : AttendanceStatus.UNMARKED;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
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
      waiveDeduction: true,
      waiveReason: true,
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
    const waiveDeduction = Boolean(it?.waiveDeduction);
    const waiveReason = waiveDeduction ? String(it?.waiveReason ?? "").trim() || null : null;

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
      waiveDeduction,
      waiveReason,
    });
  }

  const sessionDurationMinutes = durationMinutes(session.startAt, session.endAt);
  let totalDeducted = 0;
  const touchedStudentIds = new Set<string>();
  const receipt: Array<{
    studentId: string;
    status: AttendanceStatus;
    packageId: string | null;
    deductedMinutes: number;
    deductedCount: number;
  }> = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const studentId of expectedStudentIds) {
        const desired = desiredMap.get(studentId);
        if (!desired) continue;
        const existing = existingMap.get(studentId);
        touchedStudentIds.add(studentId);
        const result = await applyOneStudentAttendanceAndDeduct(tx, {
          sessionId,
          courseId: session.class.courseId,
          at: session.startAt,
          studentId,
          desired,
          existing,
          isGroupClass,
          sessionDurationMinutes,
        });
        totalDeducted += result.finalUnits;
        receipt.push({
          studentId: result.studentId,
          status: result.status,
          packageId: result.packageId,
          deductedMinutes: result.deductedMinutes,
          deductedCount: result.deductedCount,
        });
      }
      await assertTouchedStudentsLedgerConsistency(tx, {
        sessionId,
        studentIds: Array.from(touchedStudentIds),
      });
    });
  } catch (e: any) {
    return bad(e?.message ?? "Save failed", 409);
  }

  await logAudit({
    actor: admin,
    module: "ATTENDANCE",
    action: "ADMIN_SAVE",
    entityType: "Session",
    entityId: sessionId,
    meta: {
      expectedStudentCount: expectedStudentIds.length,
      submittedItemCount: items.length,
      updatedStudentCount: desiredMap.size,
      totalDeducted,
    },
  });

  return Response.json({ ok: true, totalDeducted, receipt });
}
