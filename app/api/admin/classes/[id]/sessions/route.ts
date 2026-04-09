import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { hasSchedulablePackage } from "@/lib/scheduling-package";
import { isSessionDuplicateError } from "@/lib/session-unique";
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
  schedulingStudentId?: string | null;
}) {
  const { classId, teacherId, roomId, startAt, endAt, schedulingStudentId } = opts;

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) return availErr;

  const dup = await prisma.session.findFirst({
    where: { classId, startAt, endAt },
    select: { id: true },
  });
  if (dup) return `Session already exists at ${ymd(startAt)} ${fmtHHMM(startAt)}-${fmtHHMM(endAt)}`;

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
      startAt: { lt: endAt },
      endAt: { gt: startAt },
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
    const roomSessionConflicts = await prisma.session.findMany({
      where: {
        class: { roomId },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
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
      return `Room conflict with session ${roomSessionConflict.id} (class ${roomSessionConflict.classId})`;
    }
  }

  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: classId } = await params;
  if (!classId) return bad("Missing classId");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { capacity: true },
  });
  if (!cls) return bad("Class not found", 404);

  const sessions = await prisma.session.findMany({
    where: {
      classId,
      ...(cls.capacity === 1
        ? {
            NOT: {
              attendances: {
                some: {
                  status: "EXCUSED",
                },
              },
            },
          }
        : {}),
    },
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
    include: { teacher: true, room: true, course: true, subject: true, level: true, enrollments: { select: { studentId: true } } },
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

  const expectedStudentIds =
    cls.capacity === 1 ? [studentId] : Array.from(new Set(cls.enrollments.map((e) => e.studentId).filter(Boolean)));
  const requiredHoursMinutes = cls.capacity === 1 ? durationMin : 1;
  for (const sid of expectedStudentIds) {
    const ok = await hasSchedulablePackage(prisma, {
      studentId: sid,
      courseId: cls.courseId,
      at: startAt,
      requiredHoursMinutes,
    });
    if (!ok) return bad(`Student ${sid} has no active package for this course`, 409, { code: "NO_ACTIVE_PACKAGE" });
  }

  const conflict = await findConflictForSession({
    classId,
    teacherId: cls.teacherId,
    roomId: cls.roomId ?? null,
    startAt,
    endAt,
    schedulingStudentId: cls.capacity === 1 ? studentId : null,
  });
  if (conflict) return bad(conflict, 409, { code: "CONFLICT" });

  let created;
  try {
    created = await prisma.session.create({
      data: { classId, startAt, endAt, studentId: cls.capacity === 1 ? studentId : null },
      include: { teacher: { select: { id: true, name: true } }, student: { select: { id: true, name: true } } },
    });
  } catch (error) {
    if (isSessionDuplicateError(error)) return bad("Session already exists at this time", 409, { code: "CONFLICT" });
    throw error;
  }

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
