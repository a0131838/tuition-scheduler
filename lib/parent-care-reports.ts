import { Prisma } from "@prisma/client";
import { careReportParentAccessAllowed } from "@/lib/care-reports";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";

export const parentCareReportInclude = {
  engagement: { include: { universityProfile: true } },
  student: { select: { name: true, school: true, grade: true } },
  preparedBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
} satisfies Prisma.CareReportInclude;

export async function getParentCareReport(reportId: string, studentId: string) {
  const report = await prisma.careReport.findFirst({
    where: { id: reportId, studentId },
    include: parentCareReportInclude,
  });
  return report && careReportParentAccessAllowed(report) ? report : null;
}

export function parentCareReportListItem(report: {
  id: string;
  reportType: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  title: string;
  riskLevel: string;
  overallSummary: string;
  publishedAt: Date | null;
  approvedBy: { name: string } | null;
}) {
  return {
    id: report.id,
    reportType: report.reportType,
    periodLabel: report.periodLabel,
    periodStartText: formatBusinessDateOnly(report.periodStart),
    periodEndText: formatBusinessDateOnly(report.periodEnd),
    title: report.title,
    riskLevel: report.riskLevel,
    overallSummary: report.overallSummary,
    publishedAt: report.publishedAt?.toISOString() ?? null,
    publishedAtText: report.publishedAt ? formatBusinessDateTime(report.publishedAt) : null,
    approvedByName: report.approvedBy?.name ?? null,
  };
}

export type ParentCareReportScope = { parentId: string; studentId: string; reportId: string };
class ParentCareReportUnavailable extends Error {
  constructor() { super("Report unavailable or permission withdrawn / 报告不可用或查看权限已撤回"); }
}

/** Recheck the current report, parent link and consent within the consuming transaction. */
export async function requireParentCareReportAccess(tx: Prisma.TransactionClient, input: ParentCareReportScope) {
  const ref = await tx.careReport.findFirst({ where: { id: input.reportId, studentId: input.studentId }, select: { engagementId: true } });
  if (!ref) throw new ParentCareReportUnavailable();
  // Same engagement-first order as staff report publication/revocation.
  await tx.$queryRaw`SELECT id FROM "CareEngagement" WHERE id=${ref.engagementId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "CareReport" WHERE id=${input.reportId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "ParentAccount" WHERE id=${input.parentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "ParentStudentLink" WHERE "parentId"=${input.parentId} AND "studentId"=${input.studentId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "CareUniversityProfile" WHERE "engagementId"=${ref.engagementId} FOR SHARE`;
  const [parent, link, report] = await Promise.all([
    tx.parentAccount.findUnique({ where: { id: input.parentId }, select: { status: true } }),
    tx.parentStudentLink.findUnique({ where: { parentId_studentId: { parentId: input.parentId, studentId: input.studentId } }, select: { canViewReports: true } }),
    tx.careReport.findFirst({ where: { id: input.reportId, studentId: input.studentId }, include: parentCareReportInclude }),
  ]);
  if (parent?.status !== "ACTIVE" || !link?.canViewReports || !report || report.engagement.studentId !== input.studentId || !careReportParentAccessAllowed(report)) {
    throw new ParentCareReportUnavailable();
  }
  return report;
}

export async function parentCareTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)));
      if (!conflict) throw error;
      if (attempt >= 2) throw new Error("Report changed during this request. Please retry / 请求期间报告状态发生变化，请重试");
    }
  }
}

/** Records portal access/acknowledgement, not an external message delivery. */
export async function accessParentCareReport(input: ParentCareReportScope & { mode: "VIEW" | "PDF" | "ACK" }) {
  try {
    return await parentCareTransaction(async tx => {
      const report = await requireParentCareReportAccess(tx, input);
      const key = { reportId_parentId: { reportId: input.reportId, parentId: input.parentId } };
      const current = await tx.careReportView.findUnique({ where: key });
      // A duplicate acknowledgement retains its first timestamp and original audit.
      if (input.mode === "ACK" && current?.acknowledgedAt) return { report, view: current };
      const now = new Date();
      const view = await tx.careReportView.upsert({
        where: key,
        create: { reportId: input.reportId, parentId: input.parentId, firstViewedAt: now, lastViewedAt: now, viewCount: 1, acknowledgedAt: input.mode === "ACK" ? now : null },
        update: input.mode === "ACK" ? { lastViewedAt: now, acknowledgedAt: now } : { lastViewedAt: now, viewCount: { increment: 1 } },
      });
      await tx.parentPortalAudit.create({ data: {
        parentId: input.parentId, studentId: input.studentId,
        action: input.mode === "ACK" ? "ACKNOWLEDGE_CARE_REPORT" : "VIEW_CARE_REPORT",
        targetType: "CareReport", targetId: input.reportId, metaJson: { accessMode: input.mode },
      } });
      return { report, view };
    });
  } catch (error) {
    if (error instanceof ParentCareReportUnavailable) return null;
    throw error;
  }
}
