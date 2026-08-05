import type {
  CareActivityCategory,
  CareAttachmentCategory,
  CareAudience,
  CareEngagementStatus,
  CareProgramType,
  CareRiskLevel,
  CareStudentConsentStatus,
  CareTaskPriority,
  CareTaskStatus,
} from "@prisma/client";

export const CARE_PROGRAM_OPTIONS: Array<{ value: CareProgramType; zh: string; en: string }> = [
  { value: "PRE_U_ACADEMIC_CARE", zh: "全程学业托管（家人陪读）", en: "Academic Full Care (family accompanied)" },
  { value: "PRE_U_FULL_COORDINATION", zh: "全方位托管协调服务（家人不陪读）", en: "Comprehensive Care Coordination (family unaccompanied)" },
  { value: "UNIVERSITY_GROWTH", zh: "大学学业管理", en: "University academic management" },
  { value: "POSTGRAD_PREPARATION", zh: "研究生准备", en: "Postgraduate preparation" },
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
  { id: "university_semester_planning", zh: "学期与课程规划", en: "Semester and module planning", defaultOn: false },
  { id: "university_module_deadlines", zh: "作业与考试节点管理", en: "Assessment deadline management", defaultOn: false },
  { id: "university_gpa_credits", zh: "GPA、学分与毕业进度", en: "GPA, credits and graduation progress", defaultOn: false },
  { id: "university_academic_risk", zh: "挂科与学术风险干预", en: "Academic risk intervention", defaultOn: false },
  { id: "university_faculty_coordination", zh: "教授、导师与学校沟通", en: "Faculty and advisor coordination", defaultOn: false },
  { id: "university_wellbeing", zh: "大学生状态核对", en: "University wellbeing check", defaultOn: false },
  { id: "university_housing_support", zh: "大学住宿协调", en: "University accommodation coordination", defaultOn: false },
  { id: "postgrad_strategy", zh: "研究生方向与申请策略", en: "Postgraduate direction and strategy", defaultOn: false },
  { id: "postgrad_gap_plan", zh: "申请差距与背景提升", en: "Readiness gap and profile plan", defaultOn: false },
  { id: "postgrad_shortlist", zh: "选校选专业与分层", en: "Programme shortlist and positioning", defaultOn: false },
  { id: "postgrad_materials", zh: "文书、推荐信与材料", en: "Statements, references and materials", defaultOn: false },
  { id: "postgrad_application_tracking", zh: "申请提交与结果跟进", en: "Application and outcome tracking", defaultOn: false },
  { id: "postgrad_interview_offer", zh: "面试、Offer与入学决定", en: "Interview, offer and enrolment decision", defaultOn: false },
  { id: "career_direction", zh: "职业方向与能力差距", en: "Career direction and skills gap", defaultOn: false },
  { id: "career_materials", zh: "简历、LinkedIn与作品集", en: "CV, LinkedIn and portfolio", defaultOn: false },
  { id: "career_opportunity_tracking", zh: "实习与岗位申请跟进", en: "Internship and job application tracking", defaultOn: false },
  { id: "career_interview_prep", zh: "测评与面试准备", en: "Assessment and interview preparation", defaultOn: false },
  { id: "career_offer_decision", zh: "Offer比较与入职决定", en: "Offer comparison and decision", defaultOn: false },
  { id: "internship_followup", zh: "实习目标、反馈与转正", en: "Internship goals, feedback and conversion", defaultOn: false },
  { id: "work_authorization_support", zh: "工作资格行政协助", en: "Work authorization administration", defaultOn: false },
] as const;

const PRE_U_SCOPE_IDS = CARE_SCOPE_OPTIONS.slice(0, 10).map((item) => item.id);

export const CARE_PROGRAM_SCOPE_IDS: Record<CareProgramType, readonly string[]> = {
  PRE_U_ACADEMIC_CARE: PRE_U_SCOPE_IDS,
  PRE_U_FULL_COORDINATION: PRE_U_SCOPE_IDS,
  UNIVERSITY_GROWTH: [
    "university_semester_planning",
    "university_module_deadlines",
    "university_gpa_credits",
    "university_academic_risk",
    "university_faculty_coordination",
    "university_wellbeing",
    "visa_admin",
    "university_housing_support",
    "medical_accompaniment",
    "important_transport",
  ],
  POSTGRAD_PREPARATION: [
    "postgrad_strategy",
    "postgrad_gap_plan",
    "postgrad_shortlist",
    "postgrad_materials",
    "postgrad_application_tracking",
    "postgrad_interview_offer",
    "visa_admin",
  ],
  CAREER_LAUNCH: [
    "career_direction",
    "career_materials",
    "career_opportunity_tracking",
    "career_interview_prep",
    "career_offer_decision",
    "internship_followup",
    "work_authorization_support",
  ],
};

