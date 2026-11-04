"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createLearningReportAttendanceSnapshot } from "@/lib/learning-report-attendance";
import { requireRenewalReportCoordinator } from "@/lib/renewal-progress-access";
import { RENEWAL_OPEN_STATUSES } from "@/lib/renewal-management";
import { currentParentEdition } from "@/lib/learning-report-parent-editions";

const path = "/admin/reports/renewal";

export async function assignRenewalProgressReport(form: FormData) {
  const user = await requireRenewalReportCoordinator();
  if (user.isObserver) throw Error("READ_ONLY");
  const renewalTaskId = String(form.get("renewalTaskId") || "");
  const teacherId = String(form.get("teacherId") || "");
  const [task, teacher] = await Promise.all([
    prisma.renewalTask.findUnique({ where: { id: renewalTaskId }, include: { package: true } }),
    prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true } }),
  ]);
  if (!task || !teacher || !RENEWAL_OPEN_STATUSES.includes(task.status as typeof RENEWAL_OPEN_STATUSES[number])) throw Error("INVALID_ASSIGNMENT");
  const report = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RenewalTask" WHERE "id"=${task.id} FOR UPDATE`;
    const current = await tx.renewalTask.findUniqueOrThrow({ where: { id: task.id }, include: { package: { include: { course: { select: { name: true } } } }, student: { select: { name: true } } } });
    if (!RENEWAL_OPEN_STATUSES.includes(current.status as typeof RENEWAL_OPEN_STATUSES[number])) throw Error("TASK_CLOSED");
    const existing = await tx.renewalProgressReport.findUnique({ where: { renewalTaskId } });
    if (existing) return existing;
    const now = new Date();
    const attendance = await createLearningReportAttendanceSnapshot({ packageId: current.packageId, studentId: current.studentId, teacherId, subjectId: null, throughAt: now }, tx);
    const created = await tx.renewalProgressReport.create({ data: {
      renewalTaskId, packageId: current.packageId, studentId: current.studentId,
      teacherId, assignedByUserId: user.id,
      snapshotJson: {
        studentName: current.student.name,
        teacherName: teacher.name,
        courseName: current.package.course.name,
        packageType: current.package.type,
        validTo: current.package.validTo?.toISOString() ?? null,
        totalMinutes: current.package.totalMinutes ?? 0,
        remainingMinutes: current.package.remainingMinutes ?? 0,
        attendedMinutes: attendance.attendedMinutes,
        sessionCount: attendance.sessionCount,
        firstSessionAt: attendance.firstSessionAt,
        lastSessionAt: attendance.lastSessionAt,
        capturedAt: now.toISOString(),
      },
    } });
    await tx.auditLog.create({ data: { actorEmail: user.email, module: "LEARNING_REPORT", action: "ASSIGN_RENEWAL_PROGRESS", entityType: "RENEWAL", entityId: created.id, meta: { renewalTaskId, teacherId, snapshot: created.snapshotJson } } });
    return created;
  }, { timeout: 15000 });
  revalidatePath(path);
  redirect(`${path}?report=${report.id}`);
}

export async function approveRenewalProgressReport(form: FormData) {
  const user = await requireRenewalReportCoordinator();
  if (user.isObserver) throw Error("READ_ONLY");
  const id = String(form.get("reportId") || "");
  const { edition } = await currentParentEdition("RENEWAL", id);
  if (!edition || edition.status !== "READY" || !edition.reviewedAt || !edition.pdfBilingual) throw Error("REVIEW_BILINGUAL_PDF_FIRST");
  await prisma.$transaction(async tx => {
    const updated = await tx.renewalProgressReport.updateMany({ where: { id, status: "SUBMITTED" }, data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: user.id } });
    if (!updated.count) throw Error("REPORT_NOT_SUBMITTED");
    await tx.auditLog.create({ data: { actorEmail: user.email, module: "LEARNING_REPORT", action: "APPROVE_RENEWAL_PROGRESS", entityType: "RENEWAL", entityId: id, meta: { editionId: edition.id } } });
  });
  revalidatePath(path);
  redirect(`${path}?report=${id}`);
}

export async function returnRenewalProgressReport(form: FormData) {
  const user = await requireRenewalReportCoordinator();
  if (user.isObserver) throw Error("READ_ONLY");
  const id = String(form.get("reportId") || "");
  const reason = String(form.get("reason") || "").trim();
  if (reason.length < 5 || reason.length > 1000) throw Error("REASON_REQUIRED");
  await prisma.$transaction(async tx => {
    const updated = await tx.renewalProgressReport.updateMany({ where: { id, status: "SUBMITTED" }, data: { status: "ASSIGNED", submittedAt: null, reviewNote: reason } });
    if (!updated.count) throw Error("REPORT_NOT_SUBMITTED");
    await tx.auditLog.create({ data: { actorEmail: user.email, module: "LEARNING_REPORT", action: "RETURN_RENEWAL_PROGRESS", entityType: "RENEWAL", entityId: id, meta: { reason } } });
  });
  revalidatePath(path);
  redirect(`${path}?report=${id}`);
}

export async function deliverRenewalProgressReport(form: FormData) {
  const user = await requireRenewalReportCoordinator();
  if (user.isObserver) throw Error("READ_ONLY");
  const id = String(form.get("reportId") || "");
  const channel = String(form.get("channel") || "").toUpperCase();
  if (!["WECHAT", "EMAIL", "WHATSAPP", "PRINTED", "OTHER"].includes(channel)) throw Error("INVALID_CHANNEL");
  const { edition } = await currentParentEdition("RENEWAL", id);
  if (!edition?.reviewedAt || !edition.pdfBilingual) throw Error("REVIEW_BILINGUAL_PDF_FIRST");
  await prisma.$transaction(async tx => {
    const updated = await tx.renewalProgressReport.updateMany({ where: { id, status: "APPROVED" }, data: { status: "DELIVERED", deliveredAt: new Date(), deliveredByUserId: user.id, deliveryChannel: channel } });
    if (!updated.count) throw Error("REPORT_NOT_APPROVED");
    await tx.auditLog.create({ data: { actorEmail: user.email, module: "LEARNING_REPORT", action: "DELIVER_RENEWAL_PROGRESS", entityType: "RENEWAL", entityId: id, meta: { channel, editionId: edition.id } } });
  });
  revalidatePath(path);
  redirect(`${path}?report=${id}`);
}
