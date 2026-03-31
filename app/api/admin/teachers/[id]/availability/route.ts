import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

function parseMonth(s?: string | null) {
  if (!s) return null;
  const [y, m] = s.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  if (m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await params;
  if (!teacherId) return bad("Missing teacherId");

  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month");
  const now = new Date();
  const parsed = parseMonth(monthStr) ?? { year: now.getFullYear(), monthIndex: now.getMonth() };
  const { year, monthIndex } = parsed;

  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const firstKey = `${month}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const lastKey = `${month}-${String(lastDay).padStart(2, "0")}`;
  const first = parseBusinessDateStart(firstKey);
  const last = parseBusinessDateEnd(lastKey);
  if (!first || !last) return bad("Invalid month");

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true } });
  if (!teacher) return bad("Teacher not found", 404);

  const [dateAvails, weeklyAvails] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      where: { teacherId, date: { gte: first, lte: last } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      select: { id: true, date: true, startMin: true, endMin: true },
    }),
    prisma.teacherAvailability.findMany({
      where: { teacherId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      select: { id: true, weekday: true, startMin: true, endMin: true },
    }),
  ]);

  return Response.json({
    ok: true,
    teacher,
    month,
    range: { first: formatBusinessDateOnly(first), last: formatBusinessDateOnly(last) },
    dateAvails: dateAvails.map((a) => ({ ...a, date: formatBusinessDateOnly(a.date) })),
    weeklyAvails,
  });
}
