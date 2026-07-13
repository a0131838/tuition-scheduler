import { formatBusinessDateTime } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { getSessionStudentIds, sessionBelongsToStudentsWhere } from "@/lib/session-students";
import { courseReminderQuota } from "@/lib/wechat-miniapp-subscription";

export async function getParentCourseReminderCoverage(parentId: string, selectedStudentId?: string | null) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId, canViewSchedule: true },
    select: { studentId: true, student: { select: { name: true } } },
  });
  const linkedStudentIds = new Set(links.map((link) => link.studentId));
  const studentNames = new Map(links.map((link) => [link.studentId, link.student.name]));
  const studentIds = Array.from(linkedStudentIds);
  const [quota, sessions, sentRows] = await Promise.all([
    courseReminderQuota(parentId),
    studentIds.length
      ? prisma.session.findMany({
          where: {
            startAt: { gte: now, lte: horizon },
            ...sessionBelongsToStudentsWhere(studentIds),
          },
          select: {
            id: true, studentId: true, startAt: true,
            class: {
              select: {
                capacity: true,
                oneOnOneStudentId: true,
                course: { select: { name: true } },
                subject: { select: { name: true } },
                enrollments: { where: { studentId: { in: studentIds } }, select: { studentId: true } },
              },
            },
          },
          orderBy: { startAt: "asc" },
          take: 300,
        })
      : [],
    prisma.miniappNotificationOutbox.findMany({
      where: {
        parentId, status: "SENT", templateKey: "course_reminder_24h", targetType: "Session",
        targetId: { endsWith: ":24h" },
      },
      select: { studentId: true, targetId: true },
      take: 500,
    }),
  ]);
  const sentKeys = new Set(sentRows.map((row) => `${row.studentId || ""}:${row.targetId || ""}`));
  const occurrences = sessions.flatMap((session) => {
    const ids = getSessionStudentIds(session).filter((studentId) => linkedStudentIds.has(studentId));
    return ids.map((studentId) => ({
      sessionId: session.id,
      studentId,
      studentName: studentNames.get(studentId) || "学员",
      startAt: session.startAt,
      startText: formatBusinessDateTime(session.startAt),
      courseLabel: [session.class.course.name, session.class.subject?.name].filter(Boolean).join(" / "),
      sent: sentKeys.has(`${studentId}:${session.id}:24h`),
    }));
  }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  let remaining = quota.availableCount;
  const allocated = occurrences.map((item) => {
    if (item.sent) return { ...item, reminderStatus: "SENT", reminderStatusLabel: "已发送提醒" };
    if (remaining > 0) {
      remaining -= 1;
      return { ...item, reminderStatus: "COVERED", reminderStatusLabel: "已覆盖" };
    }
    return { ...item, reminderStatus: "NEEDS_CONSENT", reminderStatusLabel: "待开启提醒" };
  });
  const selected = selectedStudentId ? allocated.filter((item) => item.studentId === selectedStudentId).slice(0, 3) : [];
  const coveredFutureCount = allocated.filter((item) => item.reminderStatus !== "NEEDS_CONSENT").length;
  const needsConsentCount = allocated.length - coveredFutureCount;
  return {
    acceptedCount: quota.acceptedCount,
    consumedCount: quota.consumedCount,
    availableCount: quota.availableCount,
    coveredFutureCount,
    needsConsentCount,
    linkedStudentCount: studentIds.length,
    summaryText: quota.availableCount > 0
      ? `当前还有 ${quota.availableCount} 条课程提醒额度，按全家最早课程依次使用。`
      : allocated.length > 0 ? "下一节课程尚未覆盖，请再次开启微信提醒。" : "当前没有未来课程。",
    selectedStudentSessions: selected.map(({ startAt: _startAt, sent: _sent, ...item }) => item),
  };
}
