import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { accessParentCareReport } from "@/lib/parent-care-reports";
import { bad, ok, requireMiniappStudentAccess } from "../../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string }> }) {
  const { studentId, reportId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  const access = await accessParentCareReport({ parentId: auth.parent.id, studentId, reportId, mode: "VIEW" });
  if (!access) return bad("Report not found / 未找到报告", 404);
  const { report, view } = access;
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
  const access = await accessParentCareReport({ parentId: auth.parent.id, studentId, reportId, mode: "ACK" });
  if (!access) return bad("Report not found / 未找到报告", 404);
  return ok({ acknowledgedAt: access.view.acknowledgedAt!.toISOString() });
}
