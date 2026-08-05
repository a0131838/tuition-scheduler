export type FullCareProgramType = "PRE_U_ACADEMIC_CARE" | "PRE_U_FULL_COORDINATION";
export type FullCareCourseTier = "STANDARD" | "IB_AP";

export const FULL_CARE_PRICING_VERSION = "FC2026_V1";
export const FULL_CARE_SPECIAL_DISCOUNT_MAX_RATE = 0.15;

type FullCarePlanSeed = {
  value: string;
  programType: FullCareProgramType;
  tier: FullCareCourseTier;
  hours: 100 | 200 | 300;
  discountRate: 0 | 0.05 | 0.08;
  tuitionListFee: number;
  careListFee: number;
  tuitionFee: number;
  careServiceFee: number;
  totalFee: number;
  labelEn: string;
  labelZh: string;
};

export const FULL_CARE_PROGRAMS = {
  PRE_U_ACADEMIC_CARE: {
    labelEn: "Academic Full Care (family accompanied)",
    labelZh: "全程学业托管（家人陪读）",
    annualListFee: 12_800,
  },
  PRE_U_FULL_COORDINATION: {
    labelEn: "Comprehensive Care Coordination (family unaccompanied)",
    labelZh: "全方位托管协调服务（家人不陪读）",
    annualListFee: 19_600,
  },
} as const;

function plan(seed: FullCarePlanSeed) {
  const listFee = seed.tuitionListFee + seed.careListFee;
  return {
    ...seed,
    pricingVersion: FULL_CARE_PRICING_VERSION,
    listFee,
    bundleSavings: listFee - seed.totalFee,
  } as const;
}

