import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { createLearningReportAttendanceSnapshot, mergeLearningReportAttendanceSnapshot, parseLearningReportAttendanceSnapshot } from "../../lib/learning-report-attendance";
import { learningReportMeta, queueFinalReportForReview } from "../../lib/learning-report-delivery";

// Explicit report IDs and preflight content hashes only. The default is a read-only preview.
async function main() {
  const [mode, ...targets] = process.argv.slice(2);
  if (!["--check", "--apply"].includes(mode) || !targets.length || targets.some(t => !/^[a-f0-9-]{36}:[a-f0-9]{18}$/.test(t))) {
    throw new Error("Expected --check or --apply and reportId:contentHash arguments.");
  }
  await prisma.$transaction(async tx => {
    if (mode === "--check") await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    for (const target of targets) {
      const [id, expected] = target.split(":");
      const row = await tx.finalReport.findUniqueOrThrow({ where: { id }, include: { package: { select: { remainingMinutes: true } } } });
      if (learningReportMeta(row.reportJson).draftQueuedAt) { console.log(id, "already queued"); continue; }
      const digest = createHash("sha256").update(JSON.stringify(row.reportJson)).digest("hex").slice(0, 18);
      if (digest !== expected || row.status !== "ASSIGNED" || row.submittedAt || row.deliveredAt || row.archivedAt || row.reportPeriodId ||
          !row.reportJson || typeof row.reportJson !== "object" || Array.isArray(row.reportJson) ||
          typeof row.reportJson.finalSummary !== "string" || row.reportJson.finalSummary.trim().length < 10 || Number(row.package.remainingMinutes) <= 0) {
        throw new Error("Changed or ineligible draft " + id);
      }
      const attendance = parseLearningReportAttendanceSnapshot(row.reportJson) ?? await createLearningReportAttendanceSnapshot({
        packageId: row.packageId, studentId: row.studentId, teacherId: row.teacherId, subjectId: row.subjectId, throughAt: row.assignedAt,
      }, tx);
      console.log(id, mode, "attended sessions through assignment:", attendance.sessionCount);
      if (mode === "--check") continue;
      const draft = queueFinalReportForReview(mergeLearningReportAttendanceSnapshot(row.reportJson, row.reportJson, attendance));
      const queuedAt = new Date().toISOString();
      await tx.finalReport.update({ where: { id, updatedAt: row.updatedAt, status: "ASSIGNED" }, data: {
        status: "SUBMITTED", reportJson: { ...draft, _meta: { ...draft._meta, draftQueuedAt: queuedAt } },
      } });
      await tx.auditLog.create({ data: { module: "LEARNING_REPORT_DELIVERY", action: "QUEUE_EXISTING_DRAFT_FOR_REVIEW", entityType: "FinalReport", entityId: id,
        actorEmail: "system@sgtmanage.local", actorName: "Report recovery", actorRole: "SYSTEM", meta: { priorContentHash: digest, queuedAt } } });
    }
  }, { isolationLevel: "RepeatableRead", timeout: 30000 });
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
