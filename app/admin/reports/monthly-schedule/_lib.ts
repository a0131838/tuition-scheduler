import { prisma } from "@/lib/prisma";
import type { Lang } from "@/lib/i18n";

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
  const start = new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(parsed.year, parsed.month, 1, 0, 0, 0, 0);
  return { start, end };
}

export function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function fmtHHMM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
        class: {
          include: {
            teacher: { select: { id: true, name: true } },
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            campus: { select: { id: true, name: true } },
            room: { select: { name: true } },
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
