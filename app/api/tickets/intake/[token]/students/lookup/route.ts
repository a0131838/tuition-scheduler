import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
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

function collectTeacherNames(input: {
  appointments: Array<{ teacher: { name: string } | null }>;
  sessions: Array<{ teacher: { name: string } | null; class: { teacher: { name: string } | null } | null }>;
  enrollments: Array<{ class: { teacher: { name: string } | null } | null }>;
}) {
  const ordered: string[] = [];
  const push = (name: string | null | undefined) => {
    const normalized = String(name ?? "").trim();
    if (!normalized || ordered.includes(normalized)) return;
    ordered.push(normalized);
  };

  for (const row of input.appointments) push(row.teacher?.name);
  for (const row of input.sessions) {
    push(row.teacher?.name);
    push(row.class?.teacher?.name);
  }
  for (const row of input.enrollments) push(row.class?.teacher?.name);
  return ordered.slice(0, 3);
}

function collectCourseNames(input: {
  appointments: Array<{ teacher: { name: string } | null }>;
  sessions: Array<{ class: { course: { name: string } | null } | null }>;
  enrollments: Array<{ class: { course: { name: string } | null } | null }>;
}) {
  const ordered: string[] = [];
  const push = (name: string | null | undefined) => {
    const normalized = String(name ?? "").trim();
    if (!normalized || ordered.includes(normalized)) return;
    ordered.push(normalized);
  };

  for (const row of input.sessions) push(row.class?.course?.name);
  for (const row of input.enrollments) push(row.class?.course?.name);
  return ordered.slice(0, 3);
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

  const exact = await prisma.student.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      grade: true,
      appointments: {
        orderBy: { startAt: "desc" },
        take: 3,
        select: {
          teacher: { select: { name: true } },
        },
      },
      sessions: {
        orderBy: { startAt: "desc" },
        take: 3,
        select: {
          teacher: { select: { name: true } },
          class: { select: { teacher: { select: { name: true } }, course: { select: { name: true } } } },
        },
      },
      enrollments: {
        take: 3,
        select: {
          class: { select: { teacher: { select: { name: true } }, course: { select: { name: true } } } },
        },
      },
    },
  });

  const exactIds = new Set(exact.map((row) => row.id));
  const remaining = Math.max(0, limit - exact.length);
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
            grade: true,
            appointments: {
              orderBy: { startAt: "desc" },
              take: 2,
              select: {
                teacher: { select: { name: true } },
              },
            },
            sessions: {
              orderBy: { startAt: "desc" },
              take: 2,
              select: {
                teacher: { select: { name: true } },
                class: { select: { teacher: { select: { name: true } }, course: { select: { name: true } } } },
              },
            },
            enrollments: {
              take: 2,
              select: {
                class: { select: { teacher: { select: { name: true } }, course: { select: { name: true } } } },
              },
            },
          },
        })
      : [];

  const rows = [...exact, ...fuzzy].map((row) => ({
    studentId: row.id,
    name: row.name,
    grade: row.grade ?? null,
    teachers: collectTeacherNames({
      appointments: row.appointments,
      sessions: row.sessions,
      enrollments: row.enrollments,
    }),
    courses: collectCourseNames({
      appointments: row.appointments,
      sessions: row.sessions,
      enrollments: row.enrollments,
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
