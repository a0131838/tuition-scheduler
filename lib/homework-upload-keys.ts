export const FEEDBACK_ATTACHMENT_MAX_COUNT = 9;
export const FEEDBACK_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

export function validHomeworkUploadKey(value: string) {
  return /^[A-Za-z0-9_-]{12,80}$/.test(value);
}

export function parseHomeworkUploadKeys(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > FEEDBACK_ATTACHMENT_MAX_COUNT ||
      value.some((key) => typeof key !== "string" || !validHomeworkUploadKey(key))) {
    throw new Error("Invalid homework attachments / 作业附件信息有误，请重新选择");
  }
  return [...new Set(value)];
}
