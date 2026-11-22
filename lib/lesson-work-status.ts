import { formatBusinessDateTime } from "./date-only";
import { getFeedbackDueAt, getFeedbackSubmissionStatus, isBackfilledFeedbackSession, isFeedbackOverdue } from "./feedback-timing";
import { sessionFeedbackState, isPendingFeedback, type FeedbackEvidence } from "./session-feedback-state";
import type { FeedbackPolicySession } from "./session-feedback-policy";
import { resolveAttendanceRoster } from "./session-attendance-roster";

type AttendanceEvidence = {
  studentId: string; status: string; deductedMinutes: number; deductedCount: number;
  waiveDeduction: boolean; package?: { type: string } | null;
};
type Lesson = FeedbackPolicySession & Parameters<typeof resolveAttendanceRoster>[0] & {
  endAt: Date | string;
  feedbackAvailableAt?: Date | string | null;
  attendances: AttendanceEvidence[];
  feedbacks: Array<FeedbackEvidence & { submittedAt?: Date | string; reviewStatus?: string }>;
};

/** Read-only evidence for all staff surfaces. This function never saves attendance or a ledger entry. */
export function lessonWorkStatus(session: Lesson, responsibleTeacherId: string, now = new Date(), lang = "BILINGUAL") {
  const text = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  const roster = resolveAttendanceRoster(session);
  const cancelled = new Set(session.attendances.filter(a => a.status === "EXCUSED").map(a => a.studentId));
  const active = roster.students.filter(s => !cancelled.has(s.id));
  const rows = active.map(s => session.attendances.find(a => a.studentId === s.id));
  const marked = rows.filter(a => a && a.status !== "UNMARKED").length;
  const minutes = rows.reduce((n, a) => n + (a?.deductedMinutes ?? 0), 0);
  const count = rows.reduce((n, a) => n + (a?.deductedCount ?? 0), 0);
  const pendingDeduction = rows.filter(a => a && a.status !== "UNMARKED" && !a.waiveDeduction && a.package?.type !== "MONTHLY" && !a.deductedMinutes && !a.deductedCount).length;
  const fullyCancelled = roster.students.length > 0 && !active.length;
  const state = fullyCancelled ? "EXEMPT" : sessionFeedbackState({ ...session, responsibleTeacherId }, now);
  const pending = isPendingFeedback(state);
  const overdue = pending && isFeedbackOverdue(session.endAt, now, session.feedbackAvailableAt);
  const backfilled = isBackfilledFeedbackSession(session);
  const dueAt = getFeedbackDueAt(session.endAt, session.feedbackAvailableAt);
  const feedback = session.feedbacks.find(f => f.teacherId === responsibleTeacherId);
  const late = feedback?.submittedAt && backfilled
    ? getFeedbackSubmissionStatus(session.endAt, new Date(feedback.submittedAt), session.feedbackAvailableAt) === "LATE"
    : feedback?.status === "LATE";
  const enUnits = [minutes ? `${minutes} min` : "", count ? `${count} lesson(s)` : ""].filter(Boolean).join(" + ");
  const zhUnits = [minutes ? `${minutes}分钟` : "", count ? `${count}次` : ""].filter(Boolean).join(" + ");
  const deductionLabel = roster.needsReview ? text("Student assignment needs review", "学生归属待核对")
    : pendingDeduction ? text(`${enUnits ? `Recorded ${enUnits}; ` : ""}${pendingDeduction} deduction(s) need checking`, `${zhUnits ? `已记录${zhUnits}；` : ""}${pendingDeduction}人扣课待核对`)
    : enUnits ? text(`Deducted: ${enUnits}`, `已扣课：${zhUnits}`)
    : marked < active.length ? text("Check after attendance", "点名后核对扣课")
    : text("No deduction required", "无需扣课");
  return {
    attendanceLabel: roster.needsReview ? text("Student assignment needs review", "学生归属待核对") : text(`Attendance: ${marked}/${active.length}`, `点名：${marked}/${active.length}`),
    attendanceComplete: !roster.needsReview && marked === active.length,
    deductionLabel,
    deductionNeedsReview: roster.needsReview || pendingDeduction > 0,
    deductedMinutes: minutes, deductedCount: count,
    feedbackState: state,
    feedbackPending: pending,
    feedbackOverdue: overdue,
    feedbackLabel: state === "SUBMITTED" ? text(late ? "Feedback submitted late" : "Feedback submitted", late ? "反馈已补交" : "反馈已提交")
      : state === "EXEMPT" ? text("Feedback not required", "无需反馈")
      : state === "NOT_DUE" ? text("Feedback after class", "课后填写反馈")
      : state === "PROXY_DRAFT" ? text("Feedback draft; teacher submission needed", "反馈草稿，待老师正式提交")
      : overdue ? text("Feedback missing; past deadline", "反馈待补交，已超过期限") : text("Feedback pending", "反馈待提交"),
    feedbackDueAt: dueAt.toISOString(),
    feedbackDueText: formatBusinessDateTime(dueAt),
    backfilled,
    backfillLabel: backfilled ? text(`Backfilled on ${formatBusinessDateTime(new Date(session.feedbackAvailableAt!))}`, `补录课次：${formatBusinessDateTime(new Date(session.feedbackAvailableAt!))}创建`) : "",
    feedbackHint: backfilled ? text("Submit within 12 hours of record creation. This is a feedback task; do not deduct again.", "请在补录创建后12小时内提交反馈；待补反馈不代表未扣课，请勿重复扣课。") : text("Submit feedback within 12 hours after class. Attendance, deduction and feedback are separate.", "请在下课后12小时内提交反馈；点名、扣课和反馈分别记录。"),
  };
}
