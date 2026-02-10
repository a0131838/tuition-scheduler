import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
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

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

async function findTeacherConflict(opts: {
  teacherId: string;
  startAt: Date;
  endAt: Date;
  excludeSessionIds: string[];
}) {
  const { teacherId, startAt, endAt, excludeSessionIds } = opts;

  const teacherSessionConflict = await prisma.session.findFirst({
    where: {
      id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
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

  const sessionId = String(body?.sessionId ?? "");
  const newTeacherId = String(body?.newTeacherId ?? "");
  const scope = String(body?.scope ?? "single");
  const reason = String(body?.reason ?? "").trim() || null;

  if (!sessionId || !newTeacherId) return bad("Missing sessionId or newTeacherId");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: true },
  });
  if (!session || session.classId !== classId) return bad("Session not found", 404);

  const teacher = await prisma.teacher.findUnique({
    where: { id: newTeacherId },
    include: { subjects: true },
  });
  if (!teacher) return bad("Teacher not found", 404);
  if (!canTeachSubject(teacher, session.class.subjectId)) return bad("Teacher cannot teach this course", 409);

  const targetSessions =
    scope === "future"
      ? await prisma.session.findMany({
          where: { classId, startAt: { gte: session.startAt } },
          include: { class: true },
          orderBy: { startAt: "asc" },
        })
      : [session];

  const targetIds = targetSessions.map((s) => s.id);

  for (const s of targetSessions) {
    const availErr = await checkTeacherAvailability(newTeacherId, s.startAt, s.endAt);
    if (availErr) {
      return bad(
        `Availability conflict on ${ymd(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}: ${availErr}`,
        409,
        { code: "AVAIL_CONFLICT" }
      );
    }

    const conflict = await findTeacherConflict({
      teacherId: newTeacherId,
      startAt: s.startAt,
      endAt: s.endAt,
      excludeSessionIds: targetIds,
    });
    if (conflict) {
      return bad(`Time conflict on ${ymd(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}: ${conflict}`, 409, {
        code: "TIME_CONFLICT",
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const s of targetSessions) {
      const fromTeacherId = s.teacherId ?? s.class.teacherId;
      const toTeacherId = newTeacherId;
      if (fromTeacherId === toTeacherId) continue;

      await tx.session.update({
        where: { id: s.id },
        data: { teacherId: toTeacherId === s.class.teacherId ? null : toTeacherId },
      });

      await tx.sessionTeacherChange.create({
        data: {
          sessionId: s.id,
          fromTeacherId,
          toTeacherId,
          reason,
        },
      });
    }
  });

  return Response.json({
    ok: true,
    replaced: targetSessions.length,
  });
}

