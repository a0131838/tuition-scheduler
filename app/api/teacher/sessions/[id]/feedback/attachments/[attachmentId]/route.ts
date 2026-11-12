import { requireTeacherProfile } from "@/lib/auth";
import { deleteLessonHomework, homeworkFileErrorResponse, readLessonHomework } from "@/lib/lesson-homework-files";

type Context = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(req: Request, { params }: Context) {
  const { user } = await requireTeacherProfile();
  const { id, attachmentId } = await params;
  try { return await readLessonHomework(req, id, attachmentId, user); }
  catch (error) { return homeworkFileErrorResponse(error); }
}

export async function DELETE(_req: Request, { params }: Context) {
  const { user } = await requireTeacherProfile();
  const { id, attachmentId } = await params;
  try { return await deleteLessonHomework(id, attachmentId, user); }
  catch (error) { return homeworkFileErrorResponse(error); }
}
