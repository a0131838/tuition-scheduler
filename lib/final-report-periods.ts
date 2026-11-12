import type { Prisma } from "@prisma/client";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { createLearningReportAttendanceSnapshot, mergeLearningReportAttendanceSnapshot } from "@/lib/learning-report-attendance";
import { prisma } from "@/lib/prisma";

const purchaseWhere = { kind: "PURCHASE", deltaMinutes: { gt: 0 } } satisfies Prisma.PackageTxnWhereInput;
const purchaseSelect = {
  id: true, createdAt: true, deltaMinutes: true,
  correctionSources: { select: { deltaUnits: true, unit: true } },
} satisfies Prisma.PackageTxnSelect;
const eligibleStudent = (studentId: string): Prisma.CoursePackageWhereInput => ({
  OR: [{ studentId }, { sharedStudents: { some: { studentId } } }],
});

export function creditedMinutes(purchase: Prisma.PackageTxnGetPayload<{ select: typeof purchaseSelect }>) {
  return purchase.correctionSources.reduce(
    (total, correction) => total + (correction.unit === "MINUTES" ? correction.deltaUnits : 0),
    purchase.deltaMinutes,
  );
}

export function parseFinalReportPeriodTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value + ":00+08:00");
  return Number.isFinite(+date) && formatBusinessDateTime(date).replace(" ", "T") === value ? date : null;
}

export function finalReportPeriodLabel(startsAt: Date, endsAt: Date) {
  const first = formatBusinessDateOnly(startsAt);
  const last = formatBusinessDateOnly(new Date(+endsAt - 1));
  return first === last ? first : `${first} – ${last}`;
}

export function finalReportPeriodsUrl(studentId?: string, packageId?: string) {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  if (packageId) params.set("packageId", packageId);
  return "/admin/reports/final/periods" + (params.size ? `?${params}` : "");
}

