import { prisma } from "@/lib/prisma";
import { shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";

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

export function toMonthRange(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const start = new Date(parsed.year, parsed.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(parsed.year, parsed.month, 1, 0, 0, 0, 0);
  return { start, end };
}

export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function hhmm(min: number) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

type LinkTeacher = { teacherId: string; teacherName: string; subjectLabel?: string };

export type BookingSlot = {
  teacherId: string;
  teacherName: string;
  teacherSubjectLabel?: string;
  startAt: Date;
  endAt: Date;
  slotKey: string;
  dateKey: string;
  startLabel: string;
  endLabel: string;
};

export function bookingSlotKey(teacherId: string, startAt: Date, endAt: Date) {
  return `${teacherId}|${startAt.toISOString()}|${endAt.toISOString()}`;
}

export async function listBookingSlotsForMonth(opts: {
  linkId: string;
  teachers: LinkTeacher[];
  startDate: Date;
  endDate: Date;
  durationMin: number;
  stepMin?: number;
  month: string;
  selectedSlotSet?: Set<string>;
  onlySelectedSlots?: boolean;
}) {
  const monthRange = toMonthRange(opts.month);
  if (!monthRange) return null;

  const windowStart = new Date(Math.max(monthRange.start.getTime(), opts.startDate.getTime()));
  const windowEnd = new Date(Math.min(monthRange.end.getTime(), new Date(opts.endDate.getTime() + 24 * 60 * 60 * 1000).getTime()));
  if (windowStart >= windowEnd) {
    return { slots: [] as BookingSlot[], monthRange };
  }

  const teacherIds = opts.teachers.map((x) => x.teacherId);
  if (teacherIds.length === 0) return { slots: [] as BookingSlot[], monthRange };
  const stepMin = Number.isFinite(opts.stepMin) ? Math.max(5, Math.floor(opts.stepMin as number)) : opts.durationMin;
  const teacherNameMap = new Map(opts.teachers.map((x) => [x.teacherId, x.teacherName]));
  const teacherSubjectLabelMap = new Map(opts.teachers.map((x) => [x.teacherId, x.subjectLabel ?? ""]));

  const [dateSlots, weeklySlots, sessions, appointments] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      where: { teacherId: { in: teacherIds }, date: { gte: windowStart, lt: windowEnd } },
      orderBy: [{ teacherId: "asc" }, { date: "asc" }, { startMin: "asc" }],
    }),
    prisma.teacherAvailability.findMany({
      where: { teacherId: { in: teacherIds } },
      orderBy: [{ teacherId: "asc" }, { weekday: "asc" }, { startMin: "asc" }],
    }),
    prisma.session.findMany({
      where: {
        startAt: { lt: windowEnd },
        endAt: { gt: windowStart },
        OR: [{ teacherId: { in: teacherIds } }, { teacherId: null, class: { teacherId: { in: teacherIds } } }],
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        teacherId: true,
        studentId: true,
        attendances: {
          select: {
            studentId: true,
            status: true,
            excusedCharge: true,
            deductedMinutes: true,
            deductedCount: true,
          },
        },
        class: { select: { teacherId: true, capacity: true, oneOnOneStudentId: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { teacherId: { in: teacherIds }, startAt: { lt: windowEnd }, endAt: { gt: windowStart } },
      select: { teacherId: true, startAt: true, endAt: true },
    }),
  ]);

  const dateMap = new Map<string, { startMin: number; endMin: number }[]>();
  for (const s of dateSlots) {
    const key = `${s.teacherId}|${ymd(new Date(s.date))}`;
    const arr = dateMap.get(key) ?? [];
    arr.push({ startMin: s.startMin, endMin: s.endMin });
    dateMap.set(key, arr);
  }

  const weeklyMap = new Map<string, { startMin: number; endMin: number }[]>();
  for (const s of weeklySlots) {
    const key = `${s.teacherId}|${s.weekday}`;
    const arr = weeklyMap.get(key) ?? [];
    arr.push({ startMin: s.startMin, endMin: s.endMin });
    weeklyMap.set(key, arr);
  }

  const busyByTeacher = new Map<string, { startAt: Date; endAt: Date }[]>();
  for (const s of sessions) {
    if (shouldIgnoreTeacherConflictSession(s)) continue;
    const teacherId = s.teacherId ?? s.class.teacherId;
    if (!teacherId) continue;
    const arr = busyByTeacher.get(teacherId) ?? [];
    arr.push({ startAt: new Date(s.startAt), endAt: new Date(s.endAt) });
    busyByTeacher.set(teacherId, arr);
  }
  for (const a of appointments) {
    const arr = busyByTeacher.get(a.teacherId) ?? [];
    arr.push({ startAt: new Date(a.startAt), endAt: new Date(a.endAt) });
    busyByTeacher.set(a.teacherId, arr);
  }

  const existingRequests = await prisma.studentBookingRequest.findMany({
    where: {
      teacherId: { in: teacherIds },
      status: { in: ["PENDING", "APPROVED"] },
      startAt: { gte: windowStart, lt: windowEnd },
    },
    select: { teacherId: true, startAt: true, endAt: true },
  });
  const requestedSet = new Set(
    existingRequests.map((x) => `${x.teacherId}|${new Date(x.startAt).toISOString()}|${new Date(x.endAt).toISOString()}`)
  );

  const out: BookingSlot[] = [];
  const dayStart = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate(), 0, 0, 0, 0);
  for (let d = new Date(dayStart); d < windowEnd; d.setDate(d.getDate() + 1)) {
    const dateKey = ymd(d);
    const weekday = d.getDay();
    for (const teacherId of teacherIds) {
      const specific = dateMap.get(`${teacherId}|${dateKey}`);
      const weekly = weeklyMap.get(`${teacherId}|${weekday}`) ?? [];
      const ranges = specific && specific.length > 0 ? specific : weekly;
      if (ranges.length === 0) continue;

      const busy = busyByTeacher.get(teacherId) ?? [];
      for (const r of ranges) {
        for (let m = r.startMin; m + opts.durationMin <= r.endMin; m += stepMin) {
          const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
          startAt.setMinutes(m);
          const endAt = new Date(startAt.getTime() + opts.durationMin * 60000);
          if (startAt < windowStart || endAt > windowEnd) continue;
          if (busy.some((b) => rangesOverlap(startAt, endAt, b.startAt, b.endAt))) continue;
          const requestKey = `${teacherId}|${startAt.toISOString()}|${endAt.toISOString()}`;
          if (requestedSet.has(requestKey)) continue;
          const slotKey = bookingSlotKey(teacherId, startAt, endAt);
          if (opts.onlySelectedSlots && opts.selectedSlotSet && !opts.selectedSlotSet.has(slotKey)) continue;
          out.push({
            teacherId,
            teacherName: teacherNameMap.get(teacherId) ?? teacherId,
            teacherSubjectLabel: teacherSubjectLabelMap.get(teacherId) || undefined,
            startAt,
            endAt,
            slotKey,
            dateKey,
            startLabel: hhmm(minutesOfDay(startAt)),
            endLabel: hhmm(minutesOfDay(endAt)),
          });
        }
      }
    }
  }

  out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.teacherName.localeCompare(b.teacherName));
  return { slots: out, monthRange };
}
