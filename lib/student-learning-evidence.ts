import { parseParentFeedbackSections } from "@/lib/parent-feedback-format";

export type LearningEvidenceRecord = {
  sessionId: string;
  feedbackId: string;
  sessionStartAt: Date;
  courseLabel: string;
  teacherName: string;
  feedbackContent: string;
  homework: string | null;
  previousHomeworkDone: boolean | null;
  attendanceStatus: string | null;
};

export type LearningEvidenceSession = {
  id: string;
  attendanceStatus: string | null;
};

export type LearningEvidenceGap = {
  key: "feedback" | "attendance" | "homework" | "baseline" | "goal";
  label: string;
  detail: string;
};

export type LearningEvidenceSnapshot = {
  sessionCount: number;
  feedbackCount: number;
  feedbackSessionCount: number;
  feedbackCoveragePercent: number;
  attendance: Record<string, number>;
  homeworkAssignedCount: number;
  homeworkTrackingCount: number;
  homeworkDoneCount: number;
  homeworkNotDoneCount: number;
  gaps: LearningEvidenceGap[];
  focusAreas: string[];
  nextSteps: string[];
};

function uniqueMeaningful(values: string[], limit = 4) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    const value = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value.length > 180 ? `${value.slice(0, 177)}...` : value);
    if (output.length >= limit) break;
  }
  return output;
}

export function buildLearningEvidenceSnapshot(input: {
  sessions: LearningEvidenceSession[];
  feedbacks: LearningEvidenceRecord[];
  hasBaseline: boolean;
  hasLearningGoal: boolean;
}): LearningEvidenceSnapshot {
  const sessionIds = new Set(input.sessions.map((row) => row.id));
  const feedbackSessionIds = new Set(input.feedbacks.map((row) => row.sessionId));
  const attendance: Record<string, number> = {};
  for (const row of input.sessions) {
    const status = String(row.attendanceStatus || "UNMARKED");
    attendance[status] = (attendance[status] ?? 0) + 1;
  }

  const homeworkAssignedCount = input.feedbacks.filter((row) => String(row.homework ?? "").trim()).length;
  const homeworkTrackingCount = input.feedbacks.filter((row) => row.previousHomeworkDone !== null).length;
  const homeworkDoneCount = input.feedbacks.filter((row) => row.previousHomeworkDone === true).length;
  const homeworkNotDoneCount = input.feedbacks.filter((row) => row.previousHomeworkDone === false).length;
  const sessionCount = sessionIds.size;
  const feedbackSessionCount = feedbackSessionIds.size;
  const feedbackCoveragePercent = sessionCount ? Math.round((feedbackSessionCount / sessionCount) * 100) : 0;
  const gaps: LearningEvidenceGap[] = [];

  if (!input.feedbacks.length) {
    gaps.push({ key: "feedback", label: "No verified feedback", detail: "There is no published, non-draft feedback in the selected period." });
  } else if (feedbackSessionCount < sessionCount) {
    gaps.push({ key: "feedback", label: "Feedback coverage incomplete", detail: `${Math.max(0, sessionCount - feedbackSessionCount)} formal lesson(s) have no published feedback in this period.` });
  }
  if ((attendance.UNMARKED ?? 0) > 0) {
    gaps.push({ key: "attendance", label: "Attendance needs completion", detail: `${attendance.UNMARKED} lesson(s) are still unmarked.` });
  }
  if (input.feedbacks.length > 0 && homeworkTrackingCount === 0) {
    gaps.push({ key: "homework", label: "Homework follow-through is not recorded", detail: "Add homework completion evidence before judging independent practice." });
  }
  if (!input.hasBaseline) {
    gaps.push({ key: "baseline", label: "Baseline evidence is missing", detail: "Add a diagnostic result or current level before making a progress claim." });
  }
  if (!input.hasLearningGoal) {
    gaps.push({ key: "goal", label: "Learning goal is missing", detail: "Record a measurable target and review date for the next learning-plan cycle." });
  }

  const parsed = input.feedbacks.map((row) => parseParentFeedbackSections(row.feedbackContent));
  return {
    sessionCount,
    feedbackCount: input.feedbacks.length,
    feedbackSessionCount,
    feedbackCoveragePercent,
    attendance,
    homeworkAssignedCount,
    homeworkTrackingCount,
    homeworkDoneCount,
    homeworkNotDoneCount,
    gaps,
    focusAreas: uniqueMeaningful(parsed.map((row) => row.currentFinding)),
    nextSteps: uniqueMeaningful(parsed.map((row) => row.nextPlan)),
  };
}

export function labelLearningEvidenceAttendance(status: string | null | undefined) {
  const value = String(status || "UNMARKED");
  if (value === "PRESENT") return "Present / 出席";
  if (value === "LATE") return "Late / 迟到";
  if (value === "ABSENT") return "Absent / 缺席";
  if (value === "EXCUSED") return "Excused / 请假";
  return "Unmarked / 未点名";
}
