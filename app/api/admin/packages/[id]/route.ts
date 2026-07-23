import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { composePackageNote, GROUP_PACK_MINUTES_TAG, GROUP_PACK_TAG, packageModeFromNote } from "@/lib/package-mode";
import { parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import {
  buildPackageFinanceGateReason,
  getLatestPackageInvoiceApproval,
  shouldRequirePackageInvoiceGate,
} from "@/lib/package-finance-gate";
import { logAudit } from "@/lib/audit-log";
import {
  packageCourseAccessAfterTransition,
  previewPackageCourseTransition,
  transitionPackageCourse,
  type PackageCourseTransitionResult,
} from "@/lib/package-course-transition";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseSettlementMode(v: unknown) {
  const x = String(v ?? "");
  if (x === "ONLINE_PACKAGE_END" || x === "OFFLINE_MONTHLY") return x;
  return null;
}

type PackageModeKey = "HOURS_MINUTES" | "GROUP_MINUTES" | "GROUP_COUNT" | "MONTHLY";

function modeKeyFromSaved(type: string, note: string | null): PackageModeKey {
  if (type === "MONTHLY") return "MONTHLY";
  return packageModeFromNote(note);
}

function sameModeWhere(mode: PackageModeKey) {
  if (mode === "MONTHLY") return { type: "MONTHLY" as const };
  if (mode === "GROUP_MINUTES") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_MINUTES_TAG } };
  }
  if (mode === "GROUP_COUNT") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_TAG } };
  }
  return {
    type: "HOURS" as const,
    OR: [
      { note: null },
      {
        AND: [
          { NOT: { note: { startsWith: GROUP_PACK_TAG } } },
          { NOT: { note: { startsWith: GROUP_PACK_MINUTES_TAG } } },
        ],
      },
    ],
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing id", 409);

  const searchParams = new URL(req.url).searchParams;
  const previewCourseId = searchParams.get("previewCourseId")?.trim();
  const sourceCourseId = searchParams.get("sourceCourseId")?.trim();
  const transitionStudentId = searchParams.get("transitionStudentId")?.trim();
  if (!previewCourseId) return bad("Missing previewCourseId", 409);

  try {
    const preview = await previewPackageCourseTransition(prisma, {
      packageId: id,
      sourceCourseId,
      targetCourseId: previewCourseId,
      studentIds: transitionStudentId ? [transitionStudentId] : undefined,
    });
    return Response.json({ ok: true, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    if (message === "PACKAGE_NOT_FOUND") return bad("Package not found", 404);
    if (message === "SOURCE_COURSE_NOT_FOUND") return bad("Source course not found", 404);
    if (message === "SOURCE_COURSE_NOT_ALLOWED") return bad("Source course is not allowed by this package", 409);
    if (message === "STUDENT_SCOPE_NOT_ALLOWED") return bad("Student is not linked to this package", 409);
    if (message === "TARGET_COURSE_NOT_FOUND") return bad("Target course not found", 404);
    return bad(message, 500);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing id", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const status = String(body?.status ?? "");
  const settlementMode = parseSettlementMode(body?.settlementMode);
  const remainingMinutesRaw = body?.remainingMinutes;
  const validFromStr = String(body?.validFrom ?? "");
  const validToStr = String(body?.validTo ?? "");
  const noteRaw = String(body?.note ?? "");
  const paid = !!body?.paid;
  const paidAtStr = String(body?.paidAt ?? "");
  const paidAmountRaw = body?.paidAmount;
  const paidNote = String(body?.paidNote ?? "");
  const requestedCourseId = String(body?.courseId ?? "").trim();
  const requestedSourceCourseId = String(body?.sourceCourseId ?? "").trim();
  const requestedTransitionStudentId = String(body?.transitionStudentId ?? "").trim();
  const courseChangeReason = String(body?.courseChangeReason ?? "").trim();
  const sharedStudentIdsRaw: string[] = Array.isArray(body?.sharedStudentIds)
    ? (body.sharedStudentIds as any[]).map((v) => String(v)).filter(Boolean)
    : [];
  const sharedCourseIdsRaw: string[] = Array.isArray(body?.sharedCourseIds)
    ? (body.sharedCourseIds as any[]).map((v) => String(v)).filter(Boolean)
    : [];

  if (!validFromStr) return bad("Missing validFrom", 409);
  if (remainingMinutesRaw !== "" && remainingMinutesRaw != null) {
    return bad("Remaining balance cannot be edited. Delete and recreate the package if needed.", 409);
  }

  const pkg = await prisma.coursePackage.findUnique({
    where: { id },
    select: {
      note: true,
      type: true,
      studentId: true,
      courseId: true,
      sharedStudents: { select: { studentId: true } },
      sharedCourses: { select: { courseId: true } },
      financeGateStatus: true,
    },
  });
  if (!pkg) return bad("Package not found", 404);
  const sourceCourseId = requestedSourceCourseId || pkg.courseId;
  const targetCourseId = requestedCourseId || pkg.courseId;
  const courseChanged = targetCourseId !== sourceCourseId;
  const packageStudentIds = Array.from(
    new Set([pkg.studentId, ...pkg.sharedStudents.map((row) => row.studentId)])
  );
  const hasSharedStudents = pkg.sharedStudents.length > 0;
  const transitionStudentId = requestedTransitionStudentId || pkg.studentId;
  if (courseChanged && hasSharedStudents && !requestedTransitionStudentId) {
    return bad("Select which shared-package student should change course", 409);
  }
  if (courseChanged && !packageStudentIds.includes(transitionStudentId)) {
    return bad("Selected student is not linked to this package", 409);
  }
  const allowedSourceCourseIds = new Set([
    pkg.courseId,
    ...pkg.sharedCourses.map((row) => row.courseId),
  ]);
  if (courseChanged && !allowedSourceCourseIds.has(sourceCourseId)) {
    return bad("Source course is not allowed by this package", 409);
  }
  if (courseChanged && !courseChangeReason) {
    return bad("Course change reason is required", 409);
  }
  if (courseChangeReason.length > 500) {
    return bad("Course change reason must be 500 characters or fewer", 409);
  }

  const targetCourse = await prisma.course.findUnique({
    where: { id: targetCourseId },
    select: { id: true, name: true },
  });
  if (!targetCourse) return bad("Target course not found", 404);

  const sharedStudentIds = Array.from(new Set(sharedStudentIdsRaw)).filter((sid) => sid !== pkg.studentId);
  if (
    courseChanged &&
    transitionStudentId !== pkg.studentId &&
    !sharedStudentIds.includes(transitionStudentId)
  ) {
    return bad("Keep the selected student linked to the shared package while changing course", 409);
  }
  const selectedSharedCourseIds = Array.from(new Set(sharedCourseIdsRaw));
  const courseAccess = courseChanged
    ? packageCourseAccessAfterTransition({
        primaryCourseId: pkg.courseId,
        selectedSharedCourseIds,
        sourceCourseId,
        targetCourseId,
        hasSharedStudents,
      })
    : {
        changePrimaryCourse: false,
        primaryCourseId: pkg.courseId,
        sharedCourseIds: selectedSharedCourseIds.filter((courseId) => courseId !== pkg.courseId),
      };
  const changePrimaryCourse = courseAccess.changePrimaryCourse;
  const resultingPrimaryCourseId = courseAccess.primaryCourseId;
  const sharedCourseIds = courseAccess.sharedCourseIds;

  const validFrom = parseBusinessDateStart(validFromStr);
  const validTo = validToStr ? parseBusinessDateEnd(validToStr) : null;
  if (!validFrom || (validToStr && !validTo)) return bad("Invalid validFrom/validTo", 409);

  const paidAt = paidAtStr ? new Date(paidAtStr) : paid ? new Date() : null;
  if (paidAtStr && (Number.isNaN(paidAt!.getTime()) || !paidAt)) return bad("Invalid paidAt", 409);

  let paidAmount: number | null = null;
  if (paidAmountRaw !== "" && paidAmountRaw != null) {
    const n = Number(paidAmountRaw);
    if (Number.isFinite(n)) paidAmount = n;
    else return bad("Invalid paidAmount", 409);
  }

  const note = composePackageNote(
    packageModeFromNote(pkg?.note ?? null),
    noteRaw
  );
  const updateMode = modeKeyFromSaved(pkg.type, note);
  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);

  if (sharedStudentIds.length > 0) {
    const rows = await prisma.student.findMany({
      where: { id: { in: sharedStudentIds } },
      select: { id: true },
    });
    if (rows.length !== sharedStudentIds.length) return bad("Invalid sharedStudentIds", 409);
  }

  if (sharedCourseIds.length > 0) {
    const rows = await prisma.course.findMany({
      where: { id: { in: sharedCourseIds } },
      select: { id: true },
    });
    if (rows.length !== sharedCourseIds.length) return bad("Invalid sharedCourseIds", 409);
  }

  if (status === "ACTIVE" && updateMode === "MONTHLY") {
    const overlap = await prisma.coursePackage.findFirst({
      where: {
        id: { not: id },
        studentId: pkg.studentId,
        courseId: resultingPrimaryCourseId,
        ...sameModeWhere(updateMode),
        status: "ACTIVE",
        validFrom: { lte: overlapCheckTo },
        OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
      },
      select: { id: true },
    });
    if (overlap) return bad("Overlapping ACTIVE package exists for same mode", 409);
  }

  const requiresInvoiceGate = shouldRequirePackageInvoiceGate({
    settlementMode: settlementMode as any,
  });
  const latestApproval = await getLatestPackageInvoiceApproval(id);
  const nextFinanceGateStatus = requiresInvoiceGate
    ? latestApproval?.status === "APPROVED"
      ? "SCHEDULABLE"
      : latestApproval?.status === "REJECTED"
      ? "BLOCKED"
      : latestApproval?.status === "PENDING_MANAGER"
      ? "INVOICE_PENDING_MANAGER"
      : pkg.financeGateStatus === "EXEMPT"
      ? "EXEMPT"
      : pkg.financeGateStatus
    : "EXEMPT";
  const nextFinanceGateReason = buildPackageFinanceGateReason({
    status: nextFinanceGateStatus,
    settlementMode: settlementMode as any,
    rejectReason: latestApproval?.managerRejectReason ?? null,
  });

  const editAt = new Date();
  let transitionResult: PackageCourseTransitionResult | null = null;

  try {
    transitionResult = await prisma.$transaction(
      async (tx) => {
        let completedTransition: PackageCourseTransitionResult | null = null;
        if (courseChanged) {
          completedTransition = await transitionPackageCourse(tx, {
            packageId: id,
            sourceCourseId,
            targetCourseId,
            studentIds: [transitionStudentId],
            now: editAt,
          });
        }

        await tx.coursePackage.update({
          where: { id },
          data: {
            courseId: resultingPrimaryCourseId,
            status: (status as any) || undefined,
            settlementMode: settlementMode as any,
            validFrom,
            validTo,
            paid,
            paidAt: paid ? paidAt : null,
            paidAmount: paid ? paidAmount : null,
            paidNote: paid ? paidNote || null : null,
            note: note || null,
            financeGateStatus: nextFinanceGateStatus as any,
            financeGateReason: nextFinanceGateReason,
            financeGateUpdatedAt: editAt,
            financeGateUpdatedBy: admin.email,
            sharedStudents: {
              deleteMany: {},
              ...(sharedStudentIds.length
                ? { createMany: { data: sharedStudentIds.map((studentId) => ({ studentId })) } }
                : {}),
            },
            sharedCourses: {
              deleteMany: {},
              ...(sharedCourseIds.length
                ? { createMany: { data: sharedCourseIds.map((courseId) => ({ courseId })) } }
                : {}),
            },
          },
        });

        // If this package still has a single purchase record, keep its financial basis aligned
        // with the edited paid amount so future month-end reports can use ledger-based history.
        if (pkg.type === "HOURS" && paid && paidAmount != null) {
          const purchaseTxns = await tx.packageTxn.findMany({
            where: { packageId: id, kind: "PURCHASE" },
            select: { id: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          });
          if (purchaseTxns.length === 1) {
            await tx.packageTxn.update({
              where: { id: purchaseTxns[0].id },
              data: { deltaAmount: paidAmount },
            });
          }
        }
        return completedTransition;
      },
      { timeout: 30_000 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Package update failed";
    if (message === "TARGET_SESSION_CONFLICT") {
      return bad(
        "A matching future session already exists under the target course. No changes were saved.",
        409
      );
    }
    if (message === "PACKAGE_NOT_FOUND") return bad("Package not found", 404);
    if (message === "SOURCE_COURSE_NOT_FOUND") return bad("Source course not found", 404);
    if (message === "SOURCE_COURSE_NOT_ALLOWED") return bad("Source course is not allowed by this package", 409);
    if (message === "STUDENT_SCOPE_NOT_ALLOWED") return bad("Student is not linked to this package", 409);
    if (message === "TARGET_COURSE_NOT_FOUND") return bad("Target course not found", 404);
    return bad(message, 500);
  }

  if (courseChanged && transitionResult) {
    await logAudit({
      actor: admin,
      module: "PACKAGE",
      action: hasSharedStudents ? "CHANGE_SHARED_STUDENT_COURSE" : "CHANGE_COURSE",
      entityType: "CoursePackage",
      entityId: id,
      meta: {
        oldCourseId: transitionResult.oldCourseId,
        oldCourseName: transitionResult.oldCourseName,
        targetCourseId,
        targetCourseName: targetCourse.name,
        transitionStudentId,
        packagePrimaryCourseChanged: changePrimaryCourse,
        reason: courseChangeReason,
        futureOneOnOneSessions: transitionResult.futureOneOnOneSessions,
        migratedSessionIds: transitionResult.migratedSessionIds,
        futureGroupSessions: transitionResult.futureGroupSessions,
        protectedSessions: transitionResult.protectedSessions,
        ambiguousSessions: transitionResult.ambiguousSessions,
        invalidatedReminderCount: transitionResult.invalidatedReminderCount,
      },
    });
    await Promise.all(
      transitionResult.migratedSessionIds.map((sessionId) =>
        logAudit({
          actor: admin,
          module: "SCHEDULING",
          action: "PACKAGE_COURSE_TRANSITION",
          entityType: "Session",
          entityId: sessionId,
          meta: {
            packageId: id,
            oldCourseId: transitionResult.oldCourseId,
            oldCourseName: transitionResult.oldCourseName,
            targetCourseId,
            targetCourseName: targetCourse.name,
            transitionStudentId,
            reason: courseChangeReason,
          },
        })
      )
    );
  }

  return Response.json({
    ok: true,
    transition: transitionResult
      ? {
          migratedSessionCount: transitionResult.migratedSessionIds.length,
          futureGroupSessions: transitionResult.futureGroupSessions,
          protectedSessions: transitionResult.protectedSessions,
          ambiguousSessions: transitionResult.ambiguousSessions,
          invalidatedReminderCount: transitionResult.invalidatedReminderCount,
        }
      : null,
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return bad("Missing id", 409);

  await prisma.packageTxn.deleteMany({ where: { packageId: id } });
  await prisma.attendance.updateMany({ where: { packageId: id }, data: { packageId: null } });
  await prisma.coursePackage.delete({ where: { id } });
  return Response.json({ ok: true });
}
