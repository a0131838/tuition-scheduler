import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { pickTeacherSessionConflict } from "@/lib/session-conflict";
import { checkTeacherSchedulingAvailability } from "@/lib/teacher-scheduling-availability";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDatetimeLocal(s: string) {
  const [date, time] = String(s || "").split("T");
  const [Y, M, D] = String(date || "").split("-").map(Number);
  const [hh, mm] = String(time || "").split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function checkTeacherAvailability(teacherId: string, startAt: Date, endAt: Date) {
  return checkTeacherSchedulingAvailability(prisma, teacherId, startAt, endAt);
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const teacherId = String(body?.teacherId ?? "");
  const studentId = String(body?.studentId ?? "");
  const startAtStr = String(body?.startAt ?? "");
  const durationMin = Number(body?.durationMin ?? 60);

  if (!teacherId || !studentId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
    return bad("Invalid input");
  }

  const startAt = parseDatetimeLocal(startAtStr);
  if (Number.isNaN(startAt.getTime())) return bad("Invalid startAt");
  const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

  const availErr = await checkTeacherAvailability(teacherId, startAt, endAt);
  if (availErr) return bad(availErr, 409, { code: "AVAIL_CONFLICT" });

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
  const teacherSessionConflict = pickTeacherSessionConflict(teacherSessionConflicts, studentId);
  if (teacherSessionConflict) {
    return bad(
      `Teacher conflict with session ${teacherSessionConflict.id} (class ${teacherSessionConflict.classId})`,
      409,
      { code: "TIME_CONFLICT" }
    );
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
    const timeLabel = `${ymd(teacherApptConflict.startAt)} ${fmtHHMM(teacherApptConflict.startAt)}-${fmtHHMM(teacherApptConflict.endAt)}`;
    return bad(`Teacher conflict with appointment ${timeLabel}`, 409, { code: "TIME_CONFLICT" });
  }

  const created = await prisma.appointment.create({
    data: { teacherId, studentId, startAt, endAt, mode: "OFFLINE" },
  });

  return Response.json(
    {
      ok: true,
      appointment: { id: created.id, teacherId, startAt: created.startAt.toISOString(), endAt: created.endAt.toISOString() },
    },
    { status: 201 }
  );
}
