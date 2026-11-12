import path from "node:path";
import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile, storeBusinessBuffer } from "@/lib/business-file-storage";
import { feedbackAttachmentDto, feedbackAttachmentFileResponse } from "@/lib/feedback-attachments";
import { FEEDBACK_ATTACHMENT_MAX_BYTES, FEEDBACK_ATTACHMENT_MAX_COUNT, validHomeworkUploadKey } from "@/lib/homework-upload-keys";
import { prisma } from "@/lib/prisma";
import { resolveAttendanceRoster } from "@/lib/session-attendance-roster";
import { getCancelledSessionStudentIds } from "@/lib/session-students";

const prefix = BUSINESS_UPLOAD_PREFIX.feedbackAttachments;
type Actor = { id: string; email: string; name: string; role: string; teacherId?: string | null; isObserver?: boolean };

class HomeworkFileError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

export function homeworkFileErrorResponse(error: unknown) {
  if (error instanceof HomeworkFileError) return Response.json({ ok: false, message: error.message }, { status: error.status });
  console.error("Lesson homework attachment failed", error);
  return Response.json({ ok: false, message: "附件操作失败，请重试 / Please retry the attachment operation" }, { status: 500 });
}

function fileType(buffer: Buffer, name: string) {
  const hex = buffer.subarray(0, 8).toString("hex");
  if (hex.startsWith("ffd8ff")) return { mimeType: "image/jpeg", extension: ".jpg" };
  if (hex === "89504e470d0a1a0a") return { mimeType: "image/png", extension: ".png" };
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { mimeType: "image/webp", extension: ".webp" };
  if (buffer.toString("ascii", 0, 5) === "%PDF-") return { mimeType: "application/pdf", extension: ".pdf" };
  if (/\.doc$/i.test(name) && hex === "d0cf11e0a1b11ae1") return { mimeType: "application/msword", extension: ".doc" };
  if (/\.docx$/i.test(name) && hex.startsWith("504b0304")) return { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx" };
  throw new HomeworkFileError("请选择 JPG、PNG、WebP、PDF 或 Word 文件", 415);
}

export async function uploadLessonHomework(req: Request, sessionId: string, actor: Actor, baseUrl: string) {
  if (!actor.teacherId || actor.isObserver) throw new HomeworkFileError("请使用本节任课老师的账号上传", 403);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) throw new HomeworkFileError("请选择作业文件", 400);
  if (file.size > FEEDBACK_ATTACHMENT_MAX_BYTES) throw new HomeworkFileError("单个附件不能超过 15MB", 413);
  const uploadKey = String(form?.get("uploadKey") || "");
  if (uploadKey && !validHomeworkUploadKey(uploadKey)) throw new HomeworkFileError("附件编号有误，请重新选择", 400);
  const feedbackId = String(form?.get("feedbackId") || "");
  const audience = String(form?.get("audience") || (form?.get("visibility") === "INTERNAL" ? "internal" : ""));
  const selectedStudentId = String(form?.get("studentId") || "");
  if (!["", "student", "class", "internal"].includes(audience)) throw new HomeworkFileError("请选择附件的可见范围", 400);
  const clientName = path.basename(String(form?.get("fileName") || file.name).replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "");
  const content = Buffer.from(await file.arrayBuffer());
  const { mimeType, extension } = fileType(content, clientName);
  const originalName = (path.basename(clientName, path.extname(clientName)).slice(0, 160) || "作业电子版") + extension;

  let storedPath: string | undefined;
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
      const feedback = await tx.sessionFeedback.findFirst({
        where: { sessionId, teacherId: actor.teacherId!, ...(feedbackId ? { id: feedbackId } : {}) },
        include: {
          attachments: { select: { uploadKey: true } },
          session: { include: {
            attendances: { select: { studentId: true, status: true } },
            class: { select: { teacherId: true, capacity: true, oneOnOneStudentId: true, enrollments: { select: { studentId: true } } } },
          } },
        },
      });
      if (!feedback || feedback.isProxyDraft || (feedback.session.teacherId ?? feedback.session.class.teacherId) !== actor.teacherId) {
        throw new HomeworkFileError("请先提交本节课的老师反馈", 404);
      }
      if (uploadKey) {
        const existing = await tx.sessionFeedbackAttachment.findUnique({ where: { feedbackId_uploadKey: { feedbackId: feedback.id, uploadKey } } });
        if (existing) return existing;
        if (!feedback.pendingHomeworkUploadIds.includes(uploadKey)) throw new HomeworkFileError("请刷新反馈，再重试这个附件");
      }
      if (feedback.reviewStatus !== "PENDING_REVIEW") throw new HomeworkFileError("请重新提交反馈，再上传附件供教务审核");
      if (feedback.attachments.length >= FEEDBACK_ATTACHMENT_MAX_COUNT) throw new HomeworkFileError("最多上传 9 个附件");
      const roster = resolveAttendanceRoster(feedback.session);
      const cancelled = getCancelledSessionStudentIds(feedback.session);
      const studentIds = roster.students.map((student) => student.id).filter((id) => !cancelled.has(id));
      const oneOnOne = feedback.session.class.capacity === 1;
      const studentId = audience === "student" ? selectedStudentId : !audience && oneOnOne ? studentIds[0] || null : null;
      if (audience !== "internal" && (roster.needsReview || !studentIds.length)) {
        throw new HomeworkFileError("请先核对本节课的学生名单");
      }
      if ((studentId && !studentIds.includes(studentId)) || (audience === "student" && !studentId) ||
          (!audience && !oneOnOne) || (audience === "class" && oneOnOne)) {
        throw new HomeworkFileError("请选择本节学生或班课可见范围。班课请使用新版小程序或网页上传。");
      }
      const recipientStudentIds = studentId ? [studentId] : audience === "class" ? studentIds : [];
      const visibility = audience === "internal" ? "INTERNAL" : "PARENT";
      const stored = await storeBusinessBuffer({ content, originalName }, { allowedPrefix: prefix, subdirSegments: [feedback.id] });
      storedPath = stored.relativePath;
      const attachment = await tx.sessionFeedbackAttachment.create({
        data: { feedbackId: feedback.id, storedPath, originalFileName: originalName, mimeType, sizeBytes: content.byteLength,
          visibility, studentId, recipientStudentIds, uploadKey: uploadKey || null, uploadedByUserId: actor.id, uploadedByName: actor.name || actor.email },
      });
      await tx.sessionFeedback.update({
        where: { id: feedback.id },
        data: { pendingHomeworkUploadIds: feedback.pendingHomeworkUploadIds.filter((key) => key !== uploadKey) },
      });
      await tx.auditLog.create({ data: {
        actorEmail: actor.email, actorName: actor.name, actorRole: actor.role, module: "lesson-homework-files",
        action: "UPLOAD_FEEDBACK_ATTACHMENT", entityType: "SessionFeedbackAttachment", entityId: attachment.id,
        meta: { feedbackId: feedback.id, sessionId, visibility, studentId, recipientCount: recipientStudentIds.length },
      } });
      return attachment;
    }, { timeout: 20000 });
    return Response.json({ ok: true, attachment: feedbackAttachmentDto(row, baseUrl + "/" + encodeURIComponent(row.id), true) });
  } catch (error) {
    if (storedPath) {
      const filePath = storedPath;
      const referenced = await prisma.sessionFeedbackAttachment.findFirst({ where: { storedPath: filePath }, select: { id: true } }).catch(() => true);
      if (!referenced) await deleteStoredBusinessFile(filePath, prefix);
    }
    throw error;
  }
}

