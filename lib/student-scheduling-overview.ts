import { prisma } from "./prisma";
import { sessionBelongsToStudentsWhere } from "./session-students";
import { sessionIncludesStudent } from "./session-conflict";

export type StudentScheduleSummary = {
  lastAttended: string | null;
  nextLesson: string | null;
  neverScheduled: boolean;
  needsScheduling: boolean;
  missingSubjects: string[];
};

export function lessonRecordStatus(status: string | undefined, endAt: Date, now: Date) {
  if (status === "EXCUSED") return "CANCELLED";
  if (status === "PRESENT" || status === "LATE") return "ATTENDED";
  if (status === "ABSENT") return "ABSENT";
  return endAt <= now ? "UNMARKED" : "SCHEDULED";
}

export async function studentSchedulingOverview(studentIds: string[], now = new Date()) {
  const result = new Map<string, StudentScheduleSummary>();
  if (!studentIds.length) return result;
  const sessions = await prisma.session.findMany({
    where: { OR: [sessionBelongsToStudentsWhere(studentIds), { attendances: { some: { studentId: { in: studentIds } } } }] },
    select: {
      id: true, studentId: true, startAt: true, endAt: true,
      class: { select: { capacity: true, courseId: true, subjectId: true, oneOnOneStudentId: true,
        enrollments: { select: { studentId: true } } } },
      attendances: { select: { studentId: true, status: true } },
    },
    orderBy: { startAt: "asc" },
  });
  const packages = await prisma.coursePackage.findMany({ where: {
    status: "ACTIVE", validFrom: { lte: now },
    AND: [{ OR: [{ validTo: null }, { validTo: { gte: now } }] },
      { OR: [{ type: "MONTHLY" }, { remainingMinutes: { gt: 0 } }] },
      { OR: [{ studentId: { in: studentIds } }, { sharedStudents: { some: { studentId: { in: studentIds } } } }] }],
  }, select: { studentId: true, courseId: true, course: { select: { name: true } },
    sharedStudents: { select: { studentId: true } }, sharedCourses: { select: { courseId: true, course: { select: { name: true } } } } } });
  const enrollments = await prisma.enrollment.findMany({ where: { studentId: { in: studentIds } },
    select: { studentId: true, class: { select: { courseId: true, subjectId: true, subject: { select: { name: true } } } } } });
  const businessMonth = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 7);
  const paused = await prisma.monthlySchedulingItem.findMany({ where: {
    studentId: { in: studentIds }, status: { in: ["PAUSED", "EXCLUDED"] }, campaign: { month: new Date(`${businessMonth}-01T00:00:00+08:00`) },
  }, select: { studentId: true, courseId: true } });
  for (const studentId of studentIds) {
    const own = sessions.filter((s) => sessionIncludesStudent(s, studentId));
    const attended = own.filter((s) => s.endAt <= now && ["PRESENT", "LATE"].includes(s.attendances.find((a) => a.studentId === studentId)?.status ?? ""));
    const future = own.filter((s) => s.startAt >= now && !["EXCUSED", "ABSENT"].includes(s.attendances.find((a) => a.studentId === studentId)?.status ?? ""));
    const courses = new Map<string, string>();
    for (const p of packages.filter((p) => p.studentId === studentId || p.sharedStudents.some((s) => s.studentId === studentId))) {
      courses.set(p.courseId, p.course.name);
      for (const c of p.sharedCourses) courses.set(c.courseId, c.course.name);
    }
    const missingSubjects: string[] = [];
    for (const [courseId, courseName] of courses) {
      if (paused.some((p) => p.studentId === studentId && p.courseId === courseId)) continue;
      const subjects = new Map(enrollments.filter((e) => e.studentId === studentId && e.class.courseId === courseId)
        .map((e) => [e.class.subjectId, e.class.subject?.name ?? courseName]));
      if (!subjects.size) subjects.set(null, courseName);
      for (const [subjectId, subjectName] of subjects) {
        if (!future.some((s) => s.class.courseId === courseId && (!subjectId || s.class.subjectId === subjectId))) missingSubjects.push(subjectName);
      }
    }
    result.set(studentId, {
      lastAttended: attended.at(-1)?.startAt.toISOString() ?? null,
      nextLesson: future[0]?.startAt.toISOString() ?? null,
      neverScheduled: own.length === 0 && missingSubjects.length > 0,
      needsScheduling: missingSubjects.length > 0,
      missingSubjects: [...new Set(missingSubjects)],
    });
  }
  return result;
}
