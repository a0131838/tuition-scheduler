import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";
import { courseLabel, ok, parseDateRange, requireMiniappStudentAccess } from "../../../_lib";
import { feedbackAttachmentDto, parentHomeworkAttachmentWhere } from "@/lib/feedback-attachments";

import { formatBusinessDateTime } from "@/lib/date-only";
import type { Prisma } from "@prisma/client";

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
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(url.searchParams.get("page")) || 1)));
  const pageSize = Math.min(50, Math.max(1, Math.trunc(Number(url.searchParams.get("pageSize")) || 20)));
  const feedbackId = url.searchParams.get("feedbackId")?.trim();
  const course = url.searchParams.get("course")?.trim().slice(0, 100);
  const attachmentWhere = parentHomeworkAttachmentWhere(studentId);
  const feedbackWhere: Prisma.SessionFeedbackWhereInput = {
    publishedAt: { not: null }, reviewStatus: "PUBLISHED", isProxyDraft: false,
    ...(feedbackId ? { id: feedbackId } : {}),
    ...(url.searchParams.get("hasHomeworkFiles") === "1" ? { attachments: { some: attachmentWhere } } : {}),
  };
  const courseName = course ? { contains: course, mode: "insensitive" as const } : undefined;
  const sessions = await prisma.session.findMany({
    where: {
      startAt: { ...(url.searchParams.has("from") ? { gte: from } : {}), lte: to },
      feedbacks: { some: feedbackWhere },
      ...sessionBelongsToStudentWhere(studentId),
      ...(courseName ? { class: { OR: [{ course: { name: courseName } }, { subject: { name: courseName } }, { level: { name: courseName } }] } } : {}),
    },
    include: {
      class: { include: { course: true, subject: true, level: true } },
      feedbacks: {
        where: feedbackWhere,
        include: { teacher: { select: { name: true } }, attachments: { where: attachmentWhere, orderBy: { createdAt: "asc" } } },
        orderBy: { submittedAt: "desc" },
      },
    },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  const items = sessions.slice(0, pageSize).flatMap((session) =>
    session.feedbacks.map((feedback) => {
      const visibleContent = feedback.parentContent || feedback.content;
      const sections = parseParentFeedbackSections(visibleContent);
      return {
        id: feedback.id,
        sessionId: session.id,
        sessionStartAt: session.startAt.toISOString(),
        sessionStartText: formatBusinessDateTime(session.startAt),
        sessionEndAt: session.endAt.toISOString(),
        courseLabel: courseLabel(session.class),
        teacherName: feedback.teacher.name,
        submittedAt: feedback.submittedAt.toISOString(),
        summary: compact(sections.classPerformance || sections.lessonFocus || visibleContent),
        sections,
        homework: feedback.homework,
        previousHomeworkDone: feedback.previousHomeworkDone,
        previousHomeworkNotAssigned: feedback.previousHomeworkNotAssigned,
        attachments: feedback.attachments.map((row) => feedbackAttachmentDto(
          row,
          `/api/miniapp/students/${encodeURIComponent(studentId)}/feedbacks/${encodeURIComponent(feedback.id)}/attachments/${encodeURIComponent(row.id)}`,
        )),
      };
    })
  );

  return ok({
    page,
    pageSize,
    hasMore: sessions.length > pageSize,
    items,
  });
}