export async function readLessonHomework(req: Request, sessionId: string, attachmentId: string, actor: Actor, staffReviewer = false) {
  const row = await prisma.sessionFeedbackAttachment.findFirst({
    where: { id: attachmentId, feedback: { sessionId, ...(staffReviewer ? {} : { teacherId: actor.teacherId || "" }) } },
  });
  if (!row) throw new HomeworkFileError("Attachment not found / 附件不存在", 404);
  await logAudit({ actor, module: "lesson-homework-files", action: "VIEW_FEEDBACK_ATTACHMENT",
    entityType: "SessionFeedbackAttachment", entityId: row.id, meta: { feedbackId: row.feedbackId } });
  return feedbackAttachmentFileResponse(req, row);
}

export async function deleteLessonHomework(sessionId: string, attachmentId: string, actor: Actor) {
  if (!actor.teacherId || actor.isObserver) throw new HomeworkFileError("请使用本节任课老师的账号", 403);
  const row = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${sessionId} FOR UPDATE`;
    const attachment = await tx.sessionFeedbackAttachment.findFirst({
      where: { id: attachmentId, feedback: { sessionId, teacherId: actor.teacherId! } },
      include: { feedback: { select: { reviewStatus: true } } },
    });
    if (!attachment) throw new HomeworkFileError("Attachment not found / 附件不存在", 404);
    if (attachment.feedback.reviewStatus === "PUBLISHED") throw new HomeworkFileError("已发布的作业请先重新提交反馈供教务审核");
    await tx.sessionFeedbackAttachment.delete({ where: { id: attachment.id } });
    await tx.sessionFeedback.update({ where: { id: attachment.feedbackId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: {
      actorEmail: actor.email, actorName: actor.name, actorRole: actor.role, module: "lesson-homework-files",
      action: "DELETE_FEEDBACK_ATTACHMENT", entityType: "SessionFeedbackAttachment", entityId: attachment.id,
      meta: { feedbackId: attachment.feedbackId, sessionId },
    } });
    return attachment;
  });
  await deleteStoredBusinessFile(row.storedPath, prefix);
  return Response.json({ ok: true, deleted: true });
}
