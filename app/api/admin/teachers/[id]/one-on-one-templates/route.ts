import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseHHMM(s: string) {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await ctx.params;
  if (!teacherId) return bad("Missing teacherId", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const studentId = String(body?.studentId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const levelIdRaw = String(body?.levelId ?? "");
  const campusId = String(body?.campusId ?? "");
  const roomIdRaw = String(body?.roomId ?? "");
  const weekdayRaw = String(body?.weekday ?? "");
  const startTime = String(body?.startTime ?? "");
  const durationRaw = String(body?.durationMin ?? "");

  if (!studentId || !subjectId || !campusId || !weekdayRaw || !startTime || !durationRaw) {
    return bad("Missing template fields", 409);
  }

  const weekday = Number(weekdayRaw);
  const startMin = parseHHMM(startTime);
  const durationMin = Number(durationRaw);
  if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || startMin == null || durationMin < 15) {
    return bad("Invalid template fields", 409);
  }

  const levelId = levelIdRaw || null;
  if (roomIdRaw) {
    const room = await prisma.room.findUnique({ where: { id: roomIdRaw }, select: { id: true, campusId: true } });
    if (!room || room.campusId !== campusId) return bad("Room not in this campus", 409);
  }

  let cls: { id: string } | null = null;
  try {
    cls = await getOrCreateOneOnOneClassForStudent({
      teacherId,
      studentId,
      subjectId,
      levelId,
      campusId,
      roomId: roomIdRaw || null,
      ensureEnrollment: true,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Failed to create one-on-one class";
    return bad(raw, 409);
  }
  if (!cls) return bad("Invalid subject or level", 409);

  const created = await prisma.teacherOneOnOneTemplate.create({
    data: {
      teacherId,
      studentId,
      classId: cls.id,
      weekday,
      startMin,
      durationMin,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, id: created.id }, { status: 201 });
}

