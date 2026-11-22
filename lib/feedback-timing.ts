export const FEEDBACK_RECOVERY_LOOKBACK_DAYS = 90;
export const FEEDBACK_WINDOW_HOURS = 12;
export const FEEDBACK_WINDOW_MS = FEEDBACK_WINDOW_HOURS * 60 * 60 * 1000;

export type FeedbackDeadlineStatus = "ON_TIME" | "LATE";

function toDate(value: Date | string | number) {
  return new Date(value);
}

export function getFeedbackDueAt(endAt: Date | string | number, availableAt?: Date | string | number | null) {
  const end = toDate(endAt).getTime();
  const available = availableAt == null ? end : toDate(availableAt).getTime();
  return new Date(Math.max(end, Number.isFinite(available) ? available : end) + FEEDBACK_WINDOW_MS);
}

export function isBackfilledFeedbackSession(session: { endAt: Date | string; feedbackAvailableAt?: Date | string | null }) {
  return session.feedbackAvailableAt != null && new Date(session.feedbackAvailableAt) > new Date(session.endAt);
}

export function getFeedbackOverdueCutoff(now = new Date()) {
  return new Date(now.getTime() - FEEDBACK_WINDOW_MS);
}

export function isFeedbackOverdue(endAt: Date | string | number, now = new Date(), availableAt?: Date | string | number | null) {
  return now > getFeedbackDueAt(endAt, availableAt);
}

export function getFeedbackSubmissionStatus(
  endAt: Date | string | number,
  submittedAt = new Date(),
  availableAt?: Date | string | number | null,
): FeedbackDeadlineStatus {
  return submittedAt <= getFeedbackDueAt(endAt, availableAt) ? "ON_TIME" : "LATE";
}

export function getFeedbackOverdueMinutes(endAt: Date | string | number, now = new Date(), availableAt?: Date | string | number | null) {
  const ms = now.getTime() - getFeedbackDueAt(endAt, availableAt).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}
