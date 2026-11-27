import type { Prisma } from "@prisma/client";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import {
  createLearningReportAttendanceSnapshot,
  mergeLearningReportAttendanceSnapshot,
  parseLearningReportAttendanceSnapshot,
} from "@/lib/learning-report-attendance";
import {
  purchaseMinutes,
  inferPeriodWindow,
  loadPeriodEvidence,
  savedPeriodWindow,
} from "./final-report-period-window";
import { queueFinalReportForReview } from "./learning-report-delivery";

import { prisma } from "@/lib/prisma";

const purchaseWhere = { kind: "PURCHASE", deltaMinutes: { gt: 0 } } satisfies Prisma.PackageTxnWhereInput;
const purchaseSelect = {
  id: true,
  createdAt: true,
  deltaMinutes: true,
  correctionSources: { select: { deltaUnits: true, unit: true } },
} satisfies Prisma.PackageTxnSelect;
const eligibleStudent = (studentId: string): Prisma.CoursePackageWhereInput => ({
  OR: [{ studentId }, { sharedStudents: { some: { studentId } } }],
});

export const creditedMinutes = purchaseMinutes;

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
      id: true,
      course: { select: { name: true } },
      txns: { where: purchaseWhere, select: purchaseSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      finalReportPeriods: { where: { studentId }, orderBy: { startsAt: "asc" } },
      finalReports: {
        where: { studentId },
        orderBy: { assignedAt: "desc" },
        select: {
          id: true,
          teacherId: true,
          reportPeriodId: true,
          reportPeriodLabel: true,
          status: true,
          archivedAt: true,
          teacher: { select: { name: true } },
        },
      },
    },
    orderBy: [{ validFrom: "desc" }, { id: "asc" }],
  });
}

type Actor = { id: string; email: string; name?: string | null; role: string };
type PeriodKey = { packageId: string; studentId: string; purchaseTxnId: string };

export async function isPeriodBoundaryReviewer(actorId: string, db: Prisma.TransactionClient = prisma) {
  const users = await db.user.findMany({
    where: { role: "ADMIN", isObserver: false, name: { equals: "Eva", mode: "insensitive" } },
    select: { id: true },
    take: 2,
  });
  return users.length === 1 && users[0].id === actorId;
}

async function lockPackage(tx: Prisma.TransactionClient, packageId: string) {
  await tx.$queryRaw`SELECT id FROM "CoursePackage" WHERE id = ${packageId} FOR NO KEY UPDATE`;
}

