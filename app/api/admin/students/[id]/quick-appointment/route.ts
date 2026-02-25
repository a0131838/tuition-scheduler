import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";
import { findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { coursePackageAccessibleByStudent } from "@/lib/package-sharing";
import { shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDatetimeLocal(s: string) {
  const [date, time] = s.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function fmtDateInput(d: Date | null) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatSessionConflictLabel(s: any) {
  const cls = s.class;
  const classLabel = `${cls.course.name}${cls.subject ? ` / ${cls.subject.name}` : ""}${cls.level ? ` / ${cls.level.name}` : ""}`;
  const roomLabel = cls.room?.name ?? "(none)";
  const timeLabel = `${fmtDateInput(s.startAt)} ${fmtHHMM(s.startAt)}-${fmtHHMM(s.endAt)}`;
  return `${classLabel} | ${cls.teacher.name} | ${cls.campus.name} / ${roomLabel} | ${timeLabel}`;
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

function canTeachSubject(teacher: any, subjectId?: string | null) {
  if (!subjectId) return true;
  if (teacher?.subjectCourseId === subjectId) return true;
  if (Array.isArray(teacher?.subjects)) {
    return teacher.subjects.some((s: any) => s?.id === subjectId);
  }
  return false;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id: studentId } = await params;
  if (!studentId) return bad("Missing studentId");
  const bypassAvailabilityCheck = isStrictSuperAdmin(user);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const teacherId = String(body?.teacherId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const levelIdRaw = String(body?.levelId ?? "");
  const campusId = String(body?.campusId ?? "");
  const roomIdRaw = String(body?.roomId ?? "");
  const startAtStr = String(body?.startAt ?? "");
  const durationMin = Number(body?.durationMin ?? 60);

  if (!teacherId || !subjectId || !campusId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }

  const roomId = roomIdRaw || null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) return bad("Campus not found", 404);
  if (!roomId && !campus.isOnline) return bad("Room is required", 409);
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.campusId !== campusId) return bad("Invalid room", 409);
  }

  const startAt = parseDatetimeLocal(startAtStr);
  if (Number.isNaN(startAt.getTime())) return bad("Invalid startAt", 409);
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: true },
  });
  if (!teacher) return bad("Teacher not found", 404);
  if (!canTeachSubject(teacher, subjectId)) return bad("Teacher cannot teach this course", 409);

  if (!bypassAvailabilityCheck) {
    const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
    if (availErr) return bad(availErr, 409);
  }

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    include: {
      class: {
        include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true },
      },
      attendances: {
        select: { studentId: true, status: true, excusedCharge: true, deductedMinutes: true, deductedCount: true },
      },
    },
    orderBy: { startAt: "asc" },
  });
  const teacherSessionConflict = teacherSessionConflicts.find((s) => !shouldIgnoreTeacherConflictSession(s, studentId));
  if (teacherSessionConflict) {
    return bad(`Teacher conflict: ${formatSessionConflictLabel(teacherSessionConflict)}`, 409);
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
    const timeLabel = `${fmtDateInput(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
      teacherApptConflict.endAt
    )}`;
    return bad(`Teacher conflict: appointment ${timeLabel}`, 409);
  }

  if (roomId) {
    const roomConflict = await prisma.session.findFirst({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      },
    });
    if (roomConflict) return bad(`Room conflict: ${formatSessionConflictLabel(roomConflict)}`, 409);
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, courseId: true },
  });
  if (!subject) return bad("Invalid subject", 409);

  let levelId: string | null = null;
  if (levelIdRaw) {
    const level = await prisma.level.findUnique({ where: { id: levelIdRaw } });
    if (!level || level.subjectId !== subjectId) return bad("Invalid subject or level", 409);
    levelId = levelIdRaw;
  }

  const courseId = subject.courseId;
  if (!bypassAvailabilityCheck) {
    const packageCheckAt = startAt.getTime() < Date.now() ? new Date() : startAt;
    const activePkg = await prisma.coursePackage.findFirst({
      where: {
        ...coursePackageAccessibleByStudent(studentId),
        courseId,
        status: "ACTIVE",
        validFrom: { lte: packageCheckAt },
        OR: [{ validTo: null }, { validTo: { gte: packageCheckAt } }],
        AND: [{ OR: [{ type: "MONTHLY" }, { type: "HOURS", remainingMinutes: { gte: durationMin } }] }],
      },
      select: { id: true },
    });
    if (!activePkg) return bad("No active package for this course", 409);
  }

  let cls: Awaited<ReturnType<typeof getOrCreateOneOnOneClassForStudent>>;
  try {
    cls = await getOrCreateOneOnOneClassForStudent({
      teacherId,
      studentId,
      courseId,
      subjectId,
      levelId,
      campusId,
      roomId,
      ensureEnrollment: true,
      preferTeacherClass: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "COURSE_ENROLLMENT_CONFLICT") {
      const conflict = await findStudentCourseEnrollment(studentId, courseId);
      return bad("Course enrollment conflict", 409, {
        code: "COURSE_CONFLICT",
        detail: conflict ? formatEnrollmentConflict(conflict) : undefined,
      });
    }
    return bad(msg || "Quick schedule failed", 500);
  }
  if (!cls) return bad("Failed to create class", 500);

  const dupSession = await prisma.session.findFirst({
    where: { classId: cls.id, startAt, endAt },
    select: { id: true },
  });
  if (!dupSession) {
    await prisma.session.create({
      data: { classId: cls.id, startAt, endAt, studentId, teacherId: teacherId === cls.teacherId ? null : teacherId },
    });
  }

  return Response.json({ ok: true });
}
