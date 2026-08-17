export type TeacherQualityFeedbackState = "SUBMITTED" | "PROXY_DRAFT" | "MISSING";

type FeedbackLike = {
  teacherId?: string | null;
  isProxyDraft?: boolean | null;
  status?: string | null;
};

export function resolveTeacherQualityFeedbackState(
  feedbacks: FeedbackLike[],
  responsibleTeacherId: string,
): TeacherQualityFeedbackState {
  const feedback = feedbacks.find((item) => item.teacherId === responsibleTeacherId);
  if (!feedback) return "MISSING";
  if (feedback.isProxyDraft || feedback.status === "PROXY_DRAFT") return "PROXY_DRAFT";
  return "SUBMITTED";
}