export async function assignPeriodReport(key: PeriodKey, teacherId: string, draftId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    await lockPackage(tx, key.packageId);
    const pkg = await tx.coursePackage.findFirst({
      where: { id: key.packageId, type: "HOURS", ...eligibleStudent(key.studentId) },
      select: { courseId: true },
    });
    if (!pkg) throw Error("package");
    let period = await tx.finalReportPeriod.findUnique({ where: { packageId_studentId_purchaseTxnId: key } });
    const existing =
      period &&
      (await tx.finalReport.findUnique({
        where: { reportPeriodId_teacherId: { reportPeriodId: period.id, teacherId } },
      }));
    if (existing) {
      if (draftId && draftId !== existing.id) throw Error("duplicate");
      return existing.id;
    }
    const purchase = await tx.packageTxn.findFirst({
      where: { id: key.purchaseTxnId, packageId: key.packageId, ...purchaseWhere },
      select: purchaseSelect,
    });
    if ((!purchase || creditedMinutes(purchase) <= 0) && !period?.confirmedAt) throw Error("purchase");
    if (!(await tx.teacher.findUnique({ where: { id: teacherId }, select: { id: true } })))
      throw Error("teacher");
    period ??= await tx.finalReportPeriod.create({ data: key });
    const label =
      period.startsAt && period.endsAt
        ? finalReportPeriodLabel(period.startsAt, period.endsAt)
        : `Renewal / 续费 · ${purchase ? formatBusinessDateOnly(purchase.createdAt) : ""} · ${key.purchaseTxnId.slice(0, 8)}`;
    let reportId: string;
    if (draftId) {
      const draft = await tx.finalReport.findFirst({
        where: {
          id: draftId,
          studentId: key.studentId,
          packageId: key.packageId,
          courseId: pkg.courseId,
          teacherId,
          reportPeriodId: null,
          archivedAt: null,
          deliveredAt: null,
          status: "ASSIGNED",
          submittedAt: null,
        },
      });
      if (!draft) throw Error("draft");
      const updated = await tx.finalReport.updateMany({
        where: { id: draftId, updatedAt: draft.updatedAt },
        data: { reportPeriodId: period.id, reportPeriodLabel: label },
      });
      if (!updated.count) throw Error("stale");
      reportId = draft.id;
    } else {
      const report = await tx.finalReport.create({
        data: {
          packageId: key.packageId,
          studentId: key.studentId,
          courseId: pkg.courseId,
          teacherId,
          reportPeriodId: period.id,
          reportPeriodLabel: label,
          assignedByUserId: actor.id,
        },
      });
      reportId = report.id;
    }
    await tx.auditLog.create({
      data: {
        module: "LEARNING_REPORT_DELIVERY",
        action: "ASSIGN_PERIOD_REPORT",
        entityType: "FinalReport",
        entityId: reportId,
        actorEmail: actor.email,
        actorName: actor.name,
        actorRole: actor.role,
        meta: { periodId: period.id, purchaseTxnId: key.purchaseTxnId, reusedDraft: Boolean(draftId) },
      },
    });
    return reportId;
  });
}

export async function confirmAmbiguousPeriod(
  key: PeriodKey,
  firstLesson: string,
  lastLesson: string,
  actor: Actor,
) {
  return prisma.$transaction(async (tx) => {
    await lockPackage(tx, key.packageId);
    if (!(await isPeriodBoundaryReviewer(actor.id, tx))) throw Error("forbidden");
    const period = await tx.finalReportPeriod.findUniqueOrThrow({
      where: { packageId_studentId_purchaseTxnId: key },
    });
    const pkg = await loadPeriodEvidence(key.packageId, tx);
    const lessons = pkg.attendances.filter(
      (a) => a.studentId === key.studentId && ["PRESENT", "LATE"].includes(a.status),
    );
    const start = lessons.find((a) => a.sessionId === firstLesson)?.session.startAt;
    const end = lessons.find((a) => a.sessionId === lastLesson)?.session.endAt;
    if (!start || !end) throw Error("no-attendance");
    if (!pkg.txns.some((t) => t.id === key.purchaseTxnId && t.kind === "PURCHASE" && purchaseMinutes(t) > 0))
      throw Error("purchase");
    if (period.confirmedAt) {
      if (+start === period.startsAt?.getTime() && +end === period.endsAt?.getTime()) return;
      throw Error("confirmed");
    }
    if (inferPeriodWindow(pkg, key.studentId, key.purchaseTxnId).state !== "ambiguous") throw Error("stale");
    if (!(start < end && end <= new Date())) throw Error("dates");
    if (
      lessons.some(
        ({ session: s }) => (s.startAt < start && start < s.endAt) || (s.startAt < end && end < s.endAt),
      )
    )
      throw Error("crossing");
    for (const other of pkg.finalReportPeriods.filter((p) => p.studentId === key.studentId)) {
      const frozen = other.reports.map((r) => savedPeriodWindow(r.reportJson));
      if (other.purchaseTxnId === key.purchaseTxnId) {
        if (frozen.some((w) => w && (w.start < start || w.end > end))) throw Error("overlap");
      } else if (
        (other.startsAt && other.endsAt && other.startsAt < end && other.endsAt > start) ||
        frozen.some((w) => w && w.start < end && w.end > start)
      )
        throw Error("overlap");
    }
    await tx.finalReportPeriod.update({
      where: { id: period.id },
      data: { startsAt: start, endsAt: end, confirmedAt: new Date(), confirmedByUserId: actor.id },
    });
    await tx.auditLog.create({
      data: {
        module: "LEARNING_REPORT_DELIVERY",
        action: "CONFIRM_PERIOD_BOUNDARY",
        entityType: "FinalReportPeriod",
        entityId: period.id,
        actorEmail: actor.email,
        actorName: actor.name,
        actorRole: actor.role,
        meta: { start: start.toISOString(), end: end.toISOString() },
      },
    });
  });
}

