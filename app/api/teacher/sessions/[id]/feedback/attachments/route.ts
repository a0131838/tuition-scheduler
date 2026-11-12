import { requireTeacherProfile } from "@/lib/auth";
import { homeworkFileErrorResponse, uploadLessonHomework } from "@/lib/lesson-homework-files";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireTeacherProfile();
  const { id } = await params;
  try { return await uploadLessonHomework(req, id, user, "/api/teacher/sessions/" + encodeURIComponent(id) + "/feedback/attachments"); }
  catch (error) { return homeworkFileErrorResponse(error); }
}
