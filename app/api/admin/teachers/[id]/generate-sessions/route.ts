import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(s: string) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

type Occurrence = {
  templateId: string;
  classId: string;
  studentId: string;
  startAt: Date;
  endAt: Date;
};

async function computeGenerationPlan(teacherId: string, startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || start > end) {
    return { occurrences: [] as Occurrence[], conflicts: [] as any[], toCreate: [] as Occurrence[] };
  }

  const templates = await prisma.teacherOneOnOneTemplate.findMany({
    where: { teacherId },
    include: {
      class: { select: { id: true, roomId: true } },
    },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
  });

  const occurrences: Occurrence[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const weekday = d.getDay();
    for (const t of templates) {
      if (t.weekday !== weekday) continue;
      const startAt = new Date(d);
      startAt.setHours(0, 0, 0, 0);
      startAt.setMinutes(t.startMin);
      const endAt = new Date(startAt.getTime() + t.durationMin * 60000);
      occurrences.push({
        templateId: t.id,
        classId: t.classId,
        studentId: t.studentId,
        startAt,
        endAt,
      });
    }
  }

  const rangeStart = new Date(start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(end);
  rangeEnd.setHours(23, 59, 59, 999);

  const teacherSessions = await prisma.session.findMany({
    where: {
      startAt: { lte: rangeEnd },
      endAt: { gte: rangeStart },
      OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
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
      class: { select: { roomId: true, capacity: true, oneOnOneStudentId: true } },
    },
  });

  const roomIds = Array.from(new Set(templates.map((t) => t.class.roomId).filter(Boolean))) as string[];
  const roomSessions = roomIds.length
    ? await prisma.session.findMany({
        where: {
          startAt: { lte: rangeEnd },
          endAt: { gte: rangeStart },
          class: { roomId: { in: roomIds } },
        },
        include: { class: true },
      })
    : [];

  const appts = await prisma.appointment.findMany({
    where: {
      teacherId,
      startAt: { lte: rangeEnd },
      endAt: { gte: rangeStart },
    },
  });

  const conflicts: any[] = [];
  const toCreate: Occurrence[] = [];

  for (const occ of occurrences) {
    const dup = teacherSessions.find(
      (s) =>
        s.classId === occ.classId &&
        s.startAt.getTime() === occ.startAt.getTime() &&
        s.endAt.getTime() === occ.endAt.getTime() &&
        (s.studentId ?? null) === (occ.studentId ?? null)
    );
    if (dup) {
      conflicts.push({ occ, reason: "Duplicate session" });
      continue;
    }

    const teacherConflict = teacherSessions.find(
      (s) => overlaps(occ.startAt, occ.endAt, s.startAt, s.endAt) && !shouldIgnoreTeacherConflictSession(s, occ.studentId)
    );
    if (teacherConflict) {
      conflicts.push({ occ, reason: "Teacher conflict" });
      continue;
    }

    const roomId = templates.find((t) => t.id === occ.templateId)?.class.roomId;
    if (roomId) {
      const roomConflict = roomSessions.find((s) => s.class.roomId === roomId && overlaps(occ.startAt, occ.endAt, s.startAt, s.endAt));
      if (roomConflict) {
        conflicts.push({ occ, reason: "Room conflict" });
        continue;
      }
    }

    const apptConflict = appts.find((a) => overlaps(occ.startAt, occ.endAt, a.startAt, a.endAt));
    if (apptConflict) {
      conflicts.push({ occ, reason: "Appointment conflict" });
      continue;
    }

    toCreate.push(occ);
  }

  return { toCreate, conflicts };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await ctx.params;
  if (!teacherId) return bad("Missing teacherId", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const startDate = String(body?.startDate ?? "");
  const endDate = String(body?.endDate ?? "");
  if (!startDate || !endDate) return bad("Missing date range", 409);

  const { toCreate, conflicts } = await computeGenerationPlan(teacherId, startDate, endDate);
  if (toCreate.length > 0) {
    await prisma.session.createMany({
      data: toCreate.map((o) => ({
        classId: o.classId,
        startAt: o.startAt,
        endAt: o.endAt,
        studentId: o.studentId,
      })),
    });
  }

  return Response.json({
    ok: true,
    created: toCreate.length,
    conflicts: conflicts.length,
    message: `Generated ${toCreate.length} sessions. Skipped ${conflicts.length} conflicts.`,
  });
}
