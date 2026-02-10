import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = String(body?.name ?? "").trim();
  if (!name) return bad("Name is required", 409);

  const created = await prisma.course.create({
    data: { name },
    include: { subjects: { include: { levels: true } } },
  });

  return Response.json({ ok: true, course: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const id = String(body?.id ?? "");
  if (!id) return bad("Missing id", 409);

  const count = await prisma.class.count({ where: { courseId: id } });
  if (count > 0) return bad("Course has classes", 409);
  const subjectCount = await prisma.subject.count({ where: { courseId: id } });
  if (subjectCount > 0) return bad("Course has subjects", 409);

  await prisma.course.delete({ where: { id } });
  return Response.json({ ok: true });
}

