import { closeParentCareQuestion } from "@/lib/care-operations";
import { bad, ok, requireMiniappStudentAccess } from "../../../../../../_lib";

export async function POST(req: Request, { params }: { params: Promise<{ studentId: string; reportId: string; questionId: string }> }) {
  const { studentId, reportId, questionId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewReports");
  if (!auth.ok) return auth.response;
  try {
    await closeParentCareQuestion({ parentId: auth.parent.id, studentId, reportId, questionId });
    return ok({ closed: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Close failed", 400);
  }
}
