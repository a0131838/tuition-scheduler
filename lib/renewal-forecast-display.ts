import type { Lang } from "./i18n";
export type RenewalForecastSnapshot = {
  version: 1; unit: "MINUTES" | "COUNT" | "PERIOD";
  remainingUnits: number | null; scheduledUnits: number; weeklyUnits: number | null;
  needsReview: boolean; checkedAt: string;
};
export function readRenewalForecastSnapshot(value: unknown): RenewalForecastSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !["MINUTES","COUNT","PERIOD"].includes(String(v.unit)) || typeof v.needsReview !== "boolean" || typeof v.checkedAt !== "string") return null;
  const numeric = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  if (!(v.remainingUnits === null || numeric(v.remainingUnits)) || !numeric(v.scheduledUnits) || !(v.weeklyUnits === null || numeric(v.weeklyUnits))) return null;
  return v as RenewalForecastSnapshot;
}
export function formatRenewalUnits(value: number | null, unit: RenewalForecastSnapshot["unit"], lang: Lang) {
  const label = (en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
  if (unit === "PERIOD") return label("Validity period", "有效期");
  if (value == null) return label("Pending review", "待核对");
  const amount = unit === "MINUTES" ? value / 60 : value;
  return `${Number(amount.toFixed(2))} ${unit === "COUNT" ? label("sessions", "次") : label("hours", "小时")}`;
}
