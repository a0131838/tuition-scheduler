export function isFinalReportPreparationDue(totalMinutes: number | null | undefined, remainingMinutes: number | null | undefined) {
  const total = Number(totalMinutes ?? 0);
  const remaining = Number(remainingMinutes ?? 0);
  return total > 0 && remaining > 0 &&
    (remaining <= 8 * 60 || remaining * 10 <= total);
}

export function isFinalReportSubmissionDue(remainingMinutes: number | null | undefined, confirmedPeriodId?: string | null) {
  return Boolean(confirmedPeriodId) || (remainingMinutes != null && remainingMinutes <= 0);
}

export function packageUsagePercent(totalMinutes: number | null | undefined, remainingMinutes: number | null | undefined) {
  const total = Number(totalMinutes ?? 0);
  const remaining = Number(remainingMinutes ?? 0);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
}
