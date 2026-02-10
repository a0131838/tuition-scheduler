import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { AVAIL_MAX_TIME, AVAIL_MIN_TIME, inAllowedWindow, parseYMD, toMin } from "../_lib";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function GET(req: Request) {
  const { teacher } = await requireTeacherProfile();
  if (!teacher?.id) return bad("Teacher profile not linked.", 403);

  const url = new URL(req.url);
  const fromStr = String(url.searchParams.get("from") ?? "");
  const toStr = String(url.searchParams.get("to") ?? "");

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const defaultTo = new Date(defaultFrom);
  defaultTo.setDate(defaultTo.getDate() + 30);

  let from = defaultFrom;
  let to = defaultTo;
  if (fromStr) from = parseYMD(fromStr);
  if (toStr) to = parseYMD(toStr);

  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  return Response.json({
    slots: slots.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      startMin: s.startMin,
      endMin: s.endMin,
    })),
  });
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

  const dateStr = String(body?.date ?? "");
  const start = String(body?.start ?? "");
  const end = String(body?.end ?? "");
  if (!dateStr || !start || !end) return bad("Missing input");

  const date = parseYMD(dateStr);
  const startMin = toMin(start);
  const endMin = toMin(end);
  if (!(Number.isFinite(startMin) && Number.isFinite(endMin))) return bad("Invalid time");
  if (endMin <= startMin) return bad("End must be after start");
  if (!inAllowedWindow(startMin, endMin)) return bad(`Time must be between ${AVAIL_MIN_TIME} and ${AVAIL_MAX_TIME}`);

  const created = await prisma.teacherAvailabilityDate.create({
    data: { teacherId: teacher.id, date, startMin, endMin },
  });

  return Response.json({
    slot: {
      id: created.id,
      date: created.date.toISOString(),
      startMin: created.startMin,
      endMin: created.endMin,
    },
  });
}

