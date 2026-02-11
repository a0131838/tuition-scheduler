import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

const FIXED_STUDENT_TYPE_NAME = "合作方学生";
const FIXED_SOURCE_CHANNEL_NAME = "新东方学生";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = String(body?.name ?? "").trim();
  const school = String(body?.school ?? "").trim();
  const grade = String(body?.grade ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const birthDateStr = String(body?.birthDate ?? "").trim();

  if (!name) return bad("Name is required", 409);

  let birthDate: Date | null = null;
  if (birthDateStr) {
    const [Y, M, D] = birthDateStr.split("-").map(Number);
    if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return bad("Invalid birthDate", 409);
    birthDate = new Date(Y, M - 1, D, 0, 0, 0, 0);
  }

  const [source, studentType] = await Promise.all([
    prisma.studentSourceChannel.findFirst({
      where: { name: FIXED_SOURCE_CHANNEL_NAME },
      select: { id: true },
    }),
    prisma.studentType.findFirst({
      where: { name: FIXED_STUDENT_TYPE_NAME },
      select: { id: true },
    }),
  ]);

  if (!source) return bad(`Missing fixed source channel: ${FIXED_SOURCE_CHANNEL_NAME}`, 409);
  if (!studentType) return bad(`Missing fixed student type: ${FIXED_STUDENT_TYPE_NAME}`, 409);

  const created = await prisma.student.create({
    data: {
      name,
      school: school || null,
      grade: grade || null,
      note: note || null,
      birthDate,
      sourceChannelId: source.id,
      studentTypeId: studentType.id,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, studentId: created.id }, { status: 201 });
}