// Re-read the range at submission and freeze it together with the teacher's original.
// The shared lock serializes Eva's confirmation and concurrent reports on the same package.
export async function submitAssignedPeriodReport(input: {
  id: string;
  teacherId: string;
  packageId: string;
  updatedAt: Date;
  draft: Record<string, unknown>;
  fields: Pick<Prisma.FinalReportUpdateManyMutationInput, "recommendation" | "overallScore" | "finalLevel">;
}) {
  return prisma.$transaction(async (tx) => {
    await lockPackage(tx, input.packageId);
    const r = await tx.finalReport.findFirst({
      where: {
        id: input.id,
        teacherId: input.teacherId,
        packageId: input.packageId,
        updatedAt: input.updatedAt,
        status: "ASSIGNED",
        archivedAt: null,
      },
      include: { reportPeriod: true },
    });
    if (!r?.reportPeriod) throw Error("stale");
    const period = r.reportPeriod;
    const window = inferPeriodWindow(
      await loadPeriodEvidence(r.packageId, tx),
      r.studentId,
      period.purchaseTxnId,
    );
    if (window.state !== "ready") throw Error(window.state);
    const previous = parseLearningReportAttendanceSnapshot(r.reportJson);
    const reuseConfirmed =
      !!period.confirmedAt &&
      previous?.throughAt === window.end.toISOString() &&
      previous.teacherId === r.teacherId &&
      previous.firstSessionAt &&
      new Date(previous.firstSessionAt) >= window.start;
    const snapshot = reuseConfirmed
      ? previous
      : await createLearningReportAttendanceSnapshot(
          {
            packageId: r.packageId,
            studentId: r.studentId,
            teacherId: r.teacherId,
            subjectId: r.subjectId,
            fromAt: window.start,
            throughAt: window.end,
          },
          tx,
        );
    if (!snapshot.sessionCount) throw Error("no-attendance");
    const content = queueFinalReportForReview(
      mergeLearningReportAttendanceSnapshot(input.draft, r.reportJson, snapshot),
    );
    const updated = await tx.finalReport.updateMany({
      where: { id: r.id, updatedAt: r.updatedAt },
      data: {
        ...input.fields,
        status: "SUBMITTED",
        submittedAt: new Date(),
        reportPeriodLabel: finalReportPeriodLabel(window.start, window.end),
        reportJson: {
          ...content,
          _meta: {
            ...content._meta,
            periodWindow: { start: window.start.toISOString(), end: window.end.toISOString() },
          },
        },
      },
    });
    if (!updated.count) throw Error("stale");
  });
}

export async function pendingPeriodBoundaryChecks() {
  const pending = await prisma.finalReportPeriod.findMany({
    where: { confirmedAt: null, reports: { some: { status: "ASSIGNED", archivedAt: null } } },
    select: {
      studentId: true,
      packageId: true,
      purchaseTxnId: true,
      student: { select: { name: true } },
      package: { select: { course: { select: { name: true } } } },
    },
  });
  const packages = new Map<string, Awaited<ReturnType<typeof loadPeriodEvidence>>>();
  const result = [];
  for (const row of pending) {
    const pkg = packages.get(row.packageId) ?? (await loadPeriodEvidence(row.packageId));
    packages.set(row.packageId, pkg);
    if (inferPeriodWindow(pkg, row.studentId, row.purchaseTxnId).state === "ambiguous") result.push(row);
  }
  return result;
}
