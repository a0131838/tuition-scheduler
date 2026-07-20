import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import {
  FEEDBACK_ATTACHMENT_ACCEPT,
  FEEDBACK_ATTACHMENT_MAX_BYTES,
  FEEDBACK_ATTACHMENT_MAX_COUNT,
  feedbackAttachmentDto,
} from "@/lib/feedback-attachments";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function allowedFeedback(sessionId: string, user: { teacherId?: string | null; role: string }) {
  const feedback = await prisma.sessionFeedback.findFirst({
    where: { sessionId },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  if (!feedback) return null;
  const allowed = feedback.teacherId === user.teacherId || canManageMiniappSchedulingCoordination(user as any);
  return allowed ? feedback : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId } = await params;
  const feedback = await allowedFeedback(sessionId, auth.user);
  if (!feedback) return bad("Feedback not found or no permission", 404);
  return ok({
    attachments: feedback.attachments.map((row) => feedbackAttachmentDto(
      row,
      `/api/miniapp/staff/schedule/${encodeURIComponent(sessionId)}/feedback/attachments/${encodeURIComponent(row.id)}`,
    )),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const { sessionId } = await params;
  const feedback = await allowedFeedback(sessionId, auth.user);
  if (!feedback) return bad("Submit feedback before uploading attachments", 404);
  if (feedback.attachments.length >= FEEDBACK_ATTACHMENT_MAX_COUNT) return bad("最多上传 9 个附件", 409);

  const form = await req.formData().catch(() => null);
  if (!form) return bad("Invalid form data");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return bad("No file uploaded");
  if (file.size > FEEDBACK_ATTACHMENT_MAX_BYTES) return bad("单个附件不能超过 15MB", 413);
  if (file.type && !FEEDBACK_ATTACHMENT_ACCEPT.includes(file.type)) return bad("只支持图片、PDF 和 Word 文件", 415);
  const visibility = String(form.get("visibility") || "PARENT").toUpperCase() === "INTERNAL" ? "INTERNAL" : "PARENT";
  const stored = await storeBusinessUpload(file, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.feedbackAttachments,
    subdirSegments: [feedback.id],
    maxBytes: FEEDBACK_ATTACHMENT_MAX_BYTES,
    fallbackOriginalName: "lesson-feedback-file",
  });
  const attachment = await prisma.sessionFeedbackAttachment.create({
    data: {
      feedbackId: feedback.id,
      storedPath: stored.relativePath,
      originalFileName: stored.originalName,
      mimeType: file.type || null,
      sizeBytes: file.size,
      visibility,
      uploadedByUserId: auth.user.id,
      uploadedByName: auth.user.name || auth.user.email,
    },
  });
  await logAudit({
    actor: auth.user,
    module: "miniapp-feedback-attachments",
    action: "UPLOAD_FEEDBACK_ATTACHMENT",
    entityType: "SessionFeedbackAttachment",
    entityId: attachment.id,
    meta: { feedbackId: feedback.id, sessionId, visibility, name: stored.originalName, sizeBytes: file.size },
  });
  return ok({
    attachment: feedbackAttachmentDto(
      attachment,
      `/api/miniapp/staff/schedule/${encodeURIComponent(sessionId)}/feedback/attachments/${encodeURIComponent(attachment.id)}`,
    ),
  });
}
