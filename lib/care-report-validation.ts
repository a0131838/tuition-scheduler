import type { CareReportStatus, CareReportType, CareRiskLevel } from "@prisma/client";

export const CARE_REPORT_TYPE_OPTIONS: Array<{ value: CareReportType; zh: string; en: string }> = [
  { value: "MONTHLY", zh: "月度报告", en: "Monthly report" },
  { value: "INCIDENT", zh: "重大事项报告", en: "Significant event report" },
  { value: "MILESTONE", zh: "阶段报告", en: "Milestone report" },
  { value: "TERM", zh: "学期报告", en: "Term report" },
];

export const CARE_REPORT_STATUS_LABELS: Record<CareReportStatus, { zh: string; en: string }> = {
  DRAFT: { zh: "草稿", en: "Draft" },
  SUBMITTED: { zh: "待审核", en: "Submitted" },
  RETURNED: { zh: "退回修改", en: "Returned" },
  APPROVED: { zh: "已批准", en: "Approved" },
  PUBLISHED: { zh: "已发布", en: "Published" },
  REVOKED: { zh: "已撤回", en: "Revoked" },
};

const REPORT_TYPES = new Set<CareReportType>(CARE_REPORT_TYPE_OPTIONS.map((item) => item.value));
const RISK_LEVELS = new Set<CareRiskLevel>(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export function careReportText(value: unknown, max = 6000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function requiredCareReportText(value: unknown, label: string, max = 6000) {
  const text = careReportText(value, max);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export function careReportType(value: unknown): CareReportType {
  const type = careReportText(value, 40) as CareReportType;
  if (!REPORT_TYPES.has(type)) throw new Error("Invalid care report type");
  return type;
}

export function careReportRiskLevel(value: unknown): CareRiskLevel {
  const level = careReportText(value, 40) as CareRiskLevel;
  if (!RISK_LEVELS.has(level)) throw new Error("Invalid care report risk level");
  return level;
}

export function canEditCareReport(status: CareReportStatus) {
  return status === "DRAFT" || status === "RETURNED";
}

export function assertCareReportTransition(from: CareReportStatus, to: CareReportStatus) {
  const allowed: Record<CareReportStatus, readonly CareReportStatus[]> = {
    DRAFT: ["SUBMITTED"],
    RETURNED: ["SUBMITTED"],
    SUBMITTED: ["RETURNED", "APPROVED"],
    APPROVED: ["PUBLISHED"],
    PUBLISHED: ["REVOKED"],
    REVOKED: [],
  };
  if (!allowed[from].includes(to)) throw new Error(`Report cannot move from ${from} to ${to}`);
}

export function careReportSnapshotCount(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const snapshot = value as Record<string, unknown>;
  return ["lessonCount", "feedbackCount", "activityCount", "attachmentCount"]
    .map((key) => Number(snapshot[key] ?? 0))
    .reduce((sum, count) => sum + (Number.isFinite(count) && count > 0 ? count : 0), 0);
}

export function assertCareReportReady(input: {
  title: string;
  overallSummary: string;
  actionsCompleted: string;
  nextPlan: string;
  sourceSnapshotJson: unknown;
  activityLinkCount: number;
  attachmentLinkCount: number;
}) {
  if (!input.title.trim()) throw new Error("Report title is required");
  if (!input.overallSummary.trim()) throw new Error("Overall summary is required");
  if (!input.actionsCompleted.trim()) throw new Error("Completed actions are required");
  if (!input.nextPlan.trim()) throw new Error("Next plan is required");
  for (const value of [input.overallSummary, input.actionsCompleted, input.nextPlan]) {
    if (value.includes("请负责人补充")) throw new Error("Replace generated placeholders before submitting the report");
  }
  const evidenceCount = careReportSnapshotCount(input.sourceSnapshotJson)
    + input.activityLinkCount
    + input.attachmentLinkCount;
  if (evidenceCount === 0) throw new Error("At least one lesson, feedback, care update or evidence file is required");
}

export function reportTypeLabel(type: CareReportType, english = false) {
  const option = CARE_REPORT_TYPE_OPTIONS.find((item) => item.value === type);
  return option ? (english ? option.en : option.zh) : type;
}
