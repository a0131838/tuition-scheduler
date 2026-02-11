import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [Y, M, D] = s.split("-").map(Number);
  if (!Number.isFinite(Y) || !Number.isFinite(M) || !Number.isFinite(D)) return null;
  const dt = new Date(Y, M - 1, D, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== Y || dt.getMonth() !== M - 1 || dt.getDate() !== D) return null;
  return dt;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtRange(startAt: Date, endAt: Date) {
  return `${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;
}

function classLabel(cls: {
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function roomLabel(cls: { room?: { name: string } | null; campus: { name: string } }) {
  return `${cls.campus.name}${cls.room ? ` / ${cls.room.name}` : ""}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const roomIdRaw = String(body?.roomId ?? "");
  const rangeFrom = String(body?.rangeFrom ?? "");
  const rangeTo = String(body?.rangeTo ?? "");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { campus: true, course: true, subject: true, level: true, room: true },
  });
  if (!cls) return bad("Class not found", 404);

  const label = classLabel(cls);
  const oldRoomLabel = roomLabel(cls);

  const roomId = roomIdRaw ? roomIdRaw : null;
  let nextRoomLabel = "(none)";

  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { campus: true } });
    if (!room || room.campusId !== cls.campusId) {
      return bad(`Room not in this campus: ${cls.campus.name}`, 409);
    }
    if (cls.capacity > room.capacity) {
      return bad(`Class capacity ${cls.capacity} exceeds room capacity ${room.capacity}`, 409);
    }
    nextRoomLabel = `${room.campus.name} / ${room.name}`;
  }

  if (rangeFrom && rangeTo && roomId) {
    const from = parseDateOnly(rangeFrom);
    const to = parseDateOnly(rangeTo);
    if (!from || !to) return bad("Invalid date range");
    to.setHours(23, 59, 59, 999);

    const classSessions = await prisma.session.findMany({
      where: { classId, startAt: { lte: to }, endAt: { gte: from } },
      select: { id: true, startAt: true, endAt: true },
    });

    for (const s of classSessions) {
      const conflict = await prisma.session.findFirst({
        where: {
          id: { not: s.id },
          class: { roomId },
          startAt: { lt: s.endAt },
          endAt: { gt: s.startAt },
        },
        select: { id: true, classId: true, startAt: true, endAt: true },
      });
      if (conflict) {
        const conflictClass = await prisma.class.findUnique({
          where: { id: conflict.classId },
          include: { course: true, subject: true, level: true, campus: true, room: true },
        });
        const cLabel = conflictClass ? classLabel(conflictClass) : "Class";
        const place = conflictClass ? roomLabel(conflictClass) : "Room";
        const time = fmtRange(conflict.startAt, conflict.endAt);
        return bad(`Room conflict: ${cLabel} | ${place} | ${time}`, 409, { code: "ROOM_CONFLICT" });
      }
    }
  }

  try {
    await prisma.class.update({ where: { id: classId }, data: { roomId } });
  } catch (e: any) {
    return bad(String(e?.message ?? "Update failed"), 500);
  }

  return Response.json({ ok: true, message: `Room updated: ${label} | ${oldRoomLabel} -> ${nextRoomLabel}` });
}

