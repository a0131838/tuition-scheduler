import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

async function ensureTokenOk(token: string) {
  const row = await prisma.ticketIntakeToken.findUnique({
    where: { token },
    select: { isActive: true, expiresAt: true },
  });
  if (!row) return false;
  if (!row.isActive) return false;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;
  return true;
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function collectCourseHints(input: {
  subjectCourse: { name: string } | null;
  subjects: Array<{ name: string }>;
  classes: Array<{ course: { name: string } }>;
}) {
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const normalized = String(value ?? "").trim();
    if (!normalized || out.includes(normalized)) return;
    out.push(normalized);
  };

  push(input.subjectCourse?.name);
  for (const item of input.subjects) push(item.name);
  for (const item of input.classes) push(item.course.name);
  return out.slice(0, 3);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!(await ensureTokenOk(token))) return bad("Intake link is invalid or expired", 403);

  const url = new URL(req.url);
  const name = normalizeName(String(url.searchParams.get("name") ?? ""));
  if (!name || name.length < 2) {
    return Response.json({ ok: true, total: 0, matchType: "empty", candidates: [] });
  }

  const limitRaw = Number(url.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 5) : 5;

  const exact = await prisma.teacher.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      subjectCourse: { select: { name: true } },
      subjects: { select: { name: true }, take: 2 },
      classes: {
        take: 2,
        select: { course: { select: { name: true } } },
      },
    },
  });

  const exactIds = new Set(exact.map((row) => row.id));
  const remaining = Math.max(0, limit - exact.length);
  const fuzzy =
    remaining > 0
      ? await prisma.teacher.findMany({
          where: {
            name: { contains: name, mode: "insensitive" },
            id: { notIn: Array.from(exactIds) },
          },
          orderBy: { name: "asc" },
          take: remaining,
          select: {
            id: true,
            name: true,
            subjectCourse: { select: { name: true } },
            subjects: { select: { name: true }, take: 2 },
            classes: {
              take: 2,
              select: { course: { select: { name: true } } },
            },
          },
        })
      : [];

  const rows = [...exact, ...fuzzy].map((row) => ({
    teacherId: row.id,
    name: row.name,
    courses: collectCourseHints({
      subjectCourse: row.subjectCourse,
      subjects: row.subjects,
      classes: row.classes,
    }),
  }));

  const hasExact = exact.length > 0;
  const matchType = hasExact ? (exact.length === 1 ? "exact" : "multiple-exact") : rows.length > 0 ? "fuzzy" : "none";

  return Response.json({
    ok: true,
    query: name,
    total: rows.length,
    matchType,
    candidates: rows,
  });
}
