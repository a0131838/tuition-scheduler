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
