import { Prisma } from "@prisma/client";
import {
  formatBusinessDateOnly,
  formatBusinessTimeOnly,
  parseBusinessDateEnd,
  parseBusinessDateStart,
} from "@/lib/date-only";
import { MOBILE_SCHEDULING_TICKET_TYPES } from "@/lib/miniapp-scheduling-coordination-board";
import { prisma } from "@/lib/prisma";
import { shouldIgnoreTeacherConflictSession } from "@/lib/session-conflict";
import { getVisibleSessionStudents, isSessionFullyCancelled } from "@/lib/session-students";

const MAX_RANGE_DAYS = 42;
const CLOSED_TICKET_STATUSES = ["Completed", "Cancelled", "Archived"];

const calendarSessionInclude = Prisma.validator<Prisma.SessionInclude>()({
  attendances: { select: { studentId: true, status: true } },
  student: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true } },
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
});

type CalendarSession = Prisma.SessionGetPayload<{ include: typeof calendarSessionInclude }>;

export type CalendarConflictSource = {
  id: string;
  startAt: Date;
  endAt: Date;
  teacherId: string;
  roomId: string | null;
  studentIds: string[];
};

function overlap(a: CalendarConflictSource, b: CalendarConflictSource) {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

export function buildCalendarConflictMap(rows: CalendarConflictSource[]) {
  const map = new Map<string, Set<string>>();
  const add = (id: string, reason: string) => {
    const reasons = map.get(id) ?? new Set<string>();
    reasons.add(reason);
    map.set(id, reasons);
  };
  const sorted = [...rows].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    for (let j = i + 1; j < sorted.length; j += 1) {
      const next = sorted[j];
      if (next.startAt >= current.endAt) break;
      if (!overlap(current, next)) continue;
      if (current.teacherId === next.teacherId) {
        add(current.id, "老师时间重叠");
        add(next.id, "老师时间重叠");
      }
      if (current.roomId && current.roomId === next.roomId) {
        add(current.id, "教室时间重叠");
        add(next.id, "教室时间重叠");
      }
      if (current.studentIds.some((id) => next.studentIds.includes(id))) {
        add(current.id, "学生时间重叠");
        add(next.id, "学生时间重叠");
      }
    }
  }
  return map;
}

export function subtractBusyTime(
  slots: Array<{ startMin: number; endMin: number }>,
  busy: Array<{ startMin: number; endMin: number }>,
) {
  const mergedBusy = [...busy]
    .sort((a, b) => a.startMin - b.startMin)
    .reduce<Array<{ startMin: number; endMin: number }>>((result, row) => {
      const last = result[result.length - 1];
      if (last && row.startMin <= last.endMin) last.endMin = Math.max(last.endMin, row.endMin);
      else result.push({ ...row });
      return result;
    }, []);

  return slots.flatMap((slot) => {
    const result: Array<{ startMin: number; endMin: number }> = [];
    let cursor = slot.startMin;
    for (const row of mergedBusy) {
      if (row.endMin <= cursor || row.startMin >= slot.endMin) continue;
      if (row.startMin > cursor) result.push({ startMin: cursor, endMin: Math.min(row.startMin, slot.endMin) });
      cursor = Math.max(cursor, row.endMin);
      if (cursor >= slot.endMin) break;
    }
    if (cursor < slot.endMin) result.push({ startMin: cursor, endMin: slot.endMin });
    return result.filter((row) => row.endMin - row.startMin >= 15);
  });
}

function minutes(value: Date) {
  const text = formatBusinessTimeOnly(value);
  const [hour, minute] = text.split(":").map(Number);
  return hour * 60 + minute;
}

function courseLabel(session: CalendarSession) {
  return [session.class.course.name, session.class.subject?.name, session.class.level?.name]
    .filter(Boolean)
    .join(" / ");
}

function dayKeys(from: Date, count: number) {
  return Array.from({ length: count }, (_, index) =>
    formatBusinessDateOnly(new Date(from.getTime() + index * 24 * 60 * 60 * 1000)),
  );
}

