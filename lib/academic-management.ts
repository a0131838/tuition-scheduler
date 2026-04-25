export const ACADEMIC_MANAGEMENT_LOOKAHEAD_DAYS = 14;

export const ACADEMIC_STUDENT_LANES = [
  { value: "all", zh: "全部学生", en: "All students" },
  { value: "own", zh: "自己学生", en: "Own students" },
  { value: "partner", zh: "合作方学生", en: "Partner students" },
  { value: "unclassified", zh: "未分类", en: "Unclassified" },
] as const;

export type AcademicStudentLane = (typeof ACADEMIC_STUDENT_LANES)[number]["value"];

export const ACADEMIC_SERVICE_PLANS = [
  {
    value: "STANDARD_COURSE",
    zh: "普通课程",
    en: "Standard course",
    cadenceZh: "按课后反馈和阶段报告跟进",
    monthlyReport: false,
  },
  {
    value: "ACADEMIC_MANAGEMENT",
    zh: "学业管理",
    en: "Academic management",
    cadenceZh: "每月至少一次学业管理复盘",
    monthlyReport: true,
  },
  {
    value: "FULL_CARE",
    zh: "全程托管",
    en: "Full care",
    cadenceZh: "每月复盘，并对排课、反馈和家长预期做连续跟进",
    monthlyReport: true,
  },
] as const;

export const ACADEMIC_RISK_LEVELS = [
  { value: "LOW", zh: "低风险", en: "Low risk", color: "#166534" },
  { value: "MEDIUM", zh: "中风险", en: "Medium risk", color: "#c2410c" },
  { value: "HIGH", zh: "高风险", en: "High risk", color: "#be123c" },
] as const;

const PROFILE_FIELDS = [
  "curriculum",
  "englishLevel",
  "parentExpectation",
  "mainAnxiety",
  "academicRiskLevel",
  "currentRiskSummary",
  "nextAction",
  "advisorOwner",
  "servicePlanType",
] as const;

export type AcademicProfileLike = Partial<Record<(typeof PROFILE_FIELDS)[number], string | null | undefined>>;

export function normalizeAcademicStudentLane(value?: string | null): AcademicStudentLane {
  return ACADEMIC_STUDENT_LANES.some((item) => item.value === value) ? (value as AcademicStudentLane) : "all";
}

export function academicStudentLaneLabel(value?: string | null) {
  return ACADEMIC_STUDENT_LANES.find((item) => item.value === value)?.zh ?? ACADEMIC_STUDENT_LANES[0].zh;
}

export function packageAcademicStudentLane(settlementMode?: string | null): Exclude<AcademicStudentLane, "all" | "unclassified"> {
  return settlementMode === "ONLINE_PACKAGE_END" || settlementMode === "OFFLINE_MONTHLY" ? "partner" : "own";
}

export function studentAcademicStudentLane(input: {
  studentTypeName?: string | null;
}): Exclude<AcademicStudentLane, "all"> {
  const typeName = String(input.studentTypeName ?? "").trim();
  if (!typeName) return "unclassified";
  if (/合作方|partner/i.test(typeName)) return "partner";
  if (/自己学生|直客学生|own\s*student|self\s*student/i.test(typeName)) return "own";
  return "unclassified";
}

export function matchesAcademicStudentLane(input: { studentTypeName?: string | null }, lane: AcademicStudentLane) {
  if (lane === "all") return true;
  return studentAcademicStudentLane(input) === lane;
}

export function academicLanePackageWarning(input: {
  studentTypeName?: string | null;
  settlementModes?: Array<string | null | undefined>;
}) {
  const lane = studentAcademicStudentLane({ studentTypeName: input.studentTypeName });
  const packageLanes = new Set((input.settlementModes ?? []).map((mode) => packageAcademicStudentLane(mode)));
  if (lane === "unclassified") return "学生类型缺失";
  if (packageLanes.size > 1) return "同一学生存在不同课包结算模式";
  const [packageLane] = Array.from(packageLanes);
  if (packageLane && packageLane !== lane) return "学生类型与课包结算模式不一致";
  return null;
}

export function academicRiskLabel(value?: string | null) {
  return ACADEMIC_RISK_LEVELS.find((item) => item.value === value)?.zh ?? "未设置";
}

export function academicRiskColor(value?: string | null) {
  return ACADEMIC_RISK_LEVELS.find((item) => item.value === value)?.color ?? "#64748b";
}

export function servicePlanLabel(value?: string | null) {
  if (!value) return "未设置";
  return ACADEMIC_SERVICE_PLANS.find((item) => item.value === value)?.zh ?? value;
}

export function servicePlanCadence(value?: string | null) {
  return ACADEMIC_SERVICE_PLANS.find((item) => item.value === value)?.cadenceZh ?? "未设置固定节奏";
}

export function requiresMonthlyAcademicReport(value?: string | null) {
  return Boolean(ACADEMIC_SERVICE_PLANS.find((item) => item.value === value)?.monthlyReport);
}

export function academicProfileCompleteness(profile: AcademicProfileLike) {
  const filled = PROFILE_FIELDS.filter((field) => String(profile[field] ?? "").trim().length > 0);
  return {
    filled: filled.length,
    total: PROFILE_FIELDS.length,
    percent: Math.round((filled.length / PROFILE_FIELDS.length) * 100),
    missing: PROFILE_FIELDS.filter((field) => !filled.includes(field)),
  };
}

export function isAcademicProfileIncomplete(profile: AcademicProfileLike) {
  return academicProfileCompleteness(profile).percent < 70;
}
