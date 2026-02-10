import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { parseYMD, undoKey, ymd, type AvailabilityUndoPayload } from "../_lib";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

function dayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
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
  if (!dateStr) return bad("Missing date");
  const date = parseYMD(dateStr);
  if (Number.isNaN(date.getTime())) return bad("Invalid date");

  const { start, end } = dayRange(date);

  const [sessionCount, apptCount] = await Promise.all([
    prisma.session.count({
      where: {
        startAt: { lte: end },
        endAt: { gte: start },
        OR: [{ teacherId: teacher.id }, { teacherId: null, class: { teacherId: teacher.id } }],
      },
    }),
    prisma.appointment.count({
      where: {
        teacherId: teacher.id,
        startAt: { lte: end },
        endAt: { gte: start },
      },
    }),
  ]);

  if (sessionCount > 0 || apptCount > 0) {
    return bad(`Cannot clear ${dateStr}: ${sessionCount} sessions and ${apptCount} appointments exist`, 409);
  }

  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date },
    select: { date: true, startMin: true, endMin: true },
  });
  if (slots.length === 0) return bad(`No slots to clear on ${dateStr}`, 409);

  const payload: AvailabilityUndoPayload = {
    type: "CLEAR_DAY",
    teacherId: teacher.id,
    date: dateStr,
    createdAt: new Date().toISOString(),
    slots: slots.map((s) => ({
      date: ymd(new Date(s.date)),
      startMin: s.startMin,
      endMin: s.endMin,
    })),
  };

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: undoKey(teacher.id) },
      create: { key: undoKey(teacher.id), value: JSON.stringify(payload) },
      update: { value: JSON.stringify(payload) },
    }),
    prisma.teacherAvailabilityDate.deleteMany({ where: { teacherId: teacher.id, date } }),
  ]);

  return Response.json({ ok: true, undoPayload: payload });
}

