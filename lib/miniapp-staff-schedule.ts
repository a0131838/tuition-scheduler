import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/date-only";

function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateOnly(input: string) {
  const s = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
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
      : []
  );

  if (session.class?.capacity === 1) {
    const sid = session.student?.id ?? session.class?.oneOnOneStudent?.id ?? session.class?.enrollments?.[0]?.student?.id ?? null;
    if (!includeExcused && sid && excusedSet.has(String(sid))) return [];
    const one = session.student?.name ?? session.class?.oneOnOneStudent?.name ?? session.class?.enrollments?.[0]?.student?.name ?? null;
    return one ? [String(one)] : [];
  }

  const rows = Array.isArray(session.class?.enrollments) ? session.class.enrollments : [];
  return rows
    .filter((e: any) => includeExcused || !excusedSet.has(String(e.studentId)))
    .map((e: any) => e.student?.name)
    .filter(Boolean)
    .map((x: any) => String(x));
}

function courseLabel(cls: any) {
  return [cls?.course?.name, cls?.subject?.name, cls?.level?.name].filter(Boolean).join(" / ") || "-";
}

export async function getStaffMiniappDailySchedule(input: {
  date?: string | null;
  teacherId?: string | null;
  includeExcused?: boolean;
  hideFullyExcused?: boolean;
}) {
  const base = input.date ? parseDateOnly(input.date) : new Date();
  if (!base) throw new Error("Invalid date, expected YYYY-MM-DD");

  const { start, end } = dayRangeLocal(base);
  const teacherId = String(input.teacherId ?? "").trim();
  const includeExcused = Boolean(input.includeExcused);
  const hideFullyExcused = input.hideFullyExcused !== false;

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: start, lte: end },
      ...(teacherId ? { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } : {}),
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      feedbacks: { select: { teacherId: true, submittedAt: true, status: true } },
      student: { select: { id: true, name: true } },
      class: {
        include: {
          course: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
          campus: { select: { id: true, name: true, isOnline: true } },
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
      const effectiveTeacherId = s.teacher?.id ?? s.class.teacher.id;
      const feedback = s.feedbacks.find((f) => f.teacherId === effectiveTeacherId) ?? null;
      const campusName = s.class.campus.name;
      const roomName = s.class.room?.name ?? null;
      return {
        id: s.id,
        classId: s.classId,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        startText: formatBusinessDateTime(s.startAt),
        endText: formatBusinessDateTime(s.endAt),
        timeText: `${formatBusinessDateTime(s.startAt)} - ${formatBusinessDateTime(s.endAt)}`,
        courseLabel: courseLabel(s.class),
        teacher: {
          id: effectiveTeacherId,
          name: s.teacher?.name ?? s.class.teacher.name,
        },
        campus: {
          id: s.class.campus.id,
          name: campusName,
          isOnline: s.class.campus.isOnline,
        },
        campusLabel: s.class.campus.isOnline ? "线上" : campusName,
        roomName,
        locationText: roomName ? `${campusName} · ${roomName}` : campusName,
        visibleStudents: students,
        studentText: students.join("、") || "-",
        visibleStudentCount: students.length,
        fullyExcusedOrEmpty: students.length === 0,
        attendanceSummary: s.attendances.reduce((acc: Record<string, number>, a) => {
          acc[a.status] = (acc[a.status] ?? 0) + 1;
          return acc;
        }, {}),
        feedbackStatus: feedback ? feedback.status : "NOT_SUBMITTED",
        feedbackLabel: feedback ? "已反馈" : "未反馈",
      };
    })
    .filter((x) => !(hideFullyExcused && x.visibleStudents.length === 0));

  return {
    date: ymd(start),
    items,
    summary: {
      rawSessions: sessions.length,
      visibleSessions: items.length,
      visibleStudentCount: items.reduce((n, x) => n + x.visibleStudentCount, 0),
      teachers: new Set(items.map((x) => x.teacher.id)).size,
    },
  };
}