export async function getStaffMiniappScheduleCalendar(input: {
  from: string;
  to: string;
  teacherId?: string | null;
  campusId?: string | null;
  courseId?: string | null;
  studentQuery?: string | null;
}) {
  const start = parseBusinessDateStart(input.from);
  const end = parseBusinessDateEnd(input.to);
  if (!start || !end || end < start) throw new Error("Invalid calendar date range");
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (rangeDays > MAX_RANGE_DAYS) throw new Error(`Calendar range cannot exceed ${MAX_RANGE_DAYS} days`);

  const teacherId = String(input.teacherId ?? "").trim();
  const campusId = String(input.campusId ?? "").trim();
  const courseId = String(input.courseId ?? "").trim();
  const studentQuery = String(input.studentQuery ?? "").trim().toLocaleLowerCase();
  const classFilter = {
    ...(campusId ? { campusId } : {}),
    ...(courseId ? { courseId } : {}),
  };

  const [rawSessions, teachers, campuses, courses, availabilityRows, teacherBusySessions, tickets] = await Promise.all([
    prisma.session.findMany({
      where: {
        startAt: { gte: start, lte: end },
        ...(teacherId ? { OR: [{ teacherId }, { teacherId: null, class: { teacherId } }] } : {}),
        ...(Object.keys(classFilter).length ? { class: classFilter } : {}),
      },
      include: calendarSessionInclude,
      orderBy: { startAt: "asc" },
    }),
    prisma.teacher.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campus.findMany({ select: { id: true, name: true, isOnline: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    teacherId
      ? prisma.teacherAvailabilityDate.findMany({
          where: { teacherId, date: { gte: start, lte: end } },
          select: { date: true, startMin: true, endMin: true },
          orderBy: [{ date: "asc" }, { startMin: "asc" }],
        })
      : Promise.resolve([]),
    teacherId
      ? prisma.session.findMany({
          where: {
            startAt: { gte: start, lte: end },
            OR: [{ teacherId }, { teacherId: null, class: { teacherId } }],
          },
          select: {
            startAt: true,
            endAt: true,
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
            class: {
              select: {
                capacity: true,
                oneOnOneStudentId: true,
                enrollments: { select: { studentId: true } },
              },
            },
          },
          orderBy: { startAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.ticket.findMany({
      where: {
        type: { in: [...MOBILE_SCHEDULING_TICKET_TYPES] },
        isArchived: false,
        status: { notIn: CLOSED_TICKET_STATUSES },
        nextActionDue: { gte: start, lte: end },
      },
      select: { id: true, nextActionDue: true },
    }),
  ]);

  const sessions = rawSessions.filter((session) => !isSessionFullyCancelled(session)).filter((session) => {
    if (!studentQuery) return true;
    return getVisibleSessionStudents(session).some((student) =>
      String(student.name ?? "").toLocaleLowerCase().includes(studentQuery),
    );
  });
  const conflictSources = sessions.map((session) => ({
    id: session.id,
    startAt: session.startAt,
    endAt: session.endAt,
    teacherId: session.teacherId ?? session.class.teacherId,
    roomId: session.class.roomId,
    studentIds: getVisibleSessionStudents(session).map((student) => student.id),
  }));
  const conflicts = buildCalendarConflictMap(conflictSources);
  const items = sessions.map((session) => {
    const teacher = session.teacher ?? session.class.teacher;
    const students = getVisibleSessionStudents(session);
    const conflictReasons = Array.from(conflicts.get(session.id) ?? []);
    const campus = session.class.campus;
    const room = session.class.room;
    return {
      id: session.id,
      date: formatBusinessDateOnly(session.startAt),
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      startTime: formatBusinessTimeOnly(session.startAt),
      endTime: formatBusinessTimeOnly(session.endAt),
      startMin: minutes(session.startAt),
      endMin: minutes(session.endAt),
      courseId: session.class.course.id,
      courseLabel: courseLabel(session),
      teacherId: teacher.id,
      teacherName: teacher.name,
      campusId: campus.id,
      campusLabel: campus.isOnline ? "线上" : campus.name,
      roomName: room?.name ?? "",
      locationText: room ? `${campus.name} · ${room.name}` : campus.name,
      students: students.map((student) => ({ id: student.id, name: student.name ?? "-" })),
      studentText: students.map((student) => student.name).filter(Boolean).join("、") || "-",
      conflictCount: conflictReasons.length,
      conflictReasons,
    };
  });

  const sessionsByDate = new Map<string, typeof items>();
  for (const item of items) sessionsByDate.set(item.date, [...(sessionsByDate.get(item.date) ?? []), item]);
  const coordinationByDate = new Map<string, number>();
  for (const ticket of tickets) {
    if (!ticket.nextActionDue) continue;
    const key = formatBusinessDateOnly(ticket.nextActionDue);
    coordinationByDate.set(key, (coordinationByDate.get(key) ?? 0) + 1);
  }
  const availabilityByDate = new Map<string, Array<{ startMin: number; endMin: number }>>();
  for (const row of availabilityRows) {
    const key = formatBusinessDateOnly(row.date);
    availabilityByDate.set(key, [...(availabilityByDate.get(key) ?? []), { startMin: row.startMin, endMin: row.endMin }]);
  }
  const teacherBusyByDate = new Map<string, Array<{ startMin: number; endMin: number }>>();
  for (const session of teacherBusySessions) {
    if (shouldIgnoreTeacherConflictSession(session)) continue;
    const key = formatBusinessDateOnly(session.startAt);
    teacherBusyByDate.set(key, [
      ...(teacherBusyByDate.get(key) ?? []),
      { startMin: minutes(session.startAt), endMin: minutes(session.endAt) },
    ]);
  }
  const availability = dayKeys(start, rangeDays).flatMap((date) => {
    const slots = availabilityByDate.get(date) ?? [];
    const busy = teacherBusyByDate.get(date) ?? [];
    return subtractBusyTime(slots, busy).map((slot) => ({
      date,
      ...slot,
      startTime: `${String(Math.floor(slot.startMin / 60)).padStart(2, "0")}:${String(slot.startMin % 60).padStart(2, "0")}`,
      endTime: `${String(Math.floor(slot.endMin / 60)).padStart(2, "0")}:${String(slot.endMin % 60).padStart(2, "0")}`,
    }));
  });

  return {
    range: { from: input.from, to: input.to, days: rangeDays },
    filters: { teachers, campuses, courses },
    sessions: items,
    availability,
    days: dayKeys(start, rangeDays).map((date) => {
      const daySessions = sessionsByDate.get(date) ?? [];
      return {
        date,
        sessionCount: daySessions.length,
        studentCount: new Set(daySessions.flatMap((item) => item.students.map((student) => student.id))).size,
        teacherCount: new Set(daySessions.map((item) => item.teacherId)).size,
        conflictCount: daySessions.filter((item) => item.conflictCount > 0).length,
        coordinationCount: coordinationByDate.get(date) ?? 0,
        availabilityCount: availability.filter((slot) => slot.date === date).length,
      };
    }),
  };
}
