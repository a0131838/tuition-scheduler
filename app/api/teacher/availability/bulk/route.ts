import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { AVAIL_MAX_TIME, AVAIL_MIN_TIME, inAllowedWindow, parseYMD, toMin, ymd } from "../_lib";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function POST(req: Request) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher?.id) return bad("Teacher profile not linked.", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const fromStr = String(body?.from ?? "");
  const toStr = String(body?.to ?? "");
  const start = String(body?.start ?? "");
  const end = String(body?.end ?? "");
  const weekdaysRaw = Array.isArray(body?.weekdays) ? body.weekdays : [];
  const weekdays = weekdaysRaw.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x));

  if (!fromStr || !toStr || !start || !end || weekdays.length === 0) {
    return bad("Missing input for bulk add");
  }

  const from = parseYMD(fromStr);
  const to = parseYMD(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return bad("Invalid date range");
  }

  const startMin = toMin(start);
  const endMin = toMin(end);
  if (!(Number.isFinite(startMin) && Number.isFinite(endMin))) return bad("Invalid time");
  if (endMin <= startMin) return bad("End must be after start");
  if (!inAllowedWindow(startMin, endMin)) return bad(`Time must be between ${AVAIL_MIN_TIME} and ${AVAIL_MAX_TIME}`);

  const weekdaySet = new Set(weekdays.filter((x: number) => x >= 0 && x <= 6));
  if (weekdaySet.size === 0) return Response.json({ added: 0 });

  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { gte: from, lte: to } },
    select: { date: true, startMin: true, endMin: true },
  });
  const existSet = new Set(existing.map((e) => `${ymd(new Date(e.date))}|${e.startMin}|${e.endMin}`));

  const creates: { teacherId: string; date: Date; startMin: number; endMin: number }[] = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (!weekdaySet.has(d.getDay())) continue;
    const key = `${ymd(d)}|${startMin}|${endMin}`;
    if (existSet.has(key)) continue;
    creates.push({
      teacherId: teacher.id,
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
      startMin,
      endMin,
    });
  }

  if (creates.length > 0) {
    await prisma.teacherAvailabilityDate.createMany({ data: creates });
  }

  return Response.json({ added: creates.length });
}