export const CARE_PROGRAM_DEFAULT_SCOPE_IDS: Record<CareProgramType, readonly string[]> = {
  PRE_U_ACADEMIC_CARE: ["academic_management", "school_coordination", "weekly_wellbeing"],
  PRE_U_FULL_COORDINATION: [
    "academic_management",
    "school_coordination",
    "weekly_wellbeing",
    "medical_accompaniment",
    "important_transport",
    "host_family_support",
    "holiday_care",
    "visa_admin",
  ],
  UNIVERSITY_GROWTH: CARE_PROGRAM_SCOPE_IDS.UNIVERSITY_GROWTH.slice(0, 5),
  POSTGRAD_PREPARATION: CARE_PROGRAM_SCOPE_IDS.POSTGRAD_PREPARATION.slice(0, 6),
  CAREER_LAUNCH: CARE_PROGRAM_SCOPE_IDS.CAREER_LAUNCH.slice(0, 6),
};

export const CARE_STUDENT_CONSENT_OPTIONS: Array<{ value: CareStudentConsentStatus; zh: string; en: string }> = [
  { value: "NOT_RECORDED", zh: "尚未记录", en: "Not recorded" },
  { value: "GRANTED", zh: "同意全部所选栏目", en: "Granted for all selected sections" },
  { value: "LIMITED", zh: "仅同意部分栏目", en: "Limited to selected sections" },
  { value: "WITHDRAWN", zh: "已撤回", en: "Withdrawn" },
];

