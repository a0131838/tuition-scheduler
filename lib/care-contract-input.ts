function cleanStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

export function careContractStringArray(value: unknown) {
  const direct = cleanStringArray(value);
  if (direct.length || !value || typeof value !== "object" || Array.isArray(value)) return direct;
  const row = value as Record<string, unknown>;
  return cleanStringArray(row.serviceIds).concat(cleanStringArray(row.items));
}

const CARE_CONTRACT_EXCLUSION_LABELS: Record<string, string> = {
  third_party_costs: "Third-party actual costs are charged separately / 第三方实际费用另计",
  medical_diagnosis: "No medical or psychological diagnosis or decision-making / 不提供医疗或心理诊断及决定",
  immigration_legal_advice: "No immigration legal advice or visa outcome guarantee / 不提供移民法律意见或签证结果保证",
  unlimited_onsite_support: "No unlimited after-hours or on-site support / 不包含无限次非工作时间或现场服务",
};

export function careContractExclusionLabels(value: unknown) {
  return careContractStringArray(value).map((id) => CARE_CONTRACT_EXCLUSION_LABELS[id] ?? id);
}
