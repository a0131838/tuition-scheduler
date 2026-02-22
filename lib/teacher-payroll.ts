import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const BIZ_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const PAYROLL_RATE_FALLBACK_KEY = "teacher_payroll_rates_v1";

export type PayrollRange = {
  start: Date;
  end: Date;
};

export type PayrollBreakdownRow = {
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  subjectId: string | null;
  subjectName: string | null;
  levelId: string | null;
  levelName: string | null;
  sessionCount: number;
  totalMinutes: number;
  totalHours: number;
  hourlyRateCents: number;
  amountCents: number;
};

export type PayrollTeacherSummary = {
  teacherId: string;
  teacherName: string;
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  totalAmountCents: number;
};

export type PayrollRateEditorRow = {
  teacherId: string;
  teacherName: string;
  courseId: string;
  courseName: string;
  subjectId: string | null;
  subjectName: string | null;
  levelId: string | null;
  levelName: string | null;
  hourlyRateCents: number;
  matchedSessions: number;
  matchedHours: number;
};

type PayrollRateItem = {
  teacherId: string;
  courseId: string;
  subjectId: string | null;
  levelId: string | null;
  hourlyRateCents: number;
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

function bizMidnightUtc(year: number, month1to12: number, day: number) {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0) - BIZ_UTC_OFFSET_MS);
}

export function toPayrollRange(month: string): PayrollRange | null {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const prevYear = parsed.month === 1 ? parsed.year - 1 : parsed.year;
  const prevMonth = parsed.month === 1 ? 12 : parsed.month - 1;
  const start = bizMidnightUtc(prevYear, prevMonth, 15);
  const end = bizMidnightUtc(parsed.year, parsed.month, 15);
  return { start, end };
}

function comboKey(teacherId: string, courseId: string, subjectId: string | null, levelId: string | null) {
  return `${teacherId}__${courseId}__${subjectId ?? ""}__${levelId ?? ""}`;
}

function toHours(totalMinutes: number) {
  return Number((totalMinutes / 60).toFixed(2));
}

function resolveRateCents(
  rateMap: Map<string, number>,
  teacherId: string,
  courseId: string,
  subjectId: string | null,
  levelId: string | null
) {
  const exact = rateMap.get(comboKey(teacherId, courseId, subjectId, levelId));
  if (typeof exact === "number") return exact;
  if (levelId) {
    const noLevel = rateMap.get(comboKey(teacherId, courseId, subjectId, null));
    if (typeof noLevel === "number") return noLevel;
  }
  if (subjectId || levelId) {
    const courseOnly = rateMap.get(comboKey(teacherId, courseId, null, null));
    if (typeof courseOnly === "number") return courseOnly;
  }
  return 0;
}

function isMissingRateTableError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

