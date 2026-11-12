import { requireCommunicationCenterUser } from "@/lib/communication-access";
import { homeworkFileErrorResponse, readLessonHomework } from "@/lib/lesson-homework-files";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const user = await requireCommunicationCenterUser();
  const { id, attachmentId } = await params;
  const task = await prisma.parentCommunicationTask.findFirst({
    where: { id, kind: "FEEDBACK", feedbackId: { not: null } },
    select: { sessionId: true, feedbackId: true },
  });
  if (!task?.sessionId || !await prisma.sessionFeedbackAttachment.findFirst({
    where: { id: attachmentId, feedbackId: task.feedbackId! }, select: { id: true },
  })) return new Response("Not Found", { status: 404 });
  try { return await readLessonHomework(req, task.sessionId, attachmentId, user, true); }
  catch (error) { return homeworkFileErrorResponse(error); }
}
