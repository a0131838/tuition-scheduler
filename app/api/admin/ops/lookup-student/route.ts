import { prisma } from "@/lib/prisma";
import { guardOpsReadAccess } from "@/lib/ops-auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const rawName = String(url.searchParams.get("name") ?? "");
  const name = normalizeName(rawName);
  const limitRaw = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 20;

  if (!name) return bad("Missing query parameter: name", 409);

  const exact = await prisma.student.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      sourceChannel: { select: { name: true } },
      studentType: { select: { name: true } },
      _count: { select: { packages: true, sessions: true, attendances: true } },
    },
  });

  const exactIds = new Set(exact.map((s) => s.id));
  const remaining = limit - exact.length;

  const fuzzy =
    remaining > 0
      ? await prisma.student.findMany({
          where: {
            name: { contains: name, mode: "insensitive" },
            id: { notIn: Array.from(exactIds) },
          },
          orderBy: { name: "asc" },
          take: remaining,
          select: {
            id: true,
            name: true,
            school: true,
            grade: true,
            sourceChannel: { select: { name: true } },
            studentType: { select: { name: true } },
            _count: { select: { packages: true, sessions: true, attendances: true } },
          },
        })
      : [];

  const candidates = [...exact, ...fuzzy].map((row) => ({
    studentId: row.id,
    name: row.name,
    school: row.school ?? null,
    grade: row.grade ?? null,
    sourceChannel: row.sourceChannel?.name ?? null,
    studentType: row.studentType?.name ?? null,
    stats: {
      packages: row._count.packages,
      sessions: row._count.sessions,
      attendances: row._count.attendances,
    },
  }));

  return Response.json({
    ok: true,
    query: { name, limit },
    total: candidates.length,
    candidates,
  });
}
