import { parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { buildLearningEvidenceSnapshot, type LearningEvidenceRecord } from "@/lib/student-learning-evidence";

function fallbackRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export function resolveLearningEvidenceRange(input: { from?: string | null; to?: string | null }) {
  const fallback = fallbackRange();
  const from = input.from ? parseBusinessDateStart(input.from) : fallback.from;
  const to = input.to ? parseBusinessDateEnd(input.to) : fallback.to;
  if (!from || !to || from > to) return fallback;
  return { from, to };
}

function courseLabel(value: { course: { name: string }; subject: { name: string } | null; level: { name: string } | null }) {
  return [value.course.name, value.subject?.name, value.level?.name].filter(Boolean).join(" / ");
}

export async function loadStudentLearningEvidence(input: {
  studentId: string;
  from?: string | null;
  to?: string | null;
  courseId?: string | null;
}) {
  const range = resolveLearningEvidenceRange(input);
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      curriculum: true,
      englishLevel: true,
      coachingContent: true,
      learningPlans: { select: { id: true }, take: 1 },
    },
  });
  if (!student) return null;

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: range.from, lte: range.to },
      ...sessionBelongsToStudentWhere(input.studentId),
      attendances: { none: { studentId: input.studentId, status: "EXCUSED" } },
      ...(input.courseId ? { class: { courseId: input.courseId } } : {}),
    },
    include: {
      class: { include: { course: true, subject: true, level: true, teacher: true } },
      teacher: true,
      attendances: { where: { studentId: input.studentId }, select: { status: true } },
      feedbacks: {
        where: { content: { not: "" }, isProxyDraft: false, reviewStatus: "PUBLISHED" },
        include: { teacher: { select: { name: true } } },
        orderBy: { submittedAt: "asc" },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const feedbacks: LearningEvidenceRecord[] = sessions.flatMap((session) =>
    session.feedbacks.map((feedback) => ({
      sessionId: session.id,
      feedbackId: feedback.id,
      sessionStartAt: session.startAt,
      courseLabel: courseLabel(session.class),
      teacherName: feedback.teacher.name || session.teacher?.name || session.class.teacher.name,
      feedbackContent: feedback.parentContent?.trim() || feedback.content,
      homework: feedback.homework,
      previousHomeworkDone: feedback.previousHomeworkDone,
      attendanceStatus: session.attendances[0]?.status ?? null,
    }))
  );
  const snapshot = buildLearningEvidenceSnapshot({
    sessions: sessions.map((session) => ({ id: session.id, attendanceStatus: session.attendances[0]?.status ?? null })),
    feedbacks,
    hasBaseline: Boolean(student.englishLevel?.trim()),
    hasLearningGoal: Boolean(student.coachingContent?.trim()) || student.learningPlans.length > 0,
  });
  const courses = Array.from(
    new Map(sessions.map((session) => [session.class.course.id, { id: session.class.course.id, name: session.class.course.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  return { student, range, sessions, feedbacks, snapshot, courses };
}
