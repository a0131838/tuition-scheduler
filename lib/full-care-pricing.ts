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
