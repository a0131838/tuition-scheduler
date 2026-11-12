import { BUSINESS_UPLOAD_PREFIX, buildStoredBusinessFileResponse } from "@/lib/business-file-storage";

import type { Prisma } from "@prisma/client";

export function parentHomeworkAttachmentWhere(studentId: string): Prisma.SessionFeedbackAttachmentWhereInput {
  return { visibility: "PARENT", recipientStudentIds: { has: studentId } };
}

export function feedbackAttachmentDto(row: {
  id: string;
  originalFileName: string;
  mimeType: string | null;
  sizeBytes: number;
  visibility: string;
  studentId: string | null;
  recipientStudentIds: string[];
  uploadKey: string | null;
  createdAt: Date;
}, viewUrl: string, staff = false) {
  return {
    id: row.id,
    name: row.originalFileName,
    mimeType: row.mimeType || "application/octet-stream",
    sizeBytes: row.sizeBytes,
    ...(staff ? {
      uploadKey: row.uploadKey,
      studentId: row.studentId,
      visibility: row.visibility,
      visibilityText: row.visibility !== "PARENT" || !row.recipientStudentIds.length
        ? "仅员工可见"
        : row.studentId ? "指定学生家长" : "本节班课家长",
    } : {}),
    createdAt: row.createdAt.toISOString(),
    viewUrl,
  };
}

export async function feedbackAttachmentFileResponse(req: Request, row: {
  storedPath: string;
  originalFileName: string;
  mimeType: string | null;
}) {
  const result = await buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.feedbackAttachments,
    relativePath: row.storedPath,
    originalFileName: row.originalFileName,
    fallbackFileName: "lesson-feedback-file",
    inlineFileName: row.originalFileName,
    contentType: row.mimeType && /^(image\/(jpeg|png|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))$/.test(row.mimeType)
      ? row.mimeType : "application/octet-stream",
    cacheControl: "private, no-store",
  });
  result.headers.set("x-content-type-options", "nosniff");
  return result;
}
