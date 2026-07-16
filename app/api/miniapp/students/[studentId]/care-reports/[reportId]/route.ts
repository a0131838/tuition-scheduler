import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { logParentPortalAudit } from "@/lib/parent-portal";
import { getParentCareReport, recordParentCareReportView } from "@/lib/parent-care-reports";
import { prisma } from "@/lib/prisma";
import { bad, ok, requireMiniappStudentAccess } from "../../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string }> }) {
  const { studentId, reportId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  const report = await getParentCareReport(reportId, studentId);
  if (!report) return bad("Report not found", 404);

  const view = await recordParentCareReportView(report.id, auth.parent.id);
  await logParentPortalAudit({
    parentId: auth.parent.id,
    studentId,
    action: "VIEW_CARE_REPORT",
    targetType: "CareReport",
    targetId: report.id,
  });
  return ok({
    report: {
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      periodLabel: report.periodLabel,
      periodStartText: formatBusinessDateOnly(report.periodStart),
      periodEndText: formatBusinessDateOnly(report.periodEnd),
      riskLevel: report.riskLevel,
      overallSummary: report.overallSummary,
      academicSummary: report.academicSummary,
      schoolSummary: report.schoolSummary,
      lifeSummary: report.lifeSummary,
      riskSummary: report.riskSummary,
      actionsCompleted: report.actionsCompleted,
      evidenceSummary: report.evidenceSummary,
      nextPlan: report.nextPlan,
      studentActions: report.studentActions,
      parentActions: report.parentActions,
      preparedByName: report.preparedBy.name,
      approvedByName: report.approvedBy?.name ?? null,
      publishedAtText: report.publishedAt ? formatBusinessDateTime(report.publishedAt) : null,
      student: report.student,
      acknowledged: Boolean(view.acknowledgedAt),
      acknowledgedAtText: view.acknowledgedAt ? formatBusinessDateTime(view.acknowledgedAt) : null,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string }> }) {
  const { studentId, reportId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  const report = await getParentCareReport(reportId, studentId);
  if (!report) return bad("Report not found", 404);

  const now = new Date();
  const view = await prisma.careReportView.upsert({
    where: { reportId_parentId: { reportId, parentId: auth.parent.id } },
    create: { reportId, parentId: auth.parent.id, firstViewedAt: now, lastViewedAt: now, viewCount: 1, acknowledgedAt: now },
    update: { lastViewedAt: now, acknowledgedAt: now },
  });
  await logParentPortalAudit({
    parentId: auth.parent.id,
    studentId,
    action: "ACKNOWLEDGE_CARE_REPORT",
    targetType: "CareReport",
    targetId: report.id,
  });
  return ok({ acknowledgedAt: view.acknowledgedAt?.toISOString() ?? now.toISOString() });
}
