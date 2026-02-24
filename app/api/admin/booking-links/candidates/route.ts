import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateOnly(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function fmtDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function hasLongEnoughSlot(
  teacherId: string,
  day: Date,
  durationMin: number,
  dateSlotMap: Map<string, number[]>,
  weeklySlotMap: Map<string, Map<number, number[]>>
) {
  const key = `${teacherId}|${fmtDateKey(day)}`;
  const dateSlots = dateSlotMap.get(key);
  if (dateSlots && dateSlots.length > 0) {
    return dateSlots.some((len) => len >= durationMin);
  }
  const byWeekday = weeklySlotMap.get(teacherId);
  if (!byWeekday) return false;
  const weekday = day.getDay();
  const weeklySlots = byWeekday.get(weekday) ?? [];
  return weeklySlots.some((len) => len >= durationMin);
}

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const studentId = String(searchParams.get("studentId") ?? "");
  const startDateRaw = String(searchParams.get("startDate") ?? "");
  const endDateRaw = String(searchParams.get("endDate") ?? "");
  const durationMin = Number(String(searchParams.get("durationMin") ?? "60"));

  if (!studentId) return bad("Missing studentId", 409);
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 240) {
    return bad("Invalid duration", 409);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      packages: {
        where: { status: "ACTIVE" },
        select: { courseId: true, course: { select: { name: true } } },
      },
    },
  });
  if (!student) return bad("Student not found", 404);

  const courseMap = new Map(student.packages.map((pkg) => [pkg.courseId, pkg.course.name]));
  const studentCourseIds = Array.from(courseMap.keys());
  if (studentCourseIds.length === 0) {
    return Response.json({
      ok: true,
      studentCourses: [],
      teachers: [],
      timeFiltered: Boolean(startDateRaw && endDateRaw),
    });
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      OR: [
        { subjectCourse: { courseId: { in: studentCourseIds } } },
        { subjects: { some: { courseId: { in: studentCourseIds } } } },
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      subjectCourse: { select: { courseId: true, course: { select: { name: true } } } },
      subjects: { select: { courseId: true, course: { select: { name: true } } } },
    },
  });

  const teacherIds = teachers.map((t) => t.id);
  let availableTeacherIdSet: Set<string> | null = null;

  if (startDateRaw && endDateRaw && teacherIds.length > 0) {
    const startDate = parseDateOnly(startDateRaw);
    const endDate = parseDateOnly(endDateRaw);
    if (!startDate || !endDate || endDate < startDate) return bad("Invalid date range", 409);

    const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    const [dateSlots, weeklySlots] = await Promise.all([
      prisma.teacherAvailabilityDate.findMany({
        where: {
          teacherId: { in: teacherIds },
          date: { gte: rangeStart, lte: rangeEnd },
        },
        select: { teacherId: true, date: true, startMin: true, endMin: true },
      }),
      prisma.teacherAvailability.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true, weekday: true, startMin: true, endMin: true },
      }),
    ]);

    const dateSlotMap = new Map<string, number[]>();
    for (const slot of dateSlots) {
      const key = `${slot.teacherId}|${fmtDateKey(slot.date)}`;
      const len = Math.max(0, slot.endMin - slot.startMin);
      if (!dateSlotMap.has(key)) dateSlotMap.set(key, []);
      dateSlotMap.get(key)!.push(len);
    }

    const weeklySlotMap = new Map<string, Map<number, number[]>>();
    for (const slot of weeklySlots) {
      if (!weeklySlotMap.has(slot.teacherId)) weeklySlotMap.set(slot.teacherId, new Map());
      const byWeekday = weeklySlotMap.get(slot.teacherId)!;
      if (!byWeekday.has(slot.weekday)) byWeekday.set(slot.weekday, []);
      byWeekday.get(slot.weekday)!.push(Math.max(0, slot.endMin - slot.startMin));
    }

    availableTeacherIdSet = new Set<string>();
    for (const teacherId of teacherIds) {
      let day = new Date(startDate);
      while (day <= endDate) {
        if (hasLongEnoughSlot(teacherId, day, durationMin, dateSlotMap, weeklySlotMap)) {
          availableTeacherIdSet.add(teacherId);
          break;
        }
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);
      }
    }
  }

  const teacherOptions = teachers
    .map((teacher) => {
      const tCourseMap = new Map<string, string>();
      if (teacher.subjectCourse) tCourseMap.set(teacher.subjectCourse.courseId, teacher.subjectCourse.course.name);
      for (const subject of teacher.subjects) tCourseMap.set(subject.courseId, subject.course.name);
      return {
        id: teacher.id,
        name: teacher.name,
        courseIds: Array.from(tCourseMap.keys()),
        courseNames: Array.from(tCourseMap.values()),
      };
    })
    .filter((t) => (availableTeacherIdSet ? availableTeacherIdSet.has(t.id) : true));

  return Response.json({
    ok: true,
    studentCourses: Array.from(courseMap.entries()).map(([id, name]) => ({ id, name })),
    teachers: teacherOptions,
    timeFiltered: Boolean(startDateRaw && endDateRaw),
  });
}

