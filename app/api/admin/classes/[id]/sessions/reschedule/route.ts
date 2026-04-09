import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { hasSchedulablePackage } from "@/lib/scheduling-package";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";

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

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  return checkTeacherSchedulingAvailability(prisma, teacherId, startAt, endAt);
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
  const startAtStr = String(body?.startAt ?? "");
  const durationMin = Number(body?.durationMin ?? 60);
  const scope = String(body?.scope ?? "single");

  if (!sessionId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }
  if (scope !== "single" && scope !== "future") return bad("Invalid scope");

  const newAnchorStart = new Date(startAtStr);
  if (Number.isNaN(newAnchorStart.getTime())) return bad("Invalid startAt");

  const anchor = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      class: { select: { id: true, capacity: true, teacherId: true, roomId: true, courseId: true, enrollments: { select: { studentId: true } } } },
    },
  });
  if (!anchor || anchor.classId !== classId) return bad("Session not found", 404);

  const targetSessions =
    scope === "future"
      ? await prisma.session.findMany({
          where: { classId, startAt: { gte: anchor.startAt } },
          include: { class: { select: { teacherId: true, roomId: true, capacity: true, courseId: true, enrollments: { select: { studentId: true } } } } },
          orderBy: { startAt: "asc" },
        })
      : [anchor];
  const targetIds = targetSessions.map((s) => s.id);
  const deltaMs = newAnchorStart.getTime() - anchor.startAt.getTime();

  const marked = await prisma.attendance.findFirst({
    where: {
      sessionId: { in: targetIds },
      status: { not: "UNMARKED" },
    },
    include: { session: { select: { startAt: true, endAt: true } } },
    orderBy: { session: { startAt: "asc" } },
  });
  if (marked?.session) {
    return bad(`Cannot reschedule marked session ${ymd(marked.session.startAt)} ${fmtHHMM(marked.session.startAt)}-${fmtHHMM(marked.session.endAt)}`, 409, {
      code: "ATTENDANCE_LOCKED",
    });
  }

  const planned = targetSessions.map((s) => {
    const startAt = scope === "future" ? new Date(s.startAt.getTime() + deltaMs) : newAnchorStart;
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    return { session: s, startAt, endAt };
  });

  for (const item of planned) {
    const s = item.session;
    const effectiveTeacherId = s.teacherId ?? s.class.teacherId;
    const roomId = s.class.roomId ?? null;
    const schedulingStudentId = s.studentId ?? null;

    const availErr = await checkTeacherAvailability(effectiveTeacherId, item.startAt, item.endAt);
    if (availErr) {
      return bad(`Availability conflict on ${ymd(item.startAt)} ${fmtHHMM(item.startAt)}-${fmtHHMM(item.endAt)}: ${availErr}`, 409, {
        code: "AVAIL_CONFLICT",
      });
    }

    const dup = await prisma.session.findFirst({
      where: {
        id: { notIn: targetIds },
        classId,
        startAt: item.startAt,
        endAt: item.endAt,
      },
      select: { id: true },
    });
    if (dup) {
      return bad(`Session already exists at ${ymd(item.startAt)} ${fmtHHMM(item.startAt)}-${fmtHHMM(item.endAt)}`, 409, { code: "DUPLICATE" });
    }

    const teacherSessionConflicts = await prisma.session.findMany({
      where: {
        id: { notIn: targetIds },
        OR: [{ teacherId: effectiveTeacherId }, { teacherId: null, class: { teacherId: effectiveTeacherId } }],
        startAt: { lt: item.endAt },
        endAt: { gt: item.startAt },
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
    const teacherSessionConflict = pickTeacherSessionConflict(teacherSessionConflicts, schedulingStudentId);
    if (teacherSessionConflict) {
      return bad(`Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`, 409, { code: "TEACHER_CONFLICT" });
    }

    const teacherApptConflict = await prisma.appointment.findFirst({
      where: {
        teacherId: effectiveTeacherId,
        startAt: { lt: item.endAt },
        endAt: { gt: item.startAt },
      },
      select: { startAt: true, endAt: true },
    });
    if (teacherApptConflict) {
      return bad(
        `Teacher conflict with appointment ${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(
          teacherApptConflict.endAt
        )}`,
        409,
        { code: "APPOINTMENT_CONFLICT" }
      );
    }

    if (roomId) {
      const roomSessionConflicts = await prisma.session.findMany({
        where: {
          id: { notIn: targetIds },
          class: { roomId },
          startAt: { lt: item.endAt },
          endAt: { gt: item.startAt },
        },
        select: {
          id: true,
          classId: true,
          studentId: true,
          class: { select: { capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
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
      const roomSessionConflict = pickTeacherSessionConflict(roomSessionConflicts);
      if (roomSessionConflict) {
        return bad(`Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`, 409, { code: "ROOM_CONFLICT" });
      }
    }

    const expectedStudentIds =
      s.class.capacity === 1 ? (s.studentId ? [s.studentId] : []) : Array.from(new Set(s.class.enrollments.map((e) => e.studentId).filter(Boolean)));
    const requiredHoursMinutes = s.class.capacity === 1 ? durationMin : 1;
    for (const sid of expectedStudentIds) {
      const ok = await hasSchedulablePackage(prisma, {
        studentId: sid,
        courseId: s.class.courseId,
        at: item.startAt,
        requiredHoursMinutes,
      });
      if (!ok) {
        return bad(`Student ${sid} has no active package for this course`, 409, { code: "NO_ACTIVE_PACKAGE" });
      }
    }
  }

  await prisma.$transaction(
    planned.map((item) =>
      prisma.session.update({
        where: { id: item.session.id },
        data: { startAt: item.startAt, endAt: item.endAt },
      })
    )
  );

  return Response.json({ ok: true, rescheduled: planned.length });
}
