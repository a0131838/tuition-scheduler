import type { Prisma } from "@prisma/client";
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

export async function recordParentCareReportView(reportId: string, parentId: string) {
  const now = new Date();
  return prisma.careReportView.upsert({
    where: { reportId_parentId: { reportId, parentId } },
    create: { reportId, parentId, firstViewedAt: now, lastViewedAt: now, viewCount: 1 },
    update: { lastViewedAt: now, viewCount: { increment: 1 } },
  });
}
