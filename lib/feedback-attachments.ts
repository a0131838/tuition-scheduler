import { BUSINESS_UPLOAD_PREFIX, buildStoredBusinessFileResponse } from "@/lib/business-file-storage";

export const FEEDBACK_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
export const FEEDBACK_ATTACHMENT_MAX_COUNT = 9;
export const FEEDBACK_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function feedbackAttachmentDto(row: {
  id: string;
  originalFileName: string;
  mimeType: string | null;
  sizeBytes: number;
  visibility: string;
  createdAt: Date;
}, viewUrl: string) {
  return {
    id: row.id,
    name: row.originalFileName,
    mimeType: row.mimeType || "application/octet-stream",
    sizeBytes: row.sizeBytes,
    visibility: row.visibility,
    visibilityText: row.visibility === "PARENT" ? "家长可见" : "仅员工可见",
    createdAt: row.createdAt.toISOString(),
    viewUrl,
  };
}

export function feedbackAttachmentFileResponse(req: Request, row: {
  storedPath: string;
  originalFileName: string;
  mimeType: string | null;
}) {
  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.feedbackAttachments,
    relativePath: row.storedPath,
    originalFileName: row.originalFileName,
    fallbackFileName: "lesson-feedback-file",
    inlineFileName: row.originalFileName,
    contentType: row.mimeType,
    cacheControl: "private, no-store",
  });
}