// Monetary values are intentionally explicit. Do not recalculate these commercial
// rounded totals at runtime: contracts, invoices and package ledgers must agree.
export const FULL_CARE_PRICING_PLANS = [
  plan({ value: "FC2026_ACADEMIC_STANDARD_100", programType: "PRE_U_ACADEMIC_CARE", tier: "STANDARD", hours: 100, discountRate: 0, tuitionListFee: 14_380, careListFee: 12_800, tuitionFee: 14_380, careServiceFee: 12_800, totalFee: 27_180, labelEn: "Academic Full Care + 100h standard tuition", labelZh: "全程学业托管（家人陪读）+ 100小时标准课程" }),
  plan({ value: "FC2026_ACADEMIC_STANDARD_200", programType: "PRE_U_ACADEMIC_CARE", tier: "STANDARD", hours: 200, discountRate: 0.05, tuitionListFee: 28_760, careListFee: 12_800, tuitionFee: 27_340, careServiceFee: 12_160, totalFee: 39_500, labelEn: "Academic Full Care + 200h standard tuition", labelZh: "全程学业托管（家人陪读）+ 200小时标准课程" }),
  plan({ value: "FC2026_ACADEMIC_STANDARD_300", programType: "PRE_U_ACADEMIC_CARE", tier: "STANDARD", hours: 300, discountRate: 0.08, tuitionListFee: 43_140, careListFee: 12_800, tuitionFee: 39_724, careServiceFee: 11_776, totalFee: 51_500, labelEn: "Academic Full Care + 300h standard tuition", labelZh: "全程学业托管（家人陪读）+ 300小时标准课程" }),
  plan({ value: "FC2026_ACADEMIC_IB_AP_100", programType: "PRE_U_ACADEMIC_CARE", tier: "IB_AP", hours: 100, discountRate: 0, tuitionListFee: 24_800, careListFee: 12_800, tuitionFee: 24_800, careServiceFee: 12_800, totalFee: 37_600, labelEn: "Academic Full Care + 100h IB/AP tuition", labelZh: "全程学业托管（家人陪读）+ 100小时IB/AP课程" }),
  plan({ value: "FC2026_ACADEMIC_IB_AP_200", programType: "PRE_U_ACADEMIC_CARE", tier: "IB_AP", hours: 200, discountRate: 0.05, tuitionListFee: 49_600, careListFee: 12_800, tuitionFee: 47_140, careServiceFee: 12_160, totalFee: 59_300, labelEn: "Academic Full Care + 200h IB/AP tuition", labelZh: "全程学业托管（家人陪读）+ 200小时IB/AP课程" }),
  plan({ value: "FC2026_ACADEMIC_IB_AP_300", programType: "PRE_U_ACADEMIC_CARE", tier: "IB_AP", hours: 300, discountRate: 0.08, tuitionListFee: 74_400, careListFee: 12_800, tuitionFee: 68_424, careServiceFee: 11_776, totalFee: 80_200, labelEn: "Academic Full Care + 300h IB/AP tuition", labelZh: "全程学业托管（家人陪读）+ 300小时IB/AP课程" }),
  plan({ value: "FC2026_COORD_STANDARD_100", programType: "PRE_U_FULL_COORDINATION", tier: "STANDARD", hours: 100, discountRate: 0, tuitionListFee: 14_380, careListFee: 19_600, tuitionFee: 14_380, careServiceFee: 19_600, totalFee: 33_980, labelEn: "Comprehensive Care Coordination + 100h standard tuition", labelZh: "全方位托管协调服务（家人不陪读）+ 100小时标准课程" }),
  plan({ value: "FC2026_COORD_STANDARD_200", programType: "PRE_U_FULL_COORDINATION", tier: "STANDARD", hours: 200, discountRate: 0.05, tuitionListFee: 28_760, careListFee: 19_600, tuitionFee: 27_280, careServiceFee: 18_620, totalFee: 45_900, labelEn: "Comprehensive Care Coordination + 200h standard tuition", labelZh: "全方位托管协调服务（家人不陪读）+ 200小时标准课程" }),
  plan({ value: "FC2026_COORD_STANDARD_300", programType: "PRE_U_FULL_COORDINATION", tier: "STANDARD", hours: 300, discountRate: 0.08, tuitionListFee: 43_140, careListFee: 19_600, tuitionFee: 39_668, careServiceFee: 18_032, totalFee: 57_700, labelEn: "Comprehensive Care Coordination + 300h standard tuition", labelZh: "全方位托管协调服务（家人不陪读）+ 300小时标准课程" }),
  plan({ value: "FC2026_COORD_IB_AP_100", programType: "PRE_U_FULL_COORDINATION", tier: "IB_AP", hours: 100, discountRate: 0, tuitionListFee: 24_800, careListFee: 19_600, tuitionFee: 24_800, careServiceFee: 19_600, totalFee: 44_400, labelEn: "Comprehensive Care Coordination + 100h IB/AP tuition", labelZh: "全方位托管协调服务（家人不陪读）+ 100小时IB/AP课程" }),
  plan({ value: "FC2026_COORD_IB_AP_200", programType: "PRE_U_FULL_COORDINATION", tier: "IB_AP", hours: 200, discountRate: 0.05, tuitionListFee: 49_600, careListFee: 19_600, tuitionFee: 47_080, careServiceFee: 18_620, totalFee: 65_700, labelEn: "Comprehensive Care Coordination + 200h IB/AP tuition", labelZh: "全方位托管协调服务（家人不陪读）+ 200小时IB/AP课程" }),
  plan({ value: "FC2026_COORD_IB_AP_300", programType: "PRE_U_FULL_COORDINATION", tier: "IB_AP", hours: 300, discountRate: 0.08, tuitionListFee: 74_400, careListFee: 19_600, tuitionFee: 68_468, careServiceFee: 18_032, totalFee: 86_500, labelEn: "Comprehensive Care Coordination + 300h IB/AP tuition", labelZh: "全方位托管协调服务（家人不陪读）+ 300小时IB/AP课程" }),
] as const;

const LEGACY_FULL_CARE_PLANS = [
  plan({ value: "STANDARD_200", programType: "PRE_U_ACADEMIC_CARE", tier: "STANDARD", hours: 200, discountRate: 0, tuitionListFee: 28_760, careListFee: 12_800, tuitionFee: 28_760, careServiceFee: 12_800, totalFee: 41_560, labelEn: "Legacy Full Care + 200h standard tuition", labelZh: "旧版全程托管 + 200小时标准课程" }),
  plan({ value: "STANDARD_300", programType: "PRE_U_ACADEMIC_CARE", tier: "STANDARD", hours: 300, discountRate: 0, tuitionListFee: 43_140, careListFee: 12_800, tuitionFee: 43_140, careServiceFee: 12_800, totalFee: 55_940, labelEn: "Legacy Full Care + 300h standard tuition", labelZh: "旧版全程托管 + 300小时标准课程" }),
  plan({ value: "IB_AP_200", programType: "PRE_U_ACADEMIC_CARE", tier: "IB_AP", hours: 200, discountRate: 0, tuitionListFee: 49_600, careListFee: 12_800, tuitionFee: 49_600, careServiceFee: 12_800, totalFee: 62_400, labelEn: "Legacy Full Care + 200h IB/AP tuition", labelZh: "旧版全程托管 + 200小时IB/AP课程" }),
  plan({ value: "IB_AP_300", programType: "PRE_U_ACADEMIC_CARE", tier: "IB_AP", hours: 300, discountRate: 0, tuitionListFee: 74_400, careListFee: 12_800, tuitionFee: 74_400, careServiceFee: 12_800, totalFee: 87_200, labelEn: "Legacy Full Care + 300h IB/AP tuition", labelZh: "旧版全程托管 + 300小时IB/AP课程" }),
] as const;

