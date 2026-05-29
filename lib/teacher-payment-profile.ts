import { prisma } from "@/lib/prisma";

export const PAYNOW_TYPES = ["MOBILE", "NRIC", "UEN", "OTHER"] as const;
export type PayNowType = (typeof PAYNOW_TYPES)[number];
export const TEACHER_PAYMENT_METHODS = ["PAYNOW", "WISE"] as const;
export type TeacherPaymentMethod = (typeof TEACHER_PAYMENT_METHODS)[number];
export const PAYMENT_PROFILE_STATUSES = ["PENDING_REVIEW", "VERIFIED", "REJECTED"] as const;
export type PaymentProfileStatus = (typeof PAYMENT_PROFILE_STATUSES)[number];

export type TeacherPaymentProfile = {
  tutorCode?: string | null;
  paymentMethod?: string | null;
  payNowType?: string | null;
  payNowValue?: string | null;
  payNowName?: string | null;
  payNowNote?: string | null;
  wiseAccountName?: string | null;
  wiseEmail?: string | null;
  wisePhone?: string | null;
  wiseTag?: string | null;
  wiseCountry?: string | null;
  wiseCurrency?: string | null;
  wiseNote?: string | null;
  paymentProfileStatus?: string | null;
  paymentProfileRejectReason?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankBranchCode?: string | null;
};

export function normalizeTutorCode(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  return raw || null;
}

export function normalizePayNowType(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  return PAYNOW_TYPES.includes(raw as PayNowType) ? (raw as PayNowType) : null;
}

export function normalizeTeacherPaymentMethod(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  return TEACHER_PAYMENT_METHODS.includes(raw as TeacherPaymentMethod) ? (raw as TeacherPaymentMethod) : null;
}

export function normalizePaymentProfileStatus(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  return PAYMENT_PROFILE_STATUSES.includes(raw as PaymentProfileStatus) ? (raw as PaymentProfileStatus) : null;
}

export function cleanTeacherPaymentProfile(input: Record<string, unknown>) {
  return {
    tutorCode: normalizeTutorCode(input.tutorCode),
    paymentMethod: normalizeTeacherPaymentMethod(input.paymentMethod),
    payNowType: normalizePayNowType(input.payNowType),
    payNowValue: String(input.payNowValue ?? "").trim() || null,
    payNowName: String(input.payNowName ?? "").trim() || null,
    payNowNote: String(input.payNowNote ?? "").trim() || null,
    wiseAccountName: String(input.wiseAccountName ?? "").trim() || null,
    wiseEmail: String(input.wiseEmail ?? "").trim() || null,
    wisePhone: String(input.wisePhone ?? "").trim() || null,
    wiseTag: String(input.wiseTag ?? "").trim() || null,
    wiseCountry: String(input.wiseCountry ?? "").trim() || null,
    wiseCurrency: String(input.wiseCurrency ?? "").trim().toUpperCase() || null,
    wiseNote: String(input.wiseNote ?? "").trim() || null,
    paymentProfileStatus: normalizePaymentProfileStatus(input.paymentProfileStatus),
    paymentProfileRejectReason: String(input.paymentProfileRejectReason ?? "").trim() || null,
    bankName: String(input.bankName ?? "").trim() || null,
    bankAccountName: String(input.bankAccountName ?? "").trim() || null,
    bankAccountNumber: String(input.bankAccountNumber ?? "").trim() || null,
    bankBranchCode: String(input.bankBranchCode ?? "").trim() || null,
  };
}

export function formatTeacherPaymentMethod(value?: string | null) {
  if (value === "PAYNOW") return "PayNow";
  if (value === "WISE") return "Wise";
  if (value === "BANK_TRANSFER") return "Legacy Bank Transfer";
  return "";
}

export function formatPaymentProfileStatus(value?: string | null) {
  if (value === "VERIFIED") return "Verified";
  if (value === "REJECTED") return "Rejected";
  if (value === "PENDING_REVIEW") return "Pending Review";
  return "";
}

export function formatPayNowType(value?: string | null) {
  if (value === "MOBILE") return "Mobile";
  if (value === "NRIC") return "NRIC/FIN";
  if (value === "UEN") return "UEN";
  if (value === "OTHER") return "Other";
  return "";
}

export function maskPayNowValue(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= 4) return raw;
  return `${"*".repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
}

export function maskBankAccountNumber(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= 4) return raw;
  return `${"*".repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
}

export function formatTutorDisplayName(teacher: { name: string; tutorCode?: string | null }) {
  return teacher.tutorCode ? `${teacher.tutorCode} ${teacher.name}` : teacher.name;
}

export function nextTutorCodeFromExisting(codes: Array<string | null | undefined>) {
  let max = 0;
  for (const code of codes) {
    const match = String(code ?? "").trim().toUpperCase().match(/^T(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }
  return `T${String(max + 1).padStart(3, "0")}`;
}

export async function allocateNextTutorCode(db: Pick<typeof prisma, "teacher"> = prisma) {
  const rows = await db.teacher.findMany({
    where: { tutorCode: { not: null } },
    select: { tutorCode: true },
  });
  return nextTutorCodeFromExisting(rows.map((row) => row.tutorCode));
}
