export const FEEDBACK_WINDOW_HOURS = 12;
export const FEEDBACK_WINDOW_MS = FEEDBACK_WINDOW_HOURS * 60 * 60 * 1000;

export type FeedbackDeadlineStatus = "ON_TIME" | "LATE";

function toDate(value: Date | string | number) {
  return new Date(value);
}

export function getFeedbackDueAt(endAt: Date | string | number) {
  return new Date(toDate(endAt).getTime() + FEEDBACK_WINDOW_MS);
}

export function getFeedbackOverdueCutoff(now = new Date()) {
  return new Date(now.getTime() - FEEDBACK_WINDOW_MS);
}

export function isFeedbackOverdue(endAt: Date | string | number, now = new Date()) {
  return now > getFeedbackDueAt(endAt);
}

export function getFeedbackSubmissionStatus(
  endAt: Date | string | number,
  submittedAt = new Date(),
): FeedbackDeadlineStatus {
  return submittedAt <= getFeedbackDueAt(endAt) ? "ON_TIME" : "LATE";
}

export function getFeedbackOverdueMinutes(endAt: Date | string | number, now = new Date()) {
  const ms = now.getTime() - getFeedbackDueAt(endAt).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}
