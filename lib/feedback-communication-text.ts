/** Keep legacy template variables compatible while making the copy label match the full body. */
export function formatFullFeedbackMessage(message: string) {
  return message
    .replace("反馈摘要 / Summary：", "课后反馈 / Lesson feedback：\n")
    .replace("详细课堂表现与作业请在家长小程序中查看。 / Please open the parent miniapp for the full feedback and homework.",
      "相关附件也可在家长小程序中查看。 / Supporting attachments are also available in the parent miniapp.");
}
