import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
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

async function findTeacherConflict(opts: {
  teacherId: string;
  startAt: Date;
  endAt: Date;
  excludeSessionIds: string[];
  schedulingStudentId?: string | null;
}) {
  const { teacherId, startAt, endAt, excludeSessionIds, schedulingStudentId } = opts;

  const teacherSessionConflicts = await prisma.session.findMany({
    where: {
      id: excludeSessionIds.length ? { notIn: excludeSessionIds } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
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
      schedulingStudentId: s.studentId,
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
