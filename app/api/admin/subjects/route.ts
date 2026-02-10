import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseNames(raw: any): string[] {
  const s = String(raw ?? "");
  return s
    .split(/[,\n，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const courseId = String(body?.courseId ?? "").trim();
  const names = parseNames(body?.name ?? body?.names ?? "");
  if (!courseId) return bad("Missing courseId", 409);
  if (names.length === 0) return bad("Missing names", 409);

  await prisma.subject.createMany({
    data: names.map((name) => ({ courseId, name })),
    skipDuplicates: true,
  });

  const subjects = await prisma.subject.findMany({
    where: { courseId },
    include: { levels: true },
    orderBy: { name: "asc" },
  });

  return Response.json({ ok: true, subjects });
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

  const count = await prisma.class.count({ where: { subjectId: id } });
  if (count > 0) return bad("Subject has classes", 409);

  await prisma.subject.delete({ where: { id } });
  return Response.json({ ok: true });
}

