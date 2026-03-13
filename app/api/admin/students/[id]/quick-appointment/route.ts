import { prisma } from "@/lib/prisma";
import { isStrictSuperAdmin, requireAdmin } from "@/lib/auth";
import { getOrCreateOneOnOneClassForStudent } from "@/lib/oneOnOne";
import { findStudentCourseEnrollment, formatEnrollmentConflict } from "@/lib/enrollment-conflict";
import { hasSchedulablePackage } from "@/lib/scheduling-package";
import { pickTeacherSessionConflict, shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";
import { campusRequiresRoom } from "@/lib/campus";

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
  const mode = String(body?.mode ?? "create");
  const repeatWeeksRaw = Number(body?.repeatWeeks ?? 1);
  const repeatWeeks = Number.isFinite(repeatWeeksRaw) ? Math.max(1, Math.min(16, Math.floor(repeatWeeksRaw))) : 1;
  const onConflict = String(body?.onConflict ?? "reject");

  if (!teacherId || !subjectId || !campusId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }
  if (mode !== "create" && mode !== "preview") return bad("Invalid mode");
  if (onConflict !== "reject" && onConflict !== "skip") return bad("Invalid onConflict");

  const roomId = roomIdRaw || null;
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) return bad("Campus not found", 404);
  if (!roomId && campusRequiresRoom(campus)) return bad("Room is required", 409);
  if (roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.campusId !== campusId) return bad("Invalid room", 409);
  }

  const startAt = parseDatetimeLocal(startAtStr);
  if (Number.isNaN(startAt.getTime())) return bad("Invalid startAt", 409);

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { subjects: true },
  });
  if (!teacher) return bad("Teacher not found", 404);
  if (!canTeachSubject(teacher, subjectId)) return bad("Teacher cannot teach this course", 409);

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
      const conflict = await findStudentCourseEnrollment(studentId, courseId, undefined, subjectId, teacherId);
      return bad("Course enrollment conflict", 409, {
        code: "COURSE_CONFLICT",
        detail: conflict ? formatEnrollmentConflict(conflict) : undefined,
      });
    }
    return bad(msg || "Quick schedule failed", 500);
  }
  if (!cls) return bad("Failed to create class", 500);

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const rows: Array<{ index: number; startAt: string; endAt: string; ok: boolean; reason?: string; created?: boolean }> = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < repeatWeeks; i++) {
    const currentStart = new Date(startAt.getTime() + i * oneWeekMs);
    const currentEnd = new Date(currentStart.getTime() + durationMin * 60 * 1000);
    let reason = "";

    if (!bypassAvailabilityCheck) {
      const availErr = await checkTeacherAvailability(teacherId, currentStart, currentEnd);
      if (availErr) reason = availErr;
    }

    if (!reason) {
      const teacherSessionConflicts = await prisma.session.findMany({
        where: {
          OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
          startAt: { lt: currentEnd },
          endAt: { gt: currentStart },
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
      if (teacherSessionConflict) reason = `Teacher conflict: ${formatSessionConflictLabel(teacherSessionConflict)}`;
    }

    if (!reason) {
      const teacherApptConflict = await prisma.appointment.findFirst({
        where: {
          teacherId,
          startAt: { lt: currentEnd },
          endAt: { gt: currentStart },
        },
        select: { startAt: true, endAt: true },
      });
      if (teacherApptConflict) {
        const timeLabel = `${fmtDateInput(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
          teacherApptConflict.endAt
        )}`;
        reason = `Teacher conflict: appointment ${timeLabel}`;
      }
    }

    if (!reason && roomId) {
      const roomConflicts = await prisma.session.findMany({
        where: {
          class: { roomId },
          startAt: { lt: currentEnd },
          endAt: { gt: currentStart },
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
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              teacher: true,
              campus: true,
              room: true,
              enrollments: { select: { studentId: true } },
            },
          },
        },
      });
      const roomConflict = pickTeacherSessionConflict(roomConflicts);
      if (roomConflict) reason = `Room conflict: ${formatSessionConflictLabel(roomConflict)}`;
    }

    if (!reason) {
      const packageCheckAt = currentStart.getTime() < Date.now() ? new Date() : currentStart;
      const hasPackage = await hasSchedulablePackage(prisma, {
        studentId,
        courseId,
        at: packageCheckAt,
        requiredHoursMinutes: durationMin,
      });
      if (!hasPackage) reason = "No active package for this course";
    }

    if (!reason) {
      const dupSession = await prisma.session.findFirst({
        where: { classId: cls.id, startAt: currentStart, endAt: currentEnd },
        select: { id: true },
      });
      if (dupSession) reason = "Session already exists at this time";
    }

    if (reason) {
      rows.push({
        index: i + 1,
        startAt: currentStart.toISOString(),
        endAt: currentEnd.toISOString(),
        ok: false,
        reason,
      });
      if (mode === "create" && onConflict === "reject") {
        return bad(reason, 409);
      }
      skipped++;
      continue;
    }

    if (mode === "create") {
      await prisma.session.create({
        data: {
          classId: cls.id,
          startAt: currentStart,
          endAt: currentEnd,
          studentId,
          teacherId: teacherId === cls.teacherId ? null : teacherId,
        },
      });
      created++;
      rows.push({
        index: i + 1,
        startAt: currentStart.toISOString(),
        endAt: currentEnd.toISOString(),
        ok: true,
        created: true,
      });
    } else {
      rows.push({
        index: i + 1,
        startAt: currentStart.toISOString(),
        endAt: currentEnd.toISOString(),
        ok: true,
      });
    }
  }

  return Response.json({
    ok: true,
    mode,
    created,
    skipped,
    total: repeatWeeks,
    rows,
  });
}
