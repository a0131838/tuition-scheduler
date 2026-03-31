import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { overlapsMinutes } from "@/lib/availability-conflict";
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await params;
  if (!teacherId) return bad("Missing teacherId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const month = String(body?.month ?? "");
  const sync = Boolean(body?.sync);
  const parsed = parseMonth(month);
  if (!parsed) return bad("Invalid month");

  const { year, monthIndex } = parsed;
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const firstKey = `${monthKey}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const lastKey = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  const first = parseBusinessDateStart(firstKey);
  const last = parseBusinessDateEnd(lastKey);
  if (!first || !last) return bad("Invalid month");

  const weekly = await prisma.teacherAvailability.findMany({
    where: { teacherId },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    select: { weekday: true, startMin: true, endMin: true },
  });
  if (weekly.length === 0) return bad("No weekly template", 409);

  const creates: { date: Date; startMin: number; endMin: number }[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const weekday = d.getDay();
    const slots = weekly.filter((w) => w.weekday === weekday);
    if (slots.length === 0) continue;
    for (const s of slots) {
      const dateKey = formatBusinessDateOnly(d);
      const date = parseBusinessDateStart(dateKey);
      if (!date) continue;
      creates.push({
        date,
        startMin: s.startMin,
        endMin: s.endMin,
      });
    }
  }

  if (sync) {
    await prisma.$transaction(async (tx) => {
      await tx.teacherAvailabilityDate.deleteMany({
        where: { teacherId, date: { gte: first, lte: last } },
      });
      if (creates.length > 0) {
        await tx.teacherAvailabilityDate.createMany({
          data: creates.map((c) => ({ teacherId, date: c.date, startMin: c.startMin, endMin: c.endMin })),
        });
      }
    });
    return Response.json({ ok: true, created: creates.length, mode: "sync" });
  }

  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: first, lte: last } },
    select: { date: true, startMin: true, endMin: true },
  });
  const exists = new Set(existing.map((e) => `${formatBusinessDateOnly(e.date)}|${e.startMin}|${e.endMin}`));
  const existingByDate = new Map<string, Array<{ startMin: number; endMin: number }>>();
  for (const row of existing) {
    const key = formatBusinessDateOnly(row.date);
    existingByDate.set(key, [...(existingByDate.get(key) ?? []), { startMin: row.startMin, endMin: row.endMin }]);
  }
  const missing = creates.filter((c) => {
    const dateKey = formatBusinessDateOnly(c.date);
    if (exists.has(`${dateKey}|${c.startMin}|${c.endMin}`)) return false;
    const overlapsExisting = (existingByDate.get(dateKey) ?? []).some((row) => overlapsMinutes(c.startMin, c.endMin, row.startMin, row.endMin));
    if (overlapsExisting) return false;
    existingByDate.set(dateKey, [...(existingByDate.get(dateKey) ?? []), { startMin: c.startMin, endMin: c.endMin }]);
    return true;
  });
  if (missing.length > 0) {
    await prisma.teacherAvailabilityDate.createMany({
      data: missing.map((c) => ({ teacherId, date: c.date, startMin: c.startMin, endMin: c.endMin })),
      skipDuplicates: true,
    });
  }

  return Response.json({ ok: true, created: missing.length, mode: "merge" });
}
