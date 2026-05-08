import { requireTeacher } from "@/lib/auth";
import { markTeacherNoticeRead } from "@/lib/teacher-notices";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const user = await requireTeacher();
  const body = await req.json().catch(() => ({}));
  const noticeId = String(body?.noticeId ?? "").trim();
  if (!noticeId) return Response.json({ ok: false, message: "Missing notice id" }, { status: 400 });

  await markTeacherNoticeRead(user.id, noticeId);
  revalidatePath("/teacher");
  revalidatePath("/teacher/notices");
  return Response.json({ ok: true });
}