export type FullCarePricingPlanValue = typeof FULL_CARE_PRICING_PLANS[number]["value"];

export function fullCarePricingPlan(value: string | null | undefined) {
  return [...FULL_CARE_PRICING_PLANS, ...LEGACY_FULL_CARE_PLANS].find((item) => item.value === value) ?? null;
}

export function requireFullCarePricingPlan(value: string | null | undefined) {
  const selected = FULL_CARE_PRICING_PLANS.find((item) => item.value === value) ?? null;
  if (!selected) throw new Error("Select a valid current Full Care pricing plan");
  return selected;
}

export function fullCarePricingPlanLabel(value: string | null | undefined) {
  const selected = fullCarePricingPlan(value);
  return selected ? `${selected.labelEn} / ${selected.labelZh}` : "Full Care / 全程托管";
}

export function validateFullCareSpecialDiscount(totalFee: number, amount: unknown, reason: unknown) {
  const discount = Math.round(Number(amount ?? 0) * 100) / 100;
  const note = String(reason ?? "").trim();
  if (!Number.isFinite(discount) || discount < 0) throw new Error("Special discount must be a valid non-negative amount");
  if (discount > Math.round(totalFee * FULL_CARE_SPECIAL_DISCOUNT_MAX_RATE * 100) / 100) {
    throw new Error("Management special discount cannot exceed 15% of the published bundle price");
  }
  if (discount > 0 && note.length < 4) throw new Error("Enter the reason for the management special discount");
  return { amount: discount, reason: discount > 0 ? note : null };
}

export function isIbApCourseName(value: string | null | undefined) {
  const name = String(value ?? "").trim().toUpperCase();
  if (!name) return false;
  return /(^|[^A-Z0-9])IB(?:DP)?(?=$|[^A-Z0-9])/.test(name) || /(^|[^A-Z0-9])AP(?=$|[^A-Z0-9])/.test(name) || name.includes("INTERNATIONAL BACCALAUREATE") || name.includes("ADVANCED PLACEMENT");
}

export function fullCareRequiresIbApTier(courseNames: Array<string | null | undefined>) {
  return courseNames.some(isIbApCourseName);
}

export function assertFullCarePricingPlanMatchesCourses(planValue: string | null | undefined, courseNames: Array<string | null | undefined>, programType?: string | null) {
  const selected = requireFullCarePricingPlan(planValue);
  if (programType && selected.programType !== programType) {
    throw new Error("The Full Care pricing plan must match the student's care project type. / 价格方案必须与学生的托管项目类型一致。");
  }
  if (fullCareRequiresIbApTier(courseNames) && selected.tier !== "IB_AP") {
    throw new Error("This package includes IB/AP tuition. Select an IB/AP Full Care price plan before generating the contract. / 当前课包包含 IB/AP 课程，必须选择 IB/AP 全程托管价格方案后才能生成合同。");
  }
  return selected;
}

export function assertFullCareCourseAssignmentsMatchPlans(courseNames: Array<string | null | undefined>, activePlanValues: Array<string | null | undefined>) {
  if (!fullCareRequiresIbApTier(courseNames)) return;
  if (activePlanValues.some((value) => fullCarePricingPlan(value)?.tier === "STANDARD")) {
    throw new Error("This package has an active standard-tier Full Care contract. Void and replace it with an IB/AP contract before adding or switching to IB/AP courses. / 当前课包已有有效的标准档全程托管合同，必须先作废并更正为 IB/AP 合同，才能新增或切换到 IB/AP 课程。");
  }
}