export const CARE_PARENT_VISIBILITY_OPTIONS = [
  { id: "academic_progress", zh: "学业进展", en: "Academic progress" },
  { id: "academic_risks", zh: "学业与毕业风险", en: "Academic and graduation risks" },
  { id: "postgrad_progress", zh: "研究生准备进展", en: "Postgraduate preparation" },
  { id: "career_progress", zh: "实习与就业进展", en: "Internship and career progress" },
  { id: "formal_reports", zh: "正式阶段报告", en: "Formal progress reports" },
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

const CARE_PROGRAM_ACTIVITY_TYPES: Record<CareProgramType, readonly CareActivityCategory[]> = {
  PRE_U_ACADEMIC_CARE: CARE_ACTIVITY_OPTIONS.map((item) => item.value),
  PRE_U_FULL_COORDINATION: CARE_ACTIVITY_OPTIONS.map((item) => item.value),
  UNIVERSITY_GROWTH: ["ACADEMIC", "SCHOOL", "RISK", "PARENT", "GENERAL"],
  POSTGRAD_PREPARATION: ["APPLICATION", "ACADEMIC", "RISK", "PARENT", "GENERAL"],
  CAREER_LAUNCH: ["CAREER", "RISK", "PARENT", "GENERAL"],
};

export function careActivityOptionsForProgram(programType: CareProgramType) {
  const allowed = new Set(CARE_PROGRAM_ACTIVITY_TYPES[programType]);
  return CARE_ACTIVITY_OPTIONS.filter((item) => allowed.has(item.value));
}

export function assertCareActivityProgramType(programType: CareProgramType, category: CareActivityCategory) {
  if (!CARE_PROGRAM_ACTIVITY_TYPES[programType].includes(category)) {
    throw new Error("Activity type is not available for this care programme");
  }
}

export const CARE_ACTIVITY_SOURCE_OPTIONS = [
  { value: "EMAIL", zh: "邮件", en: "Email" },
  { value: "PHONE", zh: "电话", en: "Phone call" },
  { value: "MEETING", zh: "会议", en: "Meeting" },
  { value: "SCHOOL_PORTAL", zh: "学校系统", en: "School portal" },
  { value: "MESSAGE", zh: "即时消息", en: "Message" },
  { value: "DOCUMENT", zh: "文件", en: "Document" },
  { value: "OTHER", zh: "其他", en: "Other" },
] as const;

export const CARE_ATTACHMENT_OPTIONS: Array<{ value: CareAttachmentCategory; zh: string; en: string }> = [
  { value: "SCHOOL_EMAIL", zh: "学校邮件", en: "School email" },
  { value: "SCHOOL_NOTICE", zh: "学校通知", en: "School notice" },
  { value: "MEETING_MINUTES", zh: "会议纪要", en: "Meeting minutes" },
  { value: "ACADEMIC_REPORT", zh: "成绩或学业报告", en: "Academic report" },
  { value: "MEDICAL", zh: "医疗资料", en: "Medical" },
  { value: "TRANSPORT", zh: "交通确认", en: "Transport" },
  { value: "HOST_FAMILY", zh: "寄宿家庭", en: "Host family" },
  { value: "VISA", zh: "签证或准证", en: "Visa or pass" },
  { value: "OTHER", zh: "其他证据", en: "Other evidence" },
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
const ATTACHMENT_CATEGORIES = new Set(CARE_ATTACHMENT_OPTIONS.map((item) => item.value));
const ACTIVITY_SOURCES = new Set(CARE_ACTIVITY_SOURCE_OPTIONS.map((item) => item.value));
const STUDENT_CONSENT_STATUSES = new Set(CARE_STUDENT_CONSENT_OPTIONS.map((item) => item.value));
const PARENT_VISIBILITY_IDS = new Set<string>(CARE_PARENT_VISIBILITY_OPTIONS.map((item) => item.id));
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

export function isUniversityCareProgram(value: CareProgramType | string) {
  return value === "UNIVERSITY_GROWTH" || value === "POSTGRAD_PREPARATION" || value === "CAREER_LAUNCH";
}

export function careScopeOptionsForProgram(programType: CareProgramType, selectedIds: string[] = []) {
  const allowed = new Set(CARE_PROGRAM_SCOPE_IDS[programType]);
  for (const id of selectedIds) allowed.add(id);
  return CARE_SCOPE_OPTIONS.filter((item) => allowed.has(item.id));
}

export function defaultCareScopeIdsForProgram(programType: CareProgramType) {
  return [...CARE_PROGRAM_DEFAULT_SCOPE_IDS[programType]];
}

export function careStudentConsentStatus(value: unknown): CareStudentConsentStatus {
  const normalized = careText(value, 40) as CareStudentConsentStatus;
  if (!STUDENT_CONSENT_STATUSES.has(normalized)) throw new Error("Invalid student consent status");
  return normalized;
}

export function careParentVisibilityIds(values: unknown) {
  const input = Array.isArray(values) ? values : [values];
  const selected = new Set<string>();
  for (const value of input) {
    const id = careText(value, 80);
    if (PARENT_VISIBILITY_IDS.has(id)) selected.add(id);
  }
  return CARE_PARENT_VISIBILITY_OPTIONS.map((item) => item.id).filter((id) => selected.has(id));
}

export function parentVisibilityIdsFromJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return careParentVisibilityIds((value as { sectionIds?: unknown }).sectionIds);
}

export function assertCareUniversityConsent(input: {
  status: CareStudentConsentStatus;
  parentVisibilityIds: string[];
  consentNote: string;
}) {
  if (input.status === "GRANTED" || input.status === "LIMITED") {
    if (input.parentVisibilityIds.length === 0) throw new Error("Select at least one parent-visible section");
    if (!input.consentNote) throw new Error("Consent record or evidence note is required");
  }
  if (input.status === "WITHDRAWN" && !input.consentNote) throw new Error("Withdrawal note is required");
}

export function assertCareUniversityProfileReady(input: {
  institution: string | null;
  degreeProgram: string | null;
  currentTerm: string | null;
  expectedGraduationDate: Date | null;
}) {
  if (!input.institution || !input.degreeProgram || !input.currentTerm || !input.expectedGraduationDate) {
    throw new Error("University, degree, current term and expected graduation are required before activation");
  }
}

export function careActivityCategory(value: unknown): CareActivityCategory {
  const normalized = careText(value, 40) as CareActivityCategory;
  if (!ACTIVITY_CATEGORIES.has(normalized)) throw new Error("Invalid activity category");
  return normalized;
}

export function careActivitySource(value: unknown) {
  const normalized = careText(value, 40).toUpperCase();
  if (!normalized) return null;
  if (!ACTIVITY_SOURCES.has(normalized as (typeof CARE_ACTIVITY_SOURCE_OPTIONS)[number]["value"])) {
    throw new Error("Invalid activity source");
  }
  return normalized;
}

export function careAttachmentCategory(value: unknown): CareAttachmentCategory {
  const normalized = careText(value, 40) as CareAttachmentCategory;
  if (!ATTACHMENT_CATEGORIES.has(normalized)) throw new Error("Invalid attachment category");
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

export function assertCareLaunchReadiness(input: {
  hasSignedCareContract: boolean;
  hasParentReportAccess: boolean;
  hasReviewer: boolean;
  hasInitialPlan: boolean;
}) {
  const missing: string[] = [];
  if (!input.hasSignedCareContract) missing.push("signed Full Care agreement");
  if (!input.hasParentReportAccess) missing.push("parent miniapp binding with report access");
  if (!input.hasReviewer) missing.push("monthly report reviewer");
  if (!input.hasInitialPlan) missing.push("initial service plan");
  if (missing.length) throw new Error(`Cannot activate Full Care project. Complete: ${missing.join(", ")}`);
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
