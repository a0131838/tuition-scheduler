import type { Prisma } from "@prisma/client";
import { createLearningReportAttendanceSnapshot } from "./learning-report-attendance";
import { prisma } from "./prisma";
import { parseFinalReportDraft } from "./final-report";
import { RENEWAL_OPEN_STATUSES } from "./renewal-management";
import { finalDraftToRenewalProgress } from "./renewal-progress-report";

type Assignment = {
  renewalTaskId: string;
  teacher: { id: string; name: string };
  actor: { id: string; email: string };
  source?: { id: string; packageId: string; studentId: string; subjectId: string | null; reportJson: Prisma.JsonValue };
};

export async function assignRenewalProgressInTransaction(tx: Prisma.TransactionClient, input: Assignment) {
  const { renewalTaskId, teacher, actor, source } = input;
  await tx.$queryRaw`SELECT "id" FROM "RenewalTask" WHERE "id"=${renewalTaskId} FOR UPDATE`;
  const task = await tx.renewalTask.findUnique({
    where: { id: renewalTaskId },
    include: { package: { include: { course: { select: { name: true } } } }, student: { select: { name: true } } },
  });
  if (!task || !RENEWAL_OPEN_STATUSES.includes(task.status as typeof RENEWAL_OPEN_STATUSES[number])) {
    throw Error("TASK_CLOSED");
  }
  if (source && (task.packageId !== source.packageId || task.studentId !== source.studentId)) {
    throw Error("TASK_MISMATCH");
  }
  const existing = await tx.renewalProgressReport.findUnique({ where: { renewalTaskId } });
  if (existing) {
    if (source && (existing.teacherId !== teacher.id || existing.archivedAt)) {
      throw Error("PROGRESS_ALREADY_ASSIGNED");
    }
    return existing;
  }
  const now = new Date();
  const attendance = await createLearningReportAttendanceSnapshot({
    packageId: task.packageId, studentId: task.studentId, teacherId: teacher.id,
    subjectId: source?.subjectId ?? null, throughAt: now,
  }, tx);
  const created = await tx.renewalProgressReport.create({ data: {
    renewalTaskId, packageId: task.packageId, studentId: task.studentId,
    teacherId: teacher.id, assignedByUserId: actor.id,
    snapshotJson: {
      studentName: task.student.name, teacherName: teacher.name, courseName: task.package.course.name,
      packageType: task.package.type, validTo: task.package.validTo?.toISOString() ?? null,
      totalMinutes: task.package.totalMinutes ?? 0, remainingMinutes: task.package.remainingMinutes ?? 0,
      attendedMinutes: attendance.attendedMinutes, sessionCount: attendance.sessionCount,
      firstSessionAt: attendance.firstSessionAt, lastSessionAt: attendance.lastSessionAt,
      capturedAt: now.toISOString(),
      ...(source ? { sourceFinalReportId: source.id } : {}),
    },
    ...(source ? { reportJson: finalDraftToRenewalProgress(source.reportJson) } : {}),
  } });
  await tx.auditLog.create({ data: {
    actorEmail: actor.email, module: "LEARNING_REPORT", entityType: "RENEWAL", entityId: created.id,
    action: source ? "COPY_FINAL_DRAFT_TO_RENEWAL_PROGRESS" : "ASSIGN_RENEWAL_PROGRESS",
    meta: { renewalTaskId, teacherId: teacher.id, snapshot: created.snapshotJson },
  } });
  return created;
}

export async function createRenewalProgressFromFinalDraft(
  reportId: string,
  teacher: Assignment["teacher"],
  actor: Assignment["actor"],
) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "FinalReport" WHERE "id"=${reportId} FOR UPDATE`;
    const source = await tx.finalReport.findFirst({
      where: { id: reportId, teacherId: teacher.id, status: "ASSIGNED", archivedAt: null },
      select: { id: true, studentId: true, packageId: true, subjectId: true, reportJson: true, package: { select: { remainingMinutes: true } } },
    });
    if (!source || Number(source.package.remainingMinutes ?? 0) <= 0) throw Error("SOURCE_UNAVAILABLE");
    if (!parseFinalReportDraft(source.reportJson).finalSummary) throw Error("SAVE_FINAL_DRAFT_FIRST");
    const tasks = await tx.renewalTask.findMany({
      where: { packageId: source.packageId, studentId: source.studentId, status: { in: [...RENEWAL_OPEN_STATUSES] } },
      select: { id: true }, take: 2,
    });
    if (tasks.length !== 1) throw Error("RENEWAL_TASK_REQUIRED");
    return assignRenewalProgressInTransaction(tx, { renewalTaskId: tasks[0].id, source, teacher, actor });
  }, { timeout: 15000 });
}
