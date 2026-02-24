import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";

const BIZ_TIMEZONE = "Asia/Shanghai";
const BIZ_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const YMD_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: BIZ_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HM_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: BIZ_TIMEZONE,
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
});

export type MonthlyScheduleQuery = {
  month: string;
  teacherId?: string;
  campusId?: string;
};

export function parseMonth(s?: string | null) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function toDateRange(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  // Convert month boundaries from business timezone (UTC+8) into UTC Date for DB queries.
  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0) - BIZ_UTC_OFFSET_MS);
  const end = new Date(Date.UTC(parsed.year, parsed.month, 1, 0, 0, 0, 0) - BIZ_UTC_OFFSET_MS);
  return { start, end };
}

export function fmtYMD(d: Date) {
  return YMD_FMT.format(d);
}

export function fmtHHMM(d: Date) {
  return HM_FMT.format(d);
}

export function startOfCalendar(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function buildCalendarDays(monthDate: Date) {
  const start = startOfCalendar(monthDate);
  return Array.from({ length: 42 }).map((_, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

export function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

export function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

export function resolveSessionStudentsForMonthlySchedule(session: any) {
  const cancelledSet = new Set(
    Array.isArray(session.attendances)
      ? session.attendances.filter((a: any) => a?.status === "EXCUSED").map((a: any) => a.studentId as string)
      : []
  );
  const enrolled = (session.class?.enrollments ?? []).map((e: any) => ({
    id: e.studentId as string,
    name: e.student?.name ?? "-",
  }));

  if (session.class?.capacity === 1) {
    const candidateId = (session.studentId as string | null) ?? (session.class?.oneOnOneStudent?.id as string | null) ?? (enrolled[0]?.id ?? null);
    const candidateName =
      (session.student?.name as string | null) ??
      (session.class?.oneOnOneStudent?.name as string | null) ??
      (candidateId ? enrolled.find((x: any) => x.id === candidateId)?.name ?? null : null);
    if (candidateId && cancelledSet.has(candidateId)) return { students: [] as string[], hidden: true };
    return { students: candidateName ? [candidateName] : [], hidden: false };
  }

  const students = enrolled.filter((x: any) => !cancelledSet.has(x.id)).map((x: any) => x.name);
  const hidden = enrolled.length > 0 && students.length === 0 && cancelledSet.size > 0;
  return { students, hidden };
}

export async function loadMonthlyScheduleData(query: MonthlyScheduleQuery) {
  const range = toDateRange(query.month);
  if (!range) return null;

  const teacherFilter = query.teacherId
    ? {
        OR: [
          { teacherId: query.teacherId },
          {
            teacherId: null as string | null,
            class: { teacherId: query.teacherId },
          },
        ],
      }
    : {};

  const campusFilter = query.campusId ? { class: { campusId: query.campusId } } : {};

  const [teachers, campuses, sessions] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.campus.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.session.findMany({
      where: {
        startAt: { gte: range.start, lt: range.end },
        ...teacherFilter,
        ...campusFilter,
      },
      include: {
        teacher: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        attendances: { select: { studentId: true, status: true } },
        class: {
          include: {
            teacher: { select: { id: true, name: true } },
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            campus: { select: { id: true, name: true } },
            room: { select: { name: true } },
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: {
              include: { student: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 5000,
    }),
  ]);

  return {
    range,
    teachers,
    campuses,
    sessions,
  };
}
