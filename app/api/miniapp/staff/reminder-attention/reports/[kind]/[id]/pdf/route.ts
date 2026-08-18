import { bad } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { buildFinalReportPdfResponse } from "@/lib/final-report-pdf";
import { isLearningReportApprovedForDelivery, learningReportMeta } from "@/lib/learning-report-delivery";
import { buildMidtermReportPdfResponse } from "@/lib/midterm-report-pdf";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Reminder attention permission required", 403);

  const { kind: rawKind, id } = await params;
  const kind = rawKind.toUpperCase();
  if (kind === "MIDTERM") {
    const report = await prisma.midtermReport.findUnique({ where: { id }, select: { status: true, archivedAt: true, reportJson: true } });
    const meta = learningReportMeta(report?.reportJson);
    if (!report || report.status !== "SUBMITTED" || report.archivedAt || meta.lockedAfterForwarded || !isLearningReportApprovedForDelivery(report.reportJson)) {
      return bad("Only an approved, undelivered report can be opened", 409);
    }
    return buildMidtermReportPdfResponse(id);
  }

  if (kind === "FINAL") {
    const report = await prisma.finalReport.findUnique({ where: { id }, select: { status: true, archivedAt: true, deliveredAt: true, reportJson: true } });
    if (!report || report.status !== "SUBMITTED" || report.archivedAt || report.deliveredAt || !isLearningReportApprovedForDelivery(report.reportJson)) {
      return bad("Only an approved, undelivered report can be opened", 409);
    }
    return buildFinalReportPdfResponse(id, auth.user.language);
  }

  return bad("Unknown report type", 404);
}
