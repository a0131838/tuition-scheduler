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
    return "Appointment spans multiple days";
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

function canTeachClass(teacher: any, courseId?: string | null, subjectId?: string | null) {
  if (subjectId) return canTeachSubject(teacher, subjectId);
  if (!courseId) return false;
  if (teacher?.subjectCourse?.courseId === courseId) return true;
  if (Array.isArray(teacher?.subjects)) return teacher.subjects.some((s: any) => s?.courseId === courseId);
  return false;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: appointmentId } = await params;
  if (!appointmentId) return bad("Missing appointmentId");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const newTeacherId = String(body?.newTeacherId ?? "");
  const classId = String(body?.classId ?? "").trim();
  const reason = String(body?.reason ?? "").trim() || null;
  if (!newTeacherId) return bad("Missing newTeacherId");

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) return bad("Appointment not found", 404);

  const teacher = await prisma.teacher.findUnique({
    where: { id: newTeacherId },
    include: { subjects: true, subjectCourse: true },
  });
  if (!teacher) return bad("Teacher not found", 404);

  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { courseId: true, subjectId: true } });
    if (cls && !canTeachClass(teacher, cls.courseId, cls.subjectId)) {
      return bad("Teacher cannot teach this class course", 409, { code: "CANNOT_TEACH" });
    }
  }

  const sessionMatch = await prisma.session.findFirst({
    where: {
      startAt: appt.startAt,
      endAt: appt.endAt,
      OR: [{ teacherId: appt.teacherId }, { teacherId: null, class: { teacherId: appt.teacherId } }],
    },
    include: { class: true },
  });

  if (sessionMatch && !canTeachSubject(teacher, (sessionMatch.class as any)?.subjectId ?? null)) {
    return bad("Teacher cannot teach this course", 409);
  }

  const availErr = await checkTeacherAvailability(newTeacherId, appt.startAt, appt.endAt);
  if (availErr) return bad(availErr, 409, { code: "AVAIL_CONFLICT" });

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      id: sessionMatch ? { not: sessionMatch.id } : undefined,
      startAt: { lt: appt.endAt },
      endAt: { gt: appt.startAt },
      OR: [{ teacherId: newTeacherId }, { teacherId: null, class: { teacherId: newTeacherId } }],
    },
    select: {
      id: true,
      classId: true,
      studentId: true,
      class: { select: { capacity: true, oneOnOneStudentId: true } },
      attendances: {
        select: {
          studentId: true,
          status: true,
          excusedCharge: true,
          deductedMinutes: true,
          deductedCount: true,
        },
      },
    },
  });
  const teacherSessionConflict = pickTeacherSessionConflict(teacherSessionConflicts, appt.studentId);
  if (teacherSessionConflict) {
    return bad(`Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`, 409, {
      code: "TIME_CONFLICT",
    });
  }

  const teacherApptConflict = await prisma.appointment.findFirst({
    where: {
      id: { not: appt.id },
      teacherId: newTeacherId,
      startAt: { lt: appt.endAt },
      endAt: { gt: appt.startAt },
    },
    select: { id: true, startAt: true, endAt: true },
  });
  if (teacherApptConflict) {
    const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(teacherApptConflict.endAt)}`;
    return bad(`Teacher conflict with appointment ${timeLabel}`, 409, { code: "TIME_CONFLICT" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id: appt.id }, data: { teacherId: newTeacherId } });
      if (sessionMatch) {
        const fromTeacherId = sessionMatch.teacherId ?? (sessionMatch.class as any).teacherId;
        const toTeacherId = newTeacherId;

        await tx.session.update({
          where: { id: sessionMatch.id },
          data: { teacherId: toTeacherId === (sessionMatch.class as any).teacherId ? null : toTeacherId },
        });

        if (fromTeacherId !== toTeacherId) {
          await tx.sessionTeacherChange.create({
            data: {
              sessionId: sessionMatch.id,
              fromTeacherId,
              toTeacherId,
              reason,
            },
          });
        }
      }
    });
  } catch (e: any) {
    return bad(String(e?.message ?? "Replace failed"), 500);
  }

  return Response.json({ ok: true });
}
