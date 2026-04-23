type StudentTypeLike = {
  id: string;
  name: string;
  isActive?: boolean | null;
};

export const PREFERRED_DIRECT_BILLING_STUDENT_TYPE_NAME = "自己学生-新生";
export const LEGACY_DIRECT_BILLING_STUDENT_TYPE_NAME = "直客学生";

function normalizeStudentTypeName(name?: string | null) {
  return String(name ?? "").trim().toLowerCase();
}

export function isDirectBillingStudentTypeName(name?: string | null) {
  const raw = String(name ?? "").trim();
  if (!raw) return false;
  const normalized = normalizeStudentTypeName(raw);
  if (normalized.includes("自己学生")) return true;
  if (normalized.includes("直客学生")) return true;
  return /(^|\s|-|_)(own|self)\s*student(s)?($|\s|-|_)/i.test(raw);
}

export function pickPreferredDirectBillingStudentType<T extends StudentTypeLike>(types: T[]) {
  const active = types.filter((type) => type.isActive !== false);
  return (
    active.find((type) => type.name === PREFERRED_DIRECT_BILLING_STUDENT_TYPE_NAME) ??
    active.find((type) => String(type.name ?? "").startsWith("自己学生")) ??
    active.find((type) => type.name === LEGACY_DIRECT_BILLING_STUDENT_TYPE_NAME) ??
    active.find((type) => isDirectBillingStudentTypeName(type.name)) ??
    null
  );
}
