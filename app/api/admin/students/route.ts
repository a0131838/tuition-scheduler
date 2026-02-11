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
  const school = String(body?.school ?? "").trim();
  const grade = String(body?.grade ?? "").trim();
  const targetSchool = String(body?.targetSchool ?? "").trim();
  const currentMajor = String(body?.currentMajor ?? "").trim();
  const coachingContent = String(body?.coachingContent ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const birthDateStr = String(body?.birthDate ?? "").trim();
  const sourceChannelId = String(body?.sourceChannelId ?? "").trim() || null;
  const studentTypeId = String(body?.studentTypeId ?? "").trim() || null;

  if (!name) return bad("Name is required", 409);

  let birthDate: Date | null = null;
  if (birthDateStr) {
    const [Y, M, D] = birthDateStr.split("-").map(Number);
    if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return bad("Invalid birthDate", 409);
    birthDate = new Date(Y, M - 1, D, 0, 0, 0, 0);
  }

  const created = await prisma.student.create({
    data: {
      name,
      school: school || null,
      grade: grade || null,
      targetSchool: targetSchool || null,
      currentMajor: currentMajor || null,
      coachingContent: coachingContent || null,
      note: note || null,
      birthDate,
      sourceChannelId,
      studentTypeId,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, studentId: created.id }, { status: 201 });
}
