import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function PATCH(req: Request) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher) return bad("Teacher profile not linked", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const intro = String(body?.intro ?? "").trim();
  if (intro.length > 1200) return bad("Intro is too long (max 1200 chars)", 409);

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { intro: intro || null },
    select: { id: true },
  });

  return Response.json({ ok: true });
}

