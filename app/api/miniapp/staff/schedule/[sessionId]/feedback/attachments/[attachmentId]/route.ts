import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { deleteLessonHomework, homeworkFileErrorResponse, readLessonHomework } from "@/lib/lesson-homework-files";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";

type Context = { params: Promise<{ sessionId: string; attachmentId: string }> };

export async function GET(req: Request, { params }: Context) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId, attachmentId } = await params;
  try { return await readLessonHomework(req, sessionId, attachmentId, auth.user, canManageMiniappSchedulingCoordination(auth.user)); }
  catch (error) { return homeworkFileErrorResponse(error); }
}

export async function DELETE(req: Request, { params }: Context) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId, attachmentId } = await params;
  try { return await deleteLessonHomework(sessionId, attachmentId, auth.user); }
  catch (error) { return homeworkFileErrorResponse(error); }
}
