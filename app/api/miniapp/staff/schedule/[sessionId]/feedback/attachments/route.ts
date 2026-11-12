import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { feedbackAttachmentDto } from "@/lib/feedback-attachments";
import { homeworkFileErrorResponse, uploadLessonHomework } from "@/lib/lesson-homework-files";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ sessionId: string }> };
const base = (id: string) => "/api/miniapp/staff/schedule/" + encodeURIComponent(id) + "/feedback/attachments";

export async function GET(req: Request, { params }: Context) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId } = await params;
  const feedbacks = await prisma.sessionFeedback.findMany({
    where: { sessionId, ...(canManageMiniappSchedulingCoordination(auth.user) ? {} : { teacherId: auth.user.teacherId || "" }) },
    select: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  if (!feedbacks.length) return bad("Feedback not found or no permission", 404);
  return ok({
    attachments: feedbacks.flatMap((feedback) => feedback.attachments.map((row) =>
      feedbackAttachmentDto(row, base(sessionId) + "/" + encodeURIComponent(row.id), true))),
  });
}

export async function POST(req: Request, { params }: Context) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId } = await params;
  try { return await uploadLessonHomework(req, sessionId, auth.user, base(sessionId)); }
  catch (error) { return homeworkFileErrorResponse(error); }
}
