import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDatetimeLocal(s: string) {
  const [date, time] = String(s || "").split("T");
  const [Y, M, D] = String(date || "").split("-").map(Number);
  const [hh, mm] = String(time || "").split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

function toMinFromDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtSlotRange(startMin: number, endMin: number) {
  const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
  const sm = String(startMin % 60).padStart(2, "0");
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${sh}:${sm}-${eh}:${em}`;
}

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  if (startAt.toDateString() !== endAt.toDateString()) {
    return "Session spans multiple days";
  }

  const startMin = toMinFromDate(startAt);
  const endMin = toMinFromDate(endAt);

  const dayStart = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate(), 23, 59, 59, 999);

  let slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId, date: { gte: dayStart, lte: dayEnd } },
    select: { startMin: true, endMin: true },
    orderBy: { startMin: "asc" },
  });

  if (slots.length === 0) {
    const weekday = startAt.getDay();
    slots = await prisma.teacherAvailability.findMany({
      where: { teacherId, weekday },
      select: { startMin: true, endMin: true },
      orderBy: { startMin: "asc" },
    });

    if (slots.length === 0) {
      return `No availability on ${WEEKDAYS[weekday] ?? weekday} (no slots)`;
    }
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const weekday = startAt.getDay();
    return `Outside availability ${WEEKDAYS[weekday] ?? weekday} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}. Available: ${ranges}`;
  }

  return null;
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const teacherId = String(body?.teacherId ?? "");
  const studentId = String(body?.studentId ?? "");
  const startAtStr = String(body?.startAt ?? "");
  const durationMin = Number(body?.durationMin ?? 60);

  if (!teacherId || !studentId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }

  const startAt = parseDatetimeLocal(startAtStr);
  if (Number.isNaN(startAt.getTime())) return bad("Invalid startAt");
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) return bad(availErr, 409, { code: "AVAIL_CONFLICT" });

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      class: { teacherId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, classId: true },
  });
  if (teacherSessionConflict) {
    return bad(
      `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`,
      409,
      { code: "TIME_CONFLICT" }
    );
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) {
    const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(teacherApptConflict.endAt)}`;
    return bad(`Teacher conflict with appointment ${timeLabel}`, 409, { code: "TIME_CONFLICT" });
  }

  const created = await prisma.appointment.create({
    data: { teacherId, studentId, startAt, endAt, mode: "OFFLINE" },
  });

  return Response.json(
    {
      ok: true,
      appointment: { id: created.id, teacherId, startAt: created.startAt.toISOString(), endAt: created.endAt.toISOString() },
    },
    { status: 201 }
  );
}

