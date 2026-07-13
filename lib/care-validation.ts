import type {
  CareActivityCategory,
  CareAudience,
  CareEngagementStatus,
  CareProgramType,
  CareRiskLevel,
  CareTaskPriority,
  CareTaskStatus,
} from "@prisma/client";

export const CARE_PROGRAM_OPTIONS: Array<{ value: CareProgramType; zh: string; en: string }> = [
  { value: "PRE_U_ACADEMIC_CARE", zh: "大学前学业托管", en: "Pre-university academic care" },
  { value: "PRE_U_FULL_COORDINATION", zh: "大学前全方位托管", en: "Pre-university full coordination" },
  { value: "UNIVERSITY_GROWTH", zh: "大学阶段成长管理", en: "University growth" },
  { value: "CAREER_LAUNCH", zh: "实习与就业支持", en: "Career launch" },
];

export const CARE_SCOPE_OPTIONS = [
  { id: "academic_management", zh: "学业管理", en: "Academic management", defaultOn: true },
  { id: "school_coordination", zh: "学校沟通", en: "School coordination", defaultOn: true },
  { id: "weekly_wellbeing", zh: "每周状态核对", en: "Weekly wellbeing check", defaultOn: true },
  { id: "medical_accompaniment", zh: "医疗预约及陪同", en: "Medical appointment and accompaniment", defaultOn: true },
  { id: "important_transport", zh: "机场及重要交通", en: "Airport and important transport", defaultOn: true },
  { id: "host_family_support", zh: "寄宿家庭筛选、更换和走访", en: "Host family support", defaultOn: true },
  { id: "holiday_care", zh: "假期住宿与临时照护协调", en: "Holiday accommodation and temporary care", defaultOn: true },
  { id: "visa_admin", zh: "签证/准证行政协助", en: "Visa/pass administration", defaultOn: true },
  { id: "daily_status_check", zh: "专项每日状态确认", en: "Daily status check", defaultOn: false },
  { id: "after_hours_onsite", zh: "非工作时间现场支持", en: "After-hours onsite support", defaultOn: false },
] as const;

export const CARE_ACTIVITY_OPTIONS: Array<{ value: CareActivityCategory; zh: string; en: string }> = [
  { value: "ACADEMIC", zh: "学习", en: "Academic" },
  { value: "SCHOOL", zh: "学校", en: "School" },
  { value: "LIFE", zh: "生活", en: "Life" },
  { value: "PARENT", zh: "家长", en: "Parent" },
  { value: "RISK", zh: "风险", en: "Risk" },
  { value: "APPLICATION", zh: "申请", en: "Application" },
  { value: "CAREER", zh: "升学/职业", en: "Career" },
  { value: "GENERAL", zh: "其他", en: "General" },
];

export const CARE_LIFE_SUBTYPES = [
  { value: "WEEKLY_WELLBEING", zh: "每周状态核对", en: "Weekly wellbeing" },
  { value: "MEDICAL_ACCOMPANIMENT", zh: "医疗预约及陪同", en: "Medical accompaniment" },
  { value: "IMPORTANT_TRANSPORT", zh: "机场及重要交通", en: "Important transport" },
  { value: "HOST_FAMILY_SUPPORT", zh: "寄宿家庭事项", en: "Host family support" },
  { value: "HOLIDAY_CARE", zh: "假期住宿与临时照护", en: "Holiday care" },
  { value: "VISA_ADMIN", zh: "签证/准证行政协助", en: "Visa/pass administration" },
  { value: "DAILY_STATUS_CHECK", zh: "专项每日状态确认", en: "Daily status check" },
  { value: "AFTER_HOURS_EMERGENCY", zh: "非工作时间紧急支持", en: "After-hours emergency" },
] as const;

export const CARE_RISK_OPTIONS: CareRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const CARE_AUDIENCE_OPTIONS: CareAudience[] = ["INTERNAL_ONLY", "PARENT"];
export const CARE_TASK_PRIORITY_OPTIONS: CareTaskPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
export const CARE_TASK_STATUS_OPTIONS: CareTaskStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

