import { prisma } from "@/lib/prisma";
import { guardOpsReadAccess } from "@/lib/ops-auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(input: string) {
  const s = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function dayRangeLocal(base: Date) {
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function visibleStudentNames(session: any, includeExcused: boolean) {
  const excusedSet = new Set(
    Array.isArray(session.attendances)
      ? session.attendances.filter((a: any) => a?.status === "EXCUSED").map((a: any) => String(a.studentId))
      : [],
  );

  if (session.class?.capacity === 1) {
    const sid = session.student?.id ?? session.class?.oneOnOneStudent?.id ?? session.class?.enrollments?.[0]?.student?.id ?? null;
    if (!includeExcused && sid && excusedSet.has(String(sid))) return [];
    const one =
      session.student?.name ?? session.class?.oneOnOneStudent?.name ?? session.class?.enrollments?.[0]?.student?.name ?? null;
    return one ? [String(one)] : [];
  }

  const rows = Array.isArray(session.class?.enrollments) ? session.class.enrollments : [];
  return rows
    .filter((e: any) => includeExcused || !excusedSet.has(String(e.studentId)))
    .map((e: any) => e.student?.name)
    .filter(Boolean)
    .map((x: any) => String(x));
}

export async function GET(req: Request) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const dateStr = String(url.searchParams.get("date") ?? "").trim();
  const teacherId = String(url.searchParams.get("teacherId") ?? "").trim();
  const campusId = String(url.searchParams.get("campusId") ?? "").trim();
  const includeExcused = String(url.searchParams.get("includeExcused") ?? "false").toLowerCase() === "true";
  const hideFullyExcused = String(url.searchParams.get("hideFullyExcused") ?? "true").toLowerCase() !== "false";

  const base = dateStr ? parseDateOnly(dateStr) : new Date();
  if (!base) return bad("Invalid date, expected YYYY-MM-DD", 409, { date: dateStr });
  const { start, end } = dayRangeLocal(base);

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: start, lte: end },
      ...(teacherId
        ? {
            OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
          }
        : {}),
      ...(campusId ? { class: { campusId } } : {}),
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      student: { select: { id: true, name: true } },
      class: {
        include: {
          course: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          campus: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          teacher: { select: { id: true, name: true } },
          oneOnOneStudent: { select: { id: true, name: true } },
          enrollments: { include: { student: { select: { id: true, name: true } } } },
        },
      },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const items = sessions
    .map((s) => {
      const students = visibleStudentNames(s, includeExcused);
      const isHidden = hideFullyExcused && students.length === 0;
      return {
        id: s.id,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        teacher: {
          id: s.teacher?.id ?? s.class.teacher.id,
          name: s.teacher?.name ?? s.class.teacher.name,
        },
        class: {
          id: s.class.id,
          capacity: s.class.capacity,
          course: s.class.course.name,
          subject: s.class.subject?.name ?? null,
          level: s.class.level?.name ?? null,
        },
        campus: s.class.campus.name,
        room: s.class.room?.name ?? null,
        visibleStudents: students,
        visibleStudentCount: students.length,
        fullyExcusedOrEmpty: students.length === 0,
        _hidden: isHidden,
      };
    })
    .filter((x) => !x._hidden)
    .map(({ _hidden, ...rest }) => rest);

  return Response.json({
    ok: true,
    mode: "ui_consistent_teacher_today_rules",
    query: {
      date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      teacherId: teacherId || null,
      campusId: campusId || null,
      includeExcused,
      hideFullyExcused,
    },
    summary: {
      rawSessions: sessions.length,
      visibleSessions: items.length,
      visibleStudentCount: items.reduce((n, x) => n + x.visibleStudentCount, 0),
    },
    items,
  });
}
