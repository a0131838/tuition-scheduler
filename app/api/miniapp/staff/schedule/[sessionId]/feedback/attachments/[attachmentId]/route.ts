import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile } from "@/lib/business-file-storage";
import { feedbackAttachmentFileResponse } from "@/lib/feedback-attachments";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";

async function allowedAttachment(sessionId: string, attachmentId: string, user: { teacherId?: string | null; role: string }) {
  const row = await prisma.sessionFeedbackAttachment.findFirst({
    where: { id: attachmentId, feedback: { sessionId } },
    include: { feedback: { select: { id: true, teacherId: true, publishedAt: true } } },
  });
  if (!row) return null;
  const allowed = row.feedback.teacherId === user.teacherId || canManageMiniappSchedulingCoordination(user as any);
  return allowed ? row : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string; attachmentId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId, attachmentId } = await params;
  const row = await allowedAttachment(sessionId, attachmentId, auth.user);
  if (!row) return bad("Attachment not found", 404);
  await logAudit({ actor: auth.user, module: "miniapp-feedback-attachments", action: "VIEW_FEEDBACK_ATTACHMENT", entityType: "SessionFeedbackAttachment", entityId: row.id, meta: { feedbackId: row.feedback.id } });
  return feedbackAttachmentFileResponse(req, row);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ sessionId: string; attachmentId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId, attachmentId } = await params;
  const row = await allowedAttachment(sessionId, attachmentId, auth.user);
  if (!row) return bad("Attachment not found", 404);
  if (row.feedback.publishedAt) return bad("Published feedback attachments cannot be deleted; create a correction instead", 409);
  await prisma.sessionFeedbackAttachment.delete({ where: { id: row.id } });
  await deleteStoredBusinessFile(row.storedPath, BUSINESS_UPLOAD_PREFIX.feedbackAttachments);
  await logAudit({ actor: auth.user, module: "miniapp-feedback-attachments", action: "DELETE_FEEDBACK_ATTACHMENT", entityType: "SessionFeedbackAttachment", entityId: row.id, meta: { feedbackId: row.feedback.id, name: row.originalFileName } });
  return ok({ deleted: true });
}