export function loadFinalReportPeriodPackages(studentId: string) {
  return prisma.coursePackage.findMany({
    where: { type: "HOURS", ...eligibleStudent(studentId) },
    select: {
      id: true, course: { select: { name: true } },
      txns: { where: purchaseWhere, select: purchaseSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      finalReportPeriods: { where: { studentId }, orderBy: { startsAt: "asc" } },
      finalReports: {
        where: { studentId }, orderBy: { assignedAt: "desc" },
        select: { id: true, teacherId: true, reportPeriodId: true, reportPeriodLabel: true, status: true, archivedAt: true, teacher: { select: { name: true } } },
      },
    },
    orderBy: [{ validFrom: "desc" }, { id: "asc" }],
  });
}

export async function assignClosedFinalReportPeriod(input: {
  studentId: string; packageId: string; purchaseTxnId: string; teacherId: string; draftId: string;
  startsAt: Date; endsAt: Date;
  actor: { id: string; email: string; name?: string | null; role: string };
}) {
  const { studentId, packageId, purchaseTxnId, teacherId, draftId, startsAt, endsAt, actor } = input;
  const now = new Date();
  if (!(startsAt < endsAt && endsAt <= now)) throw new Error("dates");

  return prisma.$transaction(async (tx) => {
    // Serialize confirmations for the same package, including confirmations of different credit batches.
    await tx.$queryRaw`SELECT id FROM "CoursePackage" WHERE id = ${packageId} FOR NO KEY UPDATE`;
    const pkg = await tx.coursePackage.findFirst({
      where: { id: packageId, type: "HOURS", ...eligibleStudent(studentId) },
      select: { courseId: true },
    });
    if (!pkg) throw new Error("package");

    const sourceKey = { packageId, studentId, purchaseTxnId };
    let period = await tx.finalReportPeriod.findUnique({ where: { packageId_studentId_purchaseTxnId: sourceKey } });
    if (period && (+period.startsAt !== +startsAt || +period.endsAt !== +endsAt)) throw new Error("confirmed");
    const existing = period && await tx.finalReport.findUnique({
      where: { reportPeriodId_teacherId: { reportPeriodId: period.id, teacherId } },
      select: { id: true },
    });
    if (existing) {
      if (draftId && draftId !== existing.id) throw new Error("duplicate");
      return existing.id;
    }

    const teacher = await tx.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
    if (!teacher) throw new Error("teacher");

    if (!period) {
      const purchase = await tx.packageTxn.findFirst({
        where: { ...purchaseWhere, id: purchaseTxnId, packageId }, select: purchaseSelect,
      });
      if (!purchase || creditedMinutes(purchase) <= 0) throw new Error("purchase");
      const overlap = await tx.finalReportPeriod.findFirst({
        where: { packageId, studentId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
        select: { id: true },
      });
      if (overlap) throw new Error("overlap");
    }

    const draft = draftId ? await tx.finalReport.findFirst({
      where: { id: draftId, packageId, studentId, teacherId, courseId: pkg.courseId, status: "ASSIGNED",
        archivedAt: null, submittedAt: null, deliveredAt: null, reportPeriodId: null },
      select: { id: true, subjectId: true, reportJson: true, updatedAt: true },
    }) : null;
    if (draftId && !draft) throw new Error("draft");
    if (!draft) {
      const legacyDraft = await tx.finalReport.findFirst({
        where: { packageId, studentId, teacherId, courseId: pkg.courseId, status: "ASSIGNED", archivedAt: null,
          submittedAt: null, deliveredAt: null, reportPeriodId: null },
        select: { id: true },
      });
      if (legacyDraft) throw new Error("choose-draft");
    }

    const crossing = await tx.attendance.findFirst({
      where: { packageId, studentId, status: { in: ["PRESENT", "LATE"] }, OR: [
        { session: { startAt: { lt: startsAt }, endAt: { gt: startsAt } } },
        { session: { startAt: { lt: endsAt }, endAt: { gt: endsAt } } },
      ] },
      select: { id: true },
    });
    if (crossing) throw new Error("crossing");

    const snapshot = await createLearningReportAttendanceSnapshot({
      packageId, studentId, teacherId, subjectId: draft?.subjectId ?? null, fromAt: startsAt, throughAt: endsAt,
    }, tx);
    if (!snapshot.sessionCount) throw new Error("no-attendance");

    period ??= await tx.finalReportPeriod.create({ data: { ...sourceKey, startsAt, endsAt, confirmedAt: now, confirmedByUserId: actor.id } });
    const reportJson = mergeLearningReportAttendanceSnapshot(
      draft?.reportJson && typeof draft.reportJson === "object" && !Array.isArray(draft.reportJson) ? draft.reportJson : {},
      draft?.reportJson, snapshot,
    ) as Prisma.InputJsonValue;
    const data = { reportPeriodId: period.id, reportPeriodLabel: finalReportPeriodLabel(startsAt, endsAt), reportJson };

    let reportId: string;
    if (draft) {
      const updated = await tx.finalReport.updateMany({
        where: { id: draft.id, updatedAt: draft.updatedAt, status: "ASSIGNED", archivedAt: null, reportPeriodId: null },
        data,
      });
      if (updated.count !== 1) throw new Error("stale");
      reportId = draft.id;
    } else {
      const report = await tx.finalReport.create({
        data: { ...data, packageId, studentId, teacherId, courseId: pkg.courseId, assignedByUserId: actor.id },
        select: { id: true },
      });
      reportId = report.id;
    }
    await tx.auditLog.create({ data: {
      module: "LEARNING_REPORT_DELIVERY", action: "ASSIGN_CLOSED_FINAL_PERIOD", entityType: "FinalReport", entityId: reportId,
      actorEmail: actor.email, actorName: actor.name, actorRole: actor.role,
      meta: { periodId: period.id, purchaseTxnId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reusedDraft: Boolean(draft) },
    } });
    return reportId;
  });
}
