import { ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import { miniappTeacherDurationText, miniappTeacherMonthRange, miniappTeacherSessionTimeText } from "@/lib/miniapp-teacher-workbench";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudentNames, isSessionFullyCancelled } from "@/lib/session-students";

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const url = new URL(req.url);
  const range = miniappTeacherMonthRange(url.searchParams.get("month"));
  const now = new Date();
  const rows = await prisma.session.findMany({
    where: {
      OR: [{ teacherId: access.teacherId }, { teacherId: null, class: { teacherId: access.teacherId } }],
      startAt: { gte: range.start, lt: range.end },
      endAt: { lte: now },
    },
    include: {
      attendances: { select: { studentId: true, status: true } },
      feedbacks: { where: { teacherId: access.teacherId }, select: { id: true, status: true, submittedAt: true } },
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
    orderBy: { startAt: "desc" },
  });
  const visible = rows.filter((row) => !isSessionFullyCancelled(row));
  const totalMinutes = visible.reduce((sum, row) => sum + Math.max(0, Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60000)), 0);
  return ok({
    month: range.month,
    summary: {
      sessions: visible.length,
      minutes: totalMinutes,
      durationText: miniappTeacherDurationText(totalMinutes),
      feedbackCompleted: visible.filter((row) => row.feedbacks.length > 0).length,
      feedbackPending: visible.filter((row) => row.feedbacks.length === 0).length,
    },
    sessions: visible.slice(0, 100).map((row) => {
      const courseLabel = [row.class.course?.name, row.class.subject?.name, row.class.level?.name].filter(Boolean).join(" / ") || "-";
      const room = row.class.room?.name;
      const studentNames = getVisibleSessionStudentNames(row);
      const attendanceDone = studentNames.length > 0 && row.attendances.length >= studentNames.length;
      return {
        id: row.id,
        startText: formatBusinessDateTime(row.startAt),
        timeText: miniappTeacherSessionTimeText(row.startAt, row.endAt),
        durationText: miniappTeacherDurationText((row.endAt.getTime() - row.startAt.getTime()) / 60000),
        courseLabel,
        studentText: studentNames.join("、") || "-",
        locationText: row.class.campus.isOnline ? "线上" : room ? `${row.class.campus.name} · ${room}` : row.class.campus.name,
        attendanceText: attendanceDone ? "已点名" : "待完成考勤",
        feedbackText: row.feedbacks.length ? "已反馈" : "未反馈",
      };
    }),
  });
}
