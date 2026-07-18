import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { getSessionStudentIds } from "@/lib/session-students";
import { bad, courseLabel, ok, requireMiniappParent } from "../../_lib";

export async function GET(req: Request, { params }: { params: Promise<{ feedbackId: string }> }) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;

  const { feedbackId } = await params;
  const feedback = await prisma.sessionFeedback.findUnique({
    where: { id: feedbackId },
    include: {
      teacher: { select: { name: true } },
      session: {
        include: {
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              enrollments: { select: { studentId: true } },
            },
          },
        },
      },
    },
  });
  if (!feedback || !feedback.publishedAt) return bad("Feedback not found", 404);

  const studentIds = getSessionStudentIds(feedback.session);
  const link = await prisma.parentStudentLink.findFirst({
    where: {
      parentId: auth.parent.id,
      studentId: { in: studentIds },
      canViewFeedback: true,
    },
  });
  if (!link) return bad("Forbidden", 403);

  const visibleContent = feedback.parentContent || feedback.content;
  const sections = parseParentFeedbackSections(visibleContent);
  return ok({
    feedback: {
      id: feedback.id,
      studentId: link.studentId,
      sessionId: feedback.sessionId,
      sessionStartAt: feedback.session.startAt.toISOString(),
      sessionEndAt: feedback.session.endAt.toISOString(),
      courseLabel: courseLabel(feedback.session.class),
      teacherName: feedback.teacher.name,
      submittedAt: feedback.submittedAt.toISOString(),
      sections,
      rawContent: visibleContent,
      homework: feedback.homework,
      previousHomeworkDone: feedback.previousHomeworkDone,
    },
  });
}
