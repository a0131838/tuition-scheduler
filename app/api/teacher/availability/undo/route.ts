import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { parseUndoPayload, parseYMD, undoKey, ymd } from "../_lib";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function POST() {
  const { teacher } = await requireTeacherProfile();
  if (!teacher?.id) return bad("Teacher profile not linked.", 403);

  const row = await prisma.appSetting.findUnique({
    where: { key: undoKey(teacher.id) },
    select: { value: true },
  });
  const payload = parseUndoPayload(row?.value);
  if (!payload || payload.teacherId !== teacher.id || payload.slots.length === 0) {
    return bad("No undo snapshot available", 409);
  }

  const dates = Array.from(new Set(payload.slots.map((s) => s.date))).map((d) => parseYMD(d));
  const existing = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { in: dates } },
    select: { date: true, startMin: true, endMin: true },
  });
  const existSet = new Set(existing.map((e) => `${ymd(new Date(e.date))}|${e.startMin}|${e.endMin}`));

  const creates = payload.slots
    .filter((s) => !existSet.has(`${s.date}|${s.startMin}|${s.endMin}`))
    .map((s) => ({
      teacherId: teacher.id,
      date: parseYMD(s.date),
      startMin: s.startMin,
      endMin: s.endMin,
    }));

  await prisma.$transaction([
    ...(creates.length > 0 ? [prisma.teacherAvailabilityDate.createMany({ data: creates })] : []),
    prisma.appSetting.update({ where: { key: undoKey(teacher.id) }, data: { value: "" } }),
  ]);

  const restored = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { in: dates } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  return Response.json({
    ok: true,
    restoredCount: creates.length,
    slots: restored.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      startMin: s.startMin,
      endMin: s.endMin,
    })),
  });
}

