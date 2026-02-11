import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
  const first = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const last = new Date(year, monthIndex + 1, 0, 0, 0, 0, 0);

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
      creates.push({
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
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
  const exists = new Set(existing.map((e) => `${ymd(e.date)}|${e.startMin}|${e.endMin}`));
  const missing = creates.filter((c) => !exists.has(`${ymd(c.date)}|${c.startMin}|${c.endMin}`));
  if (missing.length > 0) {
    await prisma.teacherAvailabilityDate.createMany({
      data: missing.map((c) => ({ teacherId, date: c.date, startMin: c.startMin, endMin: c.endMin })),
    });
  }

  return Response.json({ ok: true, created: missing.length, mode: "merge" });
}
