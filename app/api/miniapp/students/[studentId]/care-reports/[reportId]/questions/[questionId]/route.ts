import { closeParentCareQuestion } from "@/lib/care-operations";
import { logParentPortalAudit } from "@/lib/parent-portal";
import { bad, ok, requireMiniappStudentAccess } from "../../../../../../_lib";

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string; questionId: string }> }) {
  const { studentId, reportId, questionId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  try {
    await closeParentCareQuestion({ parentId: auth.parent.id, studentId, questionId });
    await logParentPortalAudit({ parentId: auth.parent.id, studentId, action: "CLOSE_CARE_REPORT_QUESTION", targetType: "CareParentQuestion", targetId: questionId, meta: { reportId } });
    return ok({ closed: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Close failed", 400);
  }
}
