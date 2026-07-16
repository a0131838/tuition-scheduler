import { careReportParentAccessAllowed } from "@/lib/care-reports";
import { parentCareReportListItem } from "@/lib/parent-care-reports";
import { prisma } from "@/lib/prisma";
import { ok, requireMiniappStudentAccess } from "../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;

  const reports = await prisma.careReport.findMany({
    where: { studentId, status: "PUBLISHED" },
    include: {
      engagement: { include: { universityProfile: true } },
      approvedBy: { select: { name: true } },
      views: { where: { parentId: auth.parent.id }, select: { acknowledgedAt: true } },
    },
    orderBy: [{ periodEnd: "desc" }, { publishedAt: "desc" }],
    take: 60,
  });

  return ok({
    items: reports.filter(careReportParentAccessAllowed).map((report) => ({
      ...parentCareReportListItem(report),
      acknowledged: Boolean(report.views[0]?.acknowledgedAt),
    })),
  });
}
