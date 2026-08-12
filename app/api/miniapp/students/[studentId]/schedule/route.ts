import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { formatBusinessDateWithWeekday, formatBusinessTimeOnly } from "@/lib/date-only";
import { ok, parseDateRange, requireMiniappStudentAccess, sessionDto } from "../../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewSchedule");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const { from, to } = parseDateRange(url, 30, 60);
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: from, lte: to },
      ...sessionBelongsToStudentWhere(studentId),
    },
    include: {
      teacher: true,
      class: { include: { course: true, subject: true, level: true, teacher: true, campus: true, room: true } },
      attendances: { where: { studentId }, take: 1 },
      managerFeedbacks: { where: { category: "ACTION_REQUIRED", requiresAck: true, acknowledgedAt: null, archivedAt: null }, select: { id: true }, take: 1 },
    },
    orderBy: { startAt: "asc" },
    take: 500,
  });

  const now = new Date();
  return ok({
    from: from.toISOString(),
    to: to.toISOString(),
    sessions: sessions.map((session) => {
      const attendance = session.attendances[0];
      const pendingTeacherConsent = session.startAt > now && session.managerFeedbacks.length > 0;
      const status = attendance?.status === "EXCUSED"
        ? { label: "已请假", tone: "muted" }
        : pendingTeacherConsent
          ? { label: "暂定·待老师同意", tone: "pending" }
        : session.endAt <= now
          ? { label: "已完成", tone: "done" }
          : session.startAt <= now
            ? { label: "进行中", tone: "active" }
            : { label: "待上课", tone: "upcoming" };
      return {
        ...sessionDto(session, attendance),
        dateLabel: formatBusinessDateWithWeekday(session.startAt, { short: true }),
        timeRange: `${formatBusinessTimeOnly(session.startAt)}–${formatBusinessTimeOnly(session.endAt)}`,
        statusLabel: status.label,
        statusTone: status.tone,
        pendingTeacherConsent,
      };
    }),
  });
}
