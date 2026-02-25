import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
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

function toMinFromDate(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtSlotRange(startMin: number, endMin: number) {
  const sh = String(Math.floor(startMin / 60)).padStart(2, "0");
  const sm = String(startMin % 60).padStart(2, "0");
  const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
  const em = String(endMin % 60).padStart(2, "0");
  return `${sh}:${sm}-${eh}:${em}`;
}

function classLabel(cls: {
  course: { name: string };
  subject?: { name: string } | null;
  level?: { name: string } | null;
}) {
  return `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
}

function canTeachClass(teacher: any, courseId?: string | null, subjectId?: string | null) {
  if (subjectId) {
    if (teacher?.subjectCourseId === subjectId) return true;
    if (Array.isArray(teacher?.subjects) && teacher.subjects.some((s: any) => s?.id === subjectId)) return true;
    return false;
  }

  if (!courseId) return false;
  if (teacher?.subjectCourse?.courseId === courseId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.courseId === courseId);
  }
  return false;
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: sessionId } = await params;
  if (!sessionId) return bad("Missing sessionId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const newTeacherId = String(body?.newTeacherId ?? "");
  const reason = String(body?.reason ?? "").trim() || null;
  if (!newTeacherId) return bad("Missing newTeacherId");

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
    },
  });
  if (!session) return bad("Session not found", 404);

  const teacher = await prisma.teacher.findUnique({
    where: { id: newTeacherId },
    include: { subjects: true, subjectCourse: true },
  });
  if (!teacher) return bad("Teacher not found", 404);

  if (!canTeachClass(teacher, (session.class as any).courseId, (session.class as any).subjectId)) {
    const label = classLabel(session.class as any);
    return bad(`Teacher cannot teach this course: ${label}`, 409, { code: "CANNOT_TEACH" });
  }

  const availErr = await checkTeacherAvailability(newTeacherId, session.startAt, session.endAt);
  if (availErr) return bad(`Availability conflict: ${availErr}`, 409, { code: "AVAIL_CONFLICT" });

  const conflicts = await prisma.session.findMany({
    where: {
      id: { not: session.id },
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
      OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
    },
    include: {
      attendances: {
        select: {
          studentId: true,
          status: true,
          excusedCharge: true,
          deductedMinutes: true,
          deductedCount: true,
        },
      },
      class: { include: { course: true, subject: true, level: true } },
    },
  });
  const conflict = pickTeacherSessionConflict(conflicts, session.studentId);
  if (conflict) {
    const label = classLabel(conflict.class as any);
    const time = fmtRange(conflict.startAt, conflict.endAt);
    return bad(`Teacher time conflict: ${label} | ${time}`, 409, { code: "TIME_CONFLICT" });
  }

  const apptConflict = await prisma.appointment.findFirst({
    where: {
      teacherId: newTeacherId,
      startAt: { lt: session.endAt },
      endAt: { gt: session.startAt },
    },
    include: { student: true },
  });
  if (apptConflict) {
    const time = fmtRange(apptConflict.startAt, apptConflict.endAt);
    return bad(
      `Teacher appointment conflict: ${teacher.name} | ${time} | ${apptConflict.student?.name ?? "Appointment"}`,
      409,
      { code: "TIME_CONFLICT" }
    );
  }

  const fromTeacherId = session.teacherId ?? (session.class as any).teacherId;
  const toTeacherId = newTeacherId;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: { teacherId: toTeacherId === (session.class as any).teacherId ? null : toTeacherId },
      });
      await tx.sessionTeacherChange.create({
        data: { sessionId: session.id, fromTeacherId, toTeacherId, reason },
      });
    });
  } catch (e: any) {
    return bad(String(e?.message ?? "Replace failed"), 500);
  }

  const label = classLabel(session.class as any);
  const time = fmtRange(session.startAt, session.endAt);
  const fromName = (session.teacher as any)?.name ?? (session.class as any)?.teacher?.name ?? "Teacher";
  const toName = teacher.name;
  return Response.json({ ok: true, message: `Teacher updated: ${label} | ${time} | ${fromName} -> ${toName}` });
}
