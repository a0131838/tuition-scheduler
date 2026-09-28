import { readRenewalForecastSnapshot, formatRenewalUnits } from "./renewal-forecast-display";
import type { Lang } from "./i18n";

export const RISK_RESOLVED = "RISK_RESOLVED";

export function renewalRiskResolutionLabel(lang: Lang = "ZH") {
  const en = "Risk resolved (renewal not verified)";
  const zh = "风险已解除（未核验续费）";
  return lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
}

/** A missing forecast proves neither payment nor activation of new entitlements. */
export function automaticRenewalResolution(status: string, packageStatus: string | undefined, hasCurrentRenewalContract = false) {
  // A committed renewal still needs its financial/entitlement follow-up even if hours are safe.
  if (hasCurrentRenewalContract || !["PENDING_CONTACT", "PARENT_NOTIFIED", "PARENT_CONSIDERING"].includes(status)) return null;
  if (packageStatus === "ACTIVE") return {
    status: RISK_RESOLVED,
    note: "The hours risk is no longer present; payment and renewal activation have not been verified. / 当前课时风险已解除，尚未核验续费收款或新增权益。",
    snoozeDays: null,
  };
  if (packageStatus) return {
    status: "PAUSED_SPECIAL",
    note: "The source package is inactive; this risk reminder has ended without confirming a renewal. / 原课包已停用，结束本轮风险提醒，不代表已完成续费。",
    snoozeDays: 90,
  };
  return null;
}

export function assertRiskResolutionTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus !== nextStatus && [currentStatus, nextStatus].includes(RISK_RESOLVED)) {
    throw new Error("Risk resolution is managed by the risk scan. Keep this history and scan again for a new risk. / 风险解除由系统扫描核验，请保留历史；如风险再次出现，重新扫描生成跟进任务。");
  }
}

// Published Mini Program clients have a fixed status picker. Preserve the canonical
// outcome and display label while using their existing "special handling" bucket.
export function renewalForLegacyMiniapp<T extends { status: string; riskLevel?: string; forecastSnapshot?: unknown }>(row: T) {
  const result = row.status === RISK_RESOLVED ? { ...row, canonicalStatus: RISK_RESOLVED, status: "PAUSED_SPECIAL" } : row;
  const forecast = readRenewalForecastSnapshot(row.forecastSnapshot);
  if (forecast?.unit === "COUNT") return { ...result, canonicalRiskLevel: row.riskLevel,
    riskLevel: `Count package: ${formatRenewalUnits(forecast.remainingUnits, "COUNT", "BILINGUAL")}. Review on web; hour fields are not applicable / 按次课包请用网页核对，小时栏不适用`,
  };
  if (row.riskLevel === "REVIEW") return { ...result, canonicalRiskLevel: "REVIEW", riskLevel: "Consumption needs review / 消耗待核对" };
  return row.riskLevel === "RESOLVED" || row.riskLevel === "INACTIVE"
    ? { ...result, canonicalRiskLevel: row.riskLevel, riskLevel: row.riskLevel === "RESOLVED" ? "Risk resolved / 风险已解除" : "Package inactive / 原课包已停用" }
    : result;
}

export function canonicalRenewalStatus(currentStatus: string, requestedStatus: string, legacyMiniapp = false) {
  return legacyMiniapp && currentStatus === RISK_RESOLVED && requestedStatus === "PAUSED_SPECIAL"
    ? RISK_RESOLVED : requestedStatus;
}

// A forecast may discover a later contract, but cannot reassign an invoice that
// staff already selected or attach a different invoice to a verified payment.
export function renewalLinksForScan(
  current: { contractId: string | null; invoiceId: string | null; paymentConfirmedAt?: Date | null } | null | undefined,
  forecast: { contractId: string | null; invoiceId: string | null },
) {
  if (!current) return { contractId: forecast.contractId, invoiceId: forecast.invoiceId };
  if (current.invoiceId || current.paymentConfirmedAt) return { contractId: current.contractId, invoiceId: current.invoiceId };
  if (current.contractId) return {
    contractId: current.contractId,
    invoiceId: current.contractId === forecast.contractId ? forecast.invoiceId : null,
  };
  return { contractId: forecast.contractId, invoiceId: forecast.invoiceId };
}
