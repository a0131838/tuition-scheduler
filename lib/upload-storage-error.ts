export function uploadStorageError(error: unknown, language: string | null | undefined) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const tooLarge = error instanceof Error && error.message.startsWith("File too large");
  const unavailable = ["ENOSPC", "EDQUOT"].includes(code);
  const zh = unavailable
    ? "服务器存储空间不足，截图未保存，请联系管理员处理后重试。已有记录不受影响，无需重复发送微信群提醒。"
    : tooLarge ? "截图超过10MB，请选择较小的图片后重试。"
    : "截图保存失败，请稍后重试；已有记录不受影响，无需重复发送微信群提醒。";
  const en = unavailable
    ? "Server storage is full. The screenshot was not saved. Please contact an administrator and retry after recovery. Existing records are unchanged; do not resend the group reminder."
    : tooLarge ? "The screenshot exceeds 10MB. Please select a smaller image and retry."
    : "The screenshot could not be saved. Please retry later. Existing records are unchanged; do not resend the group reminder.";
  return { status: unavailable ? 503 : tooLarge ? 413 : 500, message: language === "ZH" ? zh : language === "EN" ? en : `${en} / ${zh}` };
}
