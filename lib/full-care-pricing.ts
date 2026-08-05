export const FULL_CARE_SERVICE_FEE = 12_800;

export const FULL_CARE_PRICING_PLANS = [
  {
    value: "STANDARD_200",
    tier: "STANDARD",
    hours: 200,
    tuitionFee: 28_760,
    careServiceFee: FULL_CARE_SERVICE_FEE,
    totalFee: 41_560,
    labelEn: "Full Care + 200h standard tuition",
    labelZh: "全程托管 + 200小时标准课程",
  },
  {
    value: "STANDARD_300",
    tier: "STANDARD",
    hours: 300,
    tuitionFee: 43_140,
    careServiceFee: FULL_CARE_SERVICE_FEE,
    totalFee: 55_940,
    labelEn: "Full Care + 300h standard tuition",
    labelZh: "全程托管 + 300小时标准课程",
  },
  {
    value: "IB_AP_200",
    tier: "IB_AP",
    hours: 200,
    tuitionFee: 49_600,
    careServiceFee: FULL_CARE_SERVICE_FEE,
    totalFee: 62_400,
    labelEn: "Full Care + 200h IB/AP tuition",
    labelZh: "全程托管 + 200小时IB/AP课程",
  },
  {
    value: "IB_AP_300",
    tier: "IB_AP",
    hours: 300,
    tuitionFee: 74_400,
    careServiceFee: FULL_CARE_SERVICE_FEE,
    totalFee: 87_200,
    labelEn: "Full Care + 300h IB/AP tuition",
    labelZh: "全程托管 + 300小时IB/AP课程",
  },
] as const;

export type FullCarePricingPlanValue = typeof FULL_CARE_PRICING_PLANS[number]["value"];

export function fullCarePricingPlan(value: string | null | undefined) {
  return FULL_CARE_PRICING_PLANS.find((plan) => plan.value === value) ?? null;
}

export function requireFullCarePricingPlan(value: string | null | undefined) {
  const plan = fullCarePricingPlan(value);
  if (!plan) throw new Error("Select a valid Full Care pricing plan");
  return plan;
}

export function fullCarePricingPlanLabel(value: string | null | undefined) {
  const plan = fullCarePricingPlan(value);
  return plan ? `${plan.labelEn} / ${plan.labelZh}` : "Full Care / 全程托管";
}

export function isIbApCourseName(value: string | null | undefined) {
  const name = String(value ?? "").trim().toUpperCase();
  if (!name) return false;
  return (
    /(^|[^A-Z0-9])IB(?:DP)?(?=$|[^A-Z0-9])/.test(name) ||
    /(^|[^A-Z0-9])AP(?=$|[^A-Z0-9])/.test(name) ||
    name.includes("INTERNATIONAL BACCALAUREATE") ||
    name.includes("ADVANCED PLACEMENT")
  );
}

export function fullCareRequiresIbApTier(courseNames: Array<string | null | undefined>) {
  return courseNames.some(isIbApCourseName);
}

export function assertFullCarePricingPlanMatchesCourses(
  planValue: string | null | undefined,
  courseNames: Array<string | null | undefined>
) {
  const plan = requireFullCarePricingPlan(planValue);
  if (fullCareRequiresIbApTier(courseNames) && plan.tier !== "IB_AP") {
    throw new Error(
      "This package includes IB/AP tuition. Select an IB/AP Full Care price plan before generating the contract. / 当前课包包含 IB/AP 课程，必须选择 IB/AP 全程托管价格方案后才能生成合同。"
    );
  }
  return plan;
}

export function assertFullCareCourseAssignmentsMatchPlans(
  courseNames: Array<string | null | undefined>,
  activePlanValues: Array<string | null | undefined>
) {
  if (!fullCareRequiresIbApTier(courseNames)) return;
  const hasActiveStandardPlan = activePlanValues.some(
    (value) => fullCarePricingPlan(value)?.tier === "STANDARD"
  );
  if (hasActiveStandardPlan) {
    throw new Error(
      "This package has an active standard-tier Full Care contract. Void and replace it with an IB/AP contract before adding or switching to IB/AP courses. / 当前课包已有有效的标准档全程托管合同，必须先作废并更正为 IB/AP 合同，才能新增或切换到 IB/AP 课程。"
    );
  }
}
