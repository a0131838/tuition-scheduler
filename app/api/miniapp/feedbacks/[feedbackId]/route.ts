import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { bad, courseLabel, ok, requireMiniappParent } from "../../_lib";

function sessionStudentIds(session: any) {
  return [
    session.studentId,
    session.class?.oneOnOneStudentId,
    ...(session.class?.enrollments ?? []).map((enrollment: any) => enrollment.studentId),
  ].filter(Boolean) as string[];
}

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
  if (!feedback) return bad("Feedback not found", 404);

  const studentIds = sessionStudentIds(feedback.session);
  const link = await prisma.parentStudentLink.findFirst({
    where: {
      parentId: auth.parent.id,
      studentId: { in: studentIds },
      canViewFeedback: true,
    },
  });
  if (!link) return bad("Forbidden", 403);

  const sections = parseParentFeedbackSections(feedback.content);
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
      rawContent: feedback.content,
      homework: feedback.homework,
      previousHomeworkDone: feedback.previousHomeworkDone,
    },
  });
}
