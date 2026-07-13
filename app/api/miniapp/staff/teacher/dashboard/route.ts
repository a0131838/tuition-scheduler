import { ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { formatBusinessDateOnly, formatBusinessDateTime, parseBusinessDateStart } from "@/lib/date-only";
import { miniappTeacherMonthRange, miniappTeacherSessionTimeText } from "@/lib/miniapp-teacher-workbench";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const now = new Date();
  const todayStart = parseBusinessDateStart(formatBusinessDateOnly(now)) ?? now;
  const futureEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const availabilityEnd = new Date(todayStart.getTime() + 31 * 24 * 60 * 60 * 1000);
  const month = miniappTeacherMonthRange(null, now);
  const teacherWhere = { OR: [{ teacherId: access.teacherId }, { teacherId: null, class: { teacherId: access.teacherId } }] };

  const [availabilityCount, upcomingRaw, monthRaw, expenseRows] = await Promise.all([
    prisma.teacherAvailabilityDate.count({ where: { teacherId: access.teacherId, date: { gte: todayStart, lt: availabilityEnd } } }),
    prisma.session.findMany({
      where: { ...teacherWhere, startAt: { gt: now, lt: futureEnd } },
      include: {
        attendances: { select: { studentId: true, status: true } },
        student: { select: { id: true, name: true } },
        class: {
          include: {
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            campus: { select: { name: true, isOnline: true } },
            room: { select: { name: true } },
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: { include: { student: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 200,
    }),
    prisma.session.findMany({
      where: { ...teacherWhere, startAt: { gte: month.start, lt: month.end }, endAt: { lte: now } },
      include: {
        attendances: { select: { studentId: true, status: true } },
        student: { select: { id: true, name: true } },
        class: {
          include: {
            oneOnOneStudent: { select: { id: true, name: true } },
            enrollments: { include: { student: { select: { id: true, name: true } } } },
          },
        },
      },
    }),
    prisma.expenseClaim.findMany({
      where: { submitterUserId: access.user.id, archivedAt: null, status: { not: "WITHDRAWN" } },
      select: { status: true },
    }),
  ]);

  const upcoming = upcomingRaw.filter((row) => !isSessionFullyCancelled(row));
  const completed = monthRaw.filter((row) => !isSessionFullyCancelled(row));
  const completedMinutes = completed.reduce((sum, row) => sum + Math.max(0, Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60000)), 0);
  const expenseNeedsAction = expenseRows.filter((row) => row.status === "REJECTED").length;
  const expenseInProgress = expenseRows.filter((row) => row.status === "SUBMITTED" || row.status === "APPROVED").length;

  return ok({
    availabilityCount,
    upcomingCount: upcoming.length,
    completedThisMonth: completed.length,
    completedMinutes,
    expenseNeedsAction,
    expenseInProgress,
    upcoming: upcoming.slice(0, 30).map((row) => {
      const courseLabel = [row.class.course?.name, row.class.subject?.name, row.class.level?.name].filter(Boolean).join(" / ") || "-";
      const campus = row.class.campus;
      const room = row.class.room?.name;
      return {
        id: row.id,
        startAt: row.startAt.toISOString(),
        startText: formatBusinessDateTime(row.startAt),
        timeText: miniappTeacherSessionTimeText(row.startAt, row.endAt),
        courseLabel,
        studentText: getVisibleSessionStudentNames(row).join("、") || "-",
        locationText: campus.isOnline ? "线上" : room ? `${campus.name} · ${room}` : campus.name,
      };
    }),
  });
}