const PROGRAM_TYPES = new Set(CARE_PROGRAM_OPTIONS.map((item) => item.value));
const ACTIVITY_CATEGORIES = new Set(CARE_ACTIVITY_OPTIONS.map((item) => item.value));
const RISK_LEVELS = new Set(CARE_RISK_OPTIONS);
const AUDIENCES = new Set(CARE_AUDIENCE_OPTIONS);
const TASK_PRIORITIES = new Set(CARE_TASK_PRIORITY_OPTIONS);
const TASK_STATUSES = new Set(CARE_TASK_STATUS_OPTIONS);
const SCOPE_IDS = new Set<string>(CARE_SCOPE_OPTIONS.map((item) => item.id));

export function careText(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function requiredCareText(value: unknown, label: string, max = 1000) {
  const text = careText(value, max);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export function parseCareDateTime(value: unknown) {
  const text = careText(value, 40);
  if (!text) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T00:00:00+08:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)
      ? `${text}:00+08:00`
      : text;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function careProgramType(value: unknown): CareProgramType {
  const normalized = careText(value, 80) as CareProgramType;
  if (!PROGRAM_TYPES.has(normalized)) throw new Error("Invalid care program type");
  return normalized;
}

export function careActivityCategory(value: unknown): CareActivityCategory {
  const normalized = careText(value, 40) as CareActivityCategory;
  if (!ACTIVITY_CATEGORIES.has(normalized)) throw new Error("Invalid activity category");
  return normalized;
}

export function careRiskLevel(value: unknown): CareRiskLevel {
  const normalized = careText(value, 40) as CareRiskLevel;
  if (!RISK_LEVELS.has(normalized)) throw new Error("Invalid risk level");
  return normalized;
}

export function careAudience(value: unknown): CareAudience {
  const normalized = careText(value, 40) as CareAudience;
  if (!AUDIENCES.has(normalized)) throw new Error("Invalid audience");
  return normalized;
}

export function careTaskPriority(value: unknown): CareTaskPriority {
  const normalized = careText(value, 40) as CareTaskPriority;
  if (!TASK_PRIORITIES.has(normalized)) throw new Error("Invalid task priority");
  return normalized;
}

export function careTaskStatus(value: unknown): CareTaskStatus {
  const normalized = careText(value, 40) as CareTaskStatus;
  if (!TASK_STATUSES.has(normalized)) throw new Error("Invalid task status");
  return normalized;
}

export function careScopeIds(values: unknown) {
  const input = Array.isArray(values) ? values : [values];
  const selected = new Set<string>();
  for (const value of input) {
    const id = careText(value, 80);
    if (SCOPE_IDS.has(id)) selected.add(id);
  }
  return CARE_SCOPE_OPTIONS.map((item) => item.id).filter((id) => selected.has(id));
}

export function scopeIdsFromJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return careScopeIds((value as { serviceIds?: unknown }).serviceIds);
}

export function assertCareActivation(input: {
  startDate: Date | null;
  caseOwnerUserId: string | null;
  scopeIds: string[];
  hasActiveCaseOwner: boolean;
}) {
  if (!input.startDate) throw new Error("Start date is required before activation");
  if (!input.caseOwnerUserId || !input.hasActiveCaseOwner) throw new Error("An active case owner is required before activation");
  if (input.scopeIds.length === 0) throw new Error("At least one service scope is required before activation");
}

const ENGAGEMENT_TRANSITIONS: Record<CareEngagementStatus, CareEngagementStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertCareStatusTransition(from: CareEngagementStatus, to: CareEngagementStatus) {
  if (!ENGAGEMENT_TRANSITIONS[from].includes(to)) throw new Error(`Cannot change care status from ${from} to ${to}`);
}

export function assertCareActivity(input: {
  riskLevel: CareRiskLevel;
  ownerUserId: string | null;
  nextAction: string;
  nextActionDue: Date | null;
  audience: CareAudience;
  publicSummary: string;
}) {
  if ((input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL") && (!input.ownerUserId || !input.nextAction || !input.nextActionDue)) {
    throw new Error("High-risk records require an owner, next action and due time");
  }
  if (input.audience !== "INTERNAL_ONLY" && !input.publicSummary) {
    throw new Error("Parent-visible records require a public summary");
  }
  if (input.nextAction && !input.nextActionDue) throw new Error("Next action due time is required");
}

export function assertCareTaskUpdate(input: {
  status: CareTaskStatus;
  completionEvidence: string;
  nextFollowUpAt: Date | null;
}) {
  if (input.status === "DONE" && !input.completionEvidence) throw new Error("Completion result is required");
  if (input.status === "WAITING_EXTERNAL" && !input.nextFollowUpAt) throw new Error("Next follow-up time is required while waiting externally");
}
