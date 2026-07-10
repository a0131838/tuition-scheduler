import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { courseLabel, ok, parseDateRange, requireMiniappStudentAccess } from "../../../_lib";

function sessionStudentWhere(studentId: string) {
  return {
    OR: [
      { studentId },
      { class: { oneOnOneStudentId: studentId } },
      { class: { enrollments: { some: { studentId } } } },
    ],
  };
}

function compact(value: string, max = 100) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewFeedback");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const { from, to } = parseDateRange(url, 90, 0);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20) || 20));

  const sessions = await prisma.session.findMany({
    where: {
      startAt: { gte: from, lte: to },
      feedbacks: { some: { content: { not: "" } } },
      ...sessionStudentWhere(studentId),
    },
    include: {
      class: { include: { course: true, subject: true, level: true } },
      feedbacks: {
        where: { content: { not: "" } },
        include: { teacher: { select: { name: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
    orderBy: { startAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const items = sessions.flatMap((session) =>
    session.feedbacks.map((feedback) => {
      const sections = parseParentFeedbackSections(feedback.content);
      return {
        id: feedback.id,
        sessionId: session.id,
        sessionStartAt: session.startAt.toISOString(),
        sessionEndAt: session.endAt.toISOString(),
        courseLabel: courseLabel(session.class),
        teacherName: feedback.teacher.name,
        submittedAt: feedback.submittedAt.toISOString(),
        summary: compact(sections.classPerformance || sections.lessonFocus || feedback.content),
        sections,
        homework: feedback.homework,
        previousHomeworkDone: feedback.previousHomeworkDone,
      };
    })
  );

  return ok({
    page,
    pageSize,
    items,
  });
}
