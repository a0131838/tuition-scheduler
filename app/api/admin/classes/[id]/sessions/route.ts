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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  const sessions = await prisma.session.findMany({
    where: { classId },
    include: { teacher: { select: { id: true, name: true } }, student: { select: { id: true, name: true } }, class: { select: { teacherId: true } } },
    orderBy: { startAt: "desc" },
  });

  return Response.json({
    ok: true,
    sessions: sessions.map((s) => ({
      id: s.id,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      teacherId: s.teacherId,
      teacherName: s.teacher?.name ?? null,
      studentId: s.studentId,
      studentName: s.student?.name ?? null,
      classTeacherId: s.class.teacherId,
    })),
  });
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

  const startAtStr = String(body?.startAt ?? "");
  const durationMin = Number(body?.durationMin ?? 60);
  const studentId = String(body?.studentId ?? "");

  if (!startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }

  const startAt = new Date(startAtStr);
  if (Number.isNaN(startAt.getTime())) return bad("Invalid startAt");
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

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

  const conflict = await findConflictForSession({
    classId,
    teacherId: cls.teacherId,
    roomId: cls.roomId ?? null,
    startAt,
    endAt,
  });
  if (conflict) return bad(conflict, 409, { code: "CONFLICT" });

  const created = await prisma.session.create({
    data: { classId, startAt, endAt, studentId: cls.capacity === 1 ? studentId : null },
    include: { teacher: { select: { id: true, name: true } }, student: { select: { id: true, name: true } } },
  });

  return Response.json(
    {
      ok: true,
      session: {
        id: created.id,
        startAt: created.startAt.toISOString(),
        endAt: created.endAt.toISOString(),
        teacherId: created.teacherId,
        teacherName: created.teacher?.name ?? null,
        studentId: created.studentId,
        studentName: created.student?.name ?? null,
        classTeacherId: cls.teacherId,
      },
    },
    { status: 201 }
  );
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const sessionId = String(body?.sessionId ?? "");
  if (!sessionId) return bad("Missing sessionId");

  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, classId: true } });
  if (!session || session.classId !== classId) return bad("Session not found", 404);

  await prisma.session.delete({ where: { id: sessionId } });
  return Response.json({ ok: true });
}

