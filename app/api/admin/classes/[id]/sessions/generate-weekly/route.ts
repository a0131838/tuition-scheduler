import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function parseTimeHHMM(s: string) {
  const [hh, mm] = s.split(":").map(Number);
  return { hh, mm };
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toMinFromDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
      const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `No availability on ${WEEKDAYS[weekday] ?? weekday} (no slots)`;
    }
  }

  const ok = slots.some((s) => s.startMin <= startMin && s.endMin >= endMin);
  if (!ok) {
    const ranges = slots.map((s) => fmtSlotRange(s.startMin, s.endMin)).join(", ");
    const weekday = startAt.getDay();
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Outside availability ${WEEKDAYS[weekday] ?? weekday} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}. Available: ${ranges}`;
  }

  return null;
}

async function findConflictForSession(opts: {
  classId: string;
  teacherId: string;
  roomId: string | null;
  startAt: Date;
  endAt: Date;
}) {
  const { classId, teacherId, roomId, startAt, endAt } = opts;

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) return availErr;

  const dup = await prisma.session.findFirst({
    where: { classId, startAt, endAt },
    select: { id: true },
  });
  if (dup) return `Session already exists at ${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      class: { teacherId },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true, classId: true },
  });
  if (teacherSessionConflict) {
    return `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`;
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
    return `Teacher conflict with appointment ${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
      teacherApptConflict.endAt
    )}`;
  }

  if (roomId) {
    const roomSessionConflict = await prisma.session.findFirst({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, classId: true },
    });
    if (roomSessionConflict) {
      return `Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`;
    }
  }

  return null;
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

  const startDateStr = String(body?.startDate ?? "");
  const weekday = Number(body?.weekday ?? 1);
  const timeStr = String(body?.time ?? "19:00");
  const weeks = Number(body?.weeks ?? 8);
  const durationMin = Number(body?.durationMin ?? 60);
  const onConflict = String(body?.onConflict ?? "reject");
  const studentId = String(body?.studentId ?? "");

  if (
    !startDateStr ||
    !Number.isFinite(weekday) ||
    weekday < 1 ||
    weekday > 7 ||
    !timeStr ||
    !Number.isFinite(weeks) ||
    weeks <= 0 ||
    weeks > 52 ||
    !Number.isFinite(durationMin) ||
    durationMin < 15
  ) {
    return bad("Invalid input");
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: true, room: true, course: true, subject: true, level: true },
  });
  if (!cls) return bad("Class not found", 404);

  if (cls.capacity === 1) {
    if (!studentId) return bad("Please select a student", 409);
    const enrolled = await prisma.enrollment.findFirst({
      where: { classId, studentId },
      select: { id: true },
    });
    if (!enrolled) return bad("Student not enrolled in this class", 409);
  }

  const startDate = parseDateOnly(startDateStr);
  if (Number.isNaN(startDate.getTime())) return bad("Invalid startDate");
  const { hh, mm } = parseTimeHHMM(timeStr);

  const ourToJs = (our: number) => (our === 7 ? 0 : our);

  const first = new Date(startDate);
  const targetJs = ourToJs(weekday);
  while (first.getDay() !== targetJs) first.setDate(first.getDate() + 1);

  let created = 0;
  let skipped = 0;
  const skippedSamples: string[] = [];

  for (let i = 0; i < weeks; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);

    const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

    const conflict = await findConflictForSession({
      classId,
      teacherId: cls.teacherId,
      roomId: cls.roomId ?? null,
      startAt,
      endAt,
    });

    if (conflict) {
      if (onConflict === "reject") {
        return bad(`Conflict on ${ymd(startAt)} ${timeStr}: ${conflict}`, 409, { code: "CONFLICT" });
      }
      skipped++;
      if (skippedSamples.length < 5) skippedSamples.push(`${ymd(startAt)} ${timeStr} - ${conflict}`);
      continue;
    }

    await prisma.session.create({
      data: {
        classId,
        startAt,
        endAt,
        studentId: cls.capacity === 1 ? studentId : null,
      },
    });
    created++;
  }

  const msg =
    onConflict === "skip"
      ? `Generated done: created=${created}, skipped=${skipped}.` + (skippedSamples.length ? ` Samples: ${skippedSamples.join(" | ")}` : "")
      : `Generated done: created=${created}.`;

  return Response.json({ ok: true, created, skipped, msg, skippedSamples });
}

