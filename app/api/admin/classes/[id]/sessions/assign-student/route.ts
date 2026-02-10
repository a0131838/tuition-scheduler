import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const sessionId = String(body?.sessionId ?? "");
  const studentId = String(body?.studentId ?? "");
  if (!sessionId || !studentId) return bad("Missing sessionId or studentId");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true, student: { select: { id: true, name: true } } },
  });
  if (!session || session.classId !== classId) return bad("Session not found", 404);
  if (session.class.capacity !== 1) return bad("Not a 1-on-1 class", 409);

  const enrolled = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { id: true },
  });
  if (!enrolled) return bad("Student not enrolled in this class", 409);

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { studentId },
    include: { student: { select: { id: true, name: true } } },
  });

  return Response.json({ ok: true, studentId: updated.studentId, studentName: updated.student?.name ?? null });
}

