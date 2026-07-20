import { bad } from "@/app/api/miniapp/_lib";
import { requireMiniappStudentAccess } from "@/app/api/miniapp/_lib";
import { logAudit } from "@/lib/audit-log";
import { feedbackAttachmentFileResponse } from "@/lib/feedback-attachments";
import { prisma } from "@/lib/prisma";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";

export async function GET(req: Request, { params }: { params: Promise<{ studentId: string; feedbackId: string; attachmentId: string }> }) {
  const { studentId, feedbackId, attachmentId } = await params;
  const auth = await requireMiniappStudentAccess(req, studentId, "canViewFeedback");
  if (!auth.ok) return auth.response;
  const row = await prisma.sessionFeedbackAttachment.findFirst({
    where: {
      id: attachmentId,
      feedbackId,
      visibility: "PARENT",
      feedback: { publishedAt: { not: null }, session: sessionBelongsToStudentWhere(studentId) },
    },
  });
  if (!row) return bad("Attachment not found", 404);
  await logAudit({ actor: auth.parent, module: "miniapp-feedback-attachments", action: "PARENT_VIEW_FEEDBACK_ATTACHMENT", entityType: "SessionFeedbackAttachment", entityId: row.id, meta: { feedbackId, studentId } });
  return feedbackAttachmentFileResponse(req, row);
}
