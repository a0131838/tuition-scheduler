import { prisma } from "@/lib/prisma";

export const PAYNOW_TYPES = ["MOBILE", "NRIC", "UEN", "OTHER"] as const;
export type PayNowType = (typeof PAYNOW_TYPES)[number];

export type TeacherPaymentProfile = {
  tutorCode?: string | null;
  payNowType?: string | null;
  payNowValue?: string | null;
  payNowName?: string | null;
  payNowNote?: string | null;
};

export function normalizeTutorCode(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  return raw || null;
}

export function normalizePayNowType(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  return PAYNOW_TYPES.includes(raw as PayNowType) ? (raw as PayNowType) : null;
}

export function cleanTeacherPaymentProfile(input: Record<string, unknown>) {
  return {
    tutorCode: normalizeTutorCode(input.tutorCode),
    payNowType: normalizePayNowType(input.payNowType),
    payNowValue: String(input.payNowValue ?? "").trim() || null,
    payNowName: String(input.payNowName ?? "").trim() || null,
    payNowNote: String(input.payNowNote ?? "").trim() || null,
  };
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
