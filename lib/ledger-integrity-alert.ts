export const LEDGER_INTEGRITY_ALERT_KEY = "ledger_integrity_alert_v1";

export type LedgerIntegrityAlertState = {
  generatedAt: string;
  mismatchCount: number;
  noPackageDeductCount: number;
  totalIssueCount: number;
  detailPath: string;
  summaryPath: string;
};

export function parseLedgerIntegrityAlertState(raw: string | null | undefined): LedgerIntegrityAlertState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LedgerIntegrityAlertState>;
    if (!parsed || typeof parsed !== "object") return null;
    const generatedAt = String(parsed.generatedAt ?? "");
    if (!generatedAt) return null;
    return {
      generatedAt,
      mismatchCount: Number(parsed.mismatchCount ?? 0) || 0,
      noPackageDeductCount: Number(parsed.noPackageDeductCount ?? 0) || 0,
      totalIssueCount: Number(parsed.totalIssueCount ?? 0) || 0,
      detailPath: String(parsed.detailPath ?? ""),
      summaryPath: String(parsed.summaryPath ?? ""),
    };
  } catch {
    return null;
  }
}