function parseFallbackRateItems(raw: string | null): PayrollRateItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: PayrollRateItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const x = item as Record<string, unknown>;
      const teacherId = typeof x.teacherId === "string" ? x.teacherId : "";
      const courseId = typeof x.courseId === "string" ? x.courseId : "";
      const subjectId = typeof x.subjectId === "string" && x.subjectId.trim() ? x.subjectId : null;
      const levelId = typeof x.levelId === "string" && x.levelId.trim() ? x.levelId : null;
      const hourlyRateCents = Number(x.hourlyRateCents);
      if (!teacherId || !courseId || !Number.isFinite(hourlyRateCents) || hourlyRateCents < 0) continue;
      out.push({
        teacherId,
        courseId,
        subjectId,
        levelId,
        hourlyRateCents: Math.round(hourlyRateCents),
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function loadFallbackRateItems() {
  const row = await prisma.appSetting.findUnique({
    where: { key: PAYROLL_RATE_FALLBACK_KEY },
    select: { value: true },
  });
  return parseFallbackRateItems(row?.value ?? null);
}

async function saveFallbackRateItem(nextItem: PayrollRateItem) {
  const items = await loadFallbackRateItems();
  const key = comboKey(nextItem.teacherId, nextItem.courseId, nextItem.subjectId, nextItem.levelId);
  const deduped = items.filter(
    (item) => comboKey(item.teacherId, item.courseId, item.subjectId, item.levelId) !== key
  );
  deduped.push(nextItem);
  await prisma.appSetting.upsert({
    where: { key: PAYROLL_RATE_FALLBACK_KEY },
    update: { value: JSON.stringify(deduped) },
    create: {
      key: PAYROLL_RATE_FALLBACK_KEY,
      value: JSON.stringify(deduped),
    },
  });
}

export async function upsertTeacherPayrollRate(input: PayrollRateItem) {
  const subjectKey = input.subjectId ?? "";
  const levelKey = input.levelId ?? "";
  try {
    await prisma.teacherCourseRate.upsert({
      where: {
        teacherId_courseId_subjectKey_levelKey: {
          teacherId: input.teacherId,
          courseId: input.courseId,
          subjectKey,
          levelKey,
        },
      },
      update: { hourlyRateCents: input.hourlyRateCents },
      create: {
        teacherId: input.teacherId,
        courseId: input.courseId,
        subjectId: input.subjectId,
        levelId: input.levelId,
        subjectKey,
        levelKey,
        hourlyRateCents: input.hourlyRateCents,
      },
    });
    return;
  } catch (err) {
    if (!isMissingRateTableError(err)) throw err;
  }
  await saveFallbackRateItem(input);
}

export async function loadTeacherPayroll(month: string) {
  const range = toPayrollRange(month);
  if (!range) return null;

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: range.start, lt: range.end },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      class: {
        select: {
          teacher: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          level: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 10000,
  });

  const teacherIds = new Set<string>();
  for (const s of sessions) {
    const effectiveTeacher = s.teacher ?? s.class.teacher;
    if (effectiveTeacher?.id) teacherIds.add(effectiveTeacher.id);
  }

  let rates: Array<{
    teacherId: string;
    courseId: string;
    subjectId: string | null;
    levelId: string | null;
    hourlyRateCents: number;
    teacher: { id: string; name: string };
    course: { id: string; name: string };
    subject: { id: string; name: string } | null;
    level: { id: string; name: string } | null;
  }> = [];
  let loadedFromTable = true;

  try {
    rates = await prisma.teacherCourseRate.findMany({
      where: {
        teacherId: { in: Array.from(teacherIds) },
      },
      include: {
        teacher: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        level: { select: { id: true, name: true } },
      },
      orderBy: [{ teacher: { name: "asc" } }, { course: { name: "asc" } }],
    });
  } catch (err) {
    if (!isMissingRateTableError(err)) throw err;
    loadedFromTable = false;
    const fallbackRates = await loadFallbackRateItems();

    const teacherMap = new Map<string, { id: string; name: string }>();
    const courseMap = new Map<string, { id: string; name: string }>();
    const subjectMap = new Map<string, { id: string; name: string }>();
    const levelMap = new Map<string, { id: string; name: string }>();

    for (const s of sessions) {
      const effectiveTeacher = s.teacher ?? s.class.teacher;
      if (effectiveTeacher) teacherMap.set(effectiveTeacher.id, effectiveTeacher);
      courseMap.set(s.class.course.id, s.class.course);
      if (s.class.subject) subjectMap.set(s.class.subject.id, s.class.subject);
      if (s.class.level) levelMap.set(s.class.level.id, s.class.level);
    }

    rates = fallbackRates
      .map((r) => {
        const teacher = teacherMap.get(r.teacherId);
        const course = courseMap.get(r.courseId);
        if (!teacher || !course) return null;
        return {
          teacherId: r.teacherId,
          courseId: r.courseId,
          subjectId: r.subjectId,
          levelId: r.levelId,
          hourlyRateCents: r.hourlyRateCents,
          teacher,
          course,
          subject: r.subjectId ? subjectMap.get(r.subjectId) ?? null : null,
          level: r.levelId ? levelMap.get(r.levelId) ?? null : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }

  const rateMap = new Map<string, number>();
  for (const r of rates) {
    rateMap.set(comboKey(r.teacherId, r.courseId, r.subjectId, r.levelId), r.hourlyRateCents);
  }

  const breakdownByCombo = new Map<string, PayrollBreakdownRow>();
  const teacherTotals = new Map<string, PayrollTeacherSummary>();

  for (const s of sessions) {
    const effectiveTeacher = s.teacher ?? s.class.teacher;
    if (!effectiveTeacher) continue;

    const totalMinutes = Math.max(0, Math.round((s.endAt.getTime() - s.startAt.getTime()) / 60000));
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) continue;

    const courseId = s.class.course.id;
    const courseName = s.class.course.name;
    const subjectId = s.class.subject?.id ?? null;
    const subjectName = s.class.subject?.name ?? null;
    const levelId = s.class.level?.id ?? null;
    const levelName = s.class.level?.name ?? null;

    const hourlyRateCents = resolveRateCents(rateMap, effectiveTeacher.id, courseId, subjectId, levelId);
    const amountCents = Math.round((totalMinutes * hourlyRateCents) / 60);

    const key = comboKey(effectiveTeacher.id, courseId, subjectId, levelId);
    const prev = breakdownByCombo.get(key);
    if (prev) {
      prev.sessionCount += 1;
      prev.totalMinutes += totalMinutes;
      prev.totalHours = toHours(prev.totalMinutes);
      prev.amountCents += amountCents;
    } else {
      breakdownByCombo.set(key, {
        teacherId: effectiveTeacher.id,
        teacherName: effectiveTeacher.name,
        courseId,
        courseName,
        subjectId,
        subjectName,
        levelId,
        levelName,
        sessionCount: 1,
        totalMinutes,
        totalHours: toHours(totalMinutes),
        hourlyRateCents,
        amountCents,
      });
    }

    const teacherPrev = teacherTotals.get(effectiveTeacher.id);
    if (teacherPrev) {
      teacherPrev.totalSessions += 1;
      teacherPrev.totalMinutes += totalMinutes;
      teacherPrev.totalHours = toHours(teacherPrev.totalMinutes);
      teacherPrev.totalAmountCents += amountCents;
    } else {
      teacherTotals.set(effectiveTeacher.id, {
        teacherId: effectiveTeacher.id,
        teacherName: effectiveTeacher.name,
        totalSessions: 1,
        totalMinutes,
        totalHours: toHours(totalMinutes),
        totalAmountCents: amountCents,
      });
    }
  }

  const breakdownRows = Array.from(breakdownByCombo.values()).sort((a, b) => {
    if (a.teacherName !== b.teacherName) return a.teacherName.localeCompare(b.teacherName);
    if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
    const aSubject = a.subjectName ?? "";
    const bSubject = b.subjectName ?? "";
    if (aSubject !== bSubject) return aSubject.localeCompare(bSubject);
    return (a.levelName ?? "").localeCompare(b.levelName ?? "");
  });

  const summaryRows = Array.from(teacherTotals.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName));

  const rateEditorMap = new Map<string, PayrollRateEditorRow>();
  for (const row of breakdownRows) {
    rateEditorMap.set(comboKey(row.teacherId, row.courseId, row.subjectId, row.levelId), {
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      courseId: row.courseId,
      courseName: row.courseName,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      levelId: row.levelId,
      levelName: row.levelName,
      hourlyRateCents: row.hourlyRateCents,
      matchedSessions: row.sessionCount,
      matchedHours: row.totalHours,
    });
  }

  for (const r of rates) {
    const key = comboKey(r.teacherId, r.courseId, r.subjectId, r.levelId);
    if (!rateEditorMap.has(key)) {
      rateEditorMap.set(key, {
        teacherId: r.teacherId,
        teacherName: r.teacher.name,
        courseId: r.courseId,
        courseName: r.course.name,
        subjectId: r.subjectId,
        subjectName: r.subject?.name ?? null,
        levelId: r.levelId,
        levelName: r.level?.name ?? null,
        hourlyRateCents: r.hourlyRateCents,
        matchedSessions: 0,
        matchedHours: 0,
      });
    }
  }

  const rateEditorRows = Array.from(rateEditorMap.values()).sort((a, b) => {
    if (a.teacherName !== b.teacherName) return a.teacherName.localeCompare(b.teacherName);
    if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
    const aSubject = a.subjectName ?? "";
    const bSubject = b.subjectName ?? "";
    if (aSubject !== bSubject) return aSubject.localeCompare(bSubject);
    return (a.levelName ?? "").localeCompare(b.levelName ?? "");
  });

  const grandTotalAmountCents = summaryRows.reduce((acc, row) => acc + row.totalAmountCents, 0);
  const grandTotalHours = Number(summaryRows.reduce((acc, row) => acc + row.totalHours, 0).toFixed(2));

  return {
    range,
    breakdownRows,
    summaryRows,
    rateEditorRows,
    grandTotalAmountCents,
    grandTotalHours,
    usingRateFallback: !loadedFromTable,
  };
}

export function formatMoneyCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export function formatComboLabel(courseName: string, subjectName: string | null, levelName: string | null) {
  return [courseName, subjectName, levelName].filter(Boolean).join(" / ");
}
