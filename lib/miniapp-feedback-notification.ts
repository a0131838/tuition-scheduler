import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";

export function feedbackNotificationStudentIds(input: {
  sessionStudentId?: string | null;
  oneOnOneStudentId?: string | null;
  enrollmentStudentIds?: string[];
}) {
  return Array.from(new Set([
    input.sessionStudentId,
    input.oneOnOneStudentId,
    ...(input.enrollmentStudentIds ?? []),
  ].filter((value): value is string => Boolean(value))));
}

export async function queueFirstPublishedFeedback(input: {
  sessionId: string;
  feedbackId: string;
  submittedAt: Date;
}) {
  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    include: {
      teacher: { select: { name: true } },
      class: {
        include: {
          course: { select: { name: true } },
          subject: { select: { name: true } },
          teacher: { select: { name: true } },
          enrollments: { select: { studentId: true } },
        },
      },
    },
  });
  if (!session) return [];

  const studentIds = feedbackNotificationStudentIds({
    sessionStudentId: session.studentId,
    oneOnOneStudentId: session.class.oneOnOneStudentId,
    enrollmentStudentIds: session.class.enrollments.map((row) => row.studentId),
  });
  if (studentIds.length === 0) return [];

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true },
  });
  const courseLabel = [session.class.course.name, session.class.subject?.name].filter(Boolean).join(" / ");
  const teacherName = session.teacher?.name || session.class.teacher.name;

  return Promise.all(students.map((student) => queueMiniappNotificationsForStudent({
    studentId: student.id,
    templateKey: MINIAPP_TEMPLATE_KEYS.feedbackPublished,
    eventType: "FEEDBACK_PUBLISHED",
    targetType: "SessionFeedback",
    targetId: input.feedbackId,
    permission: "canViewFeedback",
    payload: {
      feedbackId: input.feedbackId,
      sessionId: session.id,
      studentName: student.name,
      courseLabel,
      teacherName,
      submittedAt: input.submittedAt.toISOString(),
    },
  })));
}
