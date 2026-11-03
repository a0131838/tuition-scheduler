import { HrLeaveStatus, HrLeaveType, HrLeaveLedgerEntryType } from "@prisma/client";

export const ACCOUNTING_DAY_MINUTES = 480;
export const BALANCE_LEAVE_TYPES = new Set<HrLeaveType>([
  HrLeaveType.ANNUAL, HrLeaveType.SICK_OUTPATIENT,
  HrLeaveType.HOSPITALISATION, HrLeaveType.OFF_IN_LIEU,
]);

type LedgerRow = { leaveType: HrLeaveType; entryType: HrLeaveLedgerEntryType; minutes: number; createdAt: Date; expiresAt: Date | null };
type RequestRow = { leaveType: HrLeaveType; status: HrLeaveStatus; startAt: Date; endAt: Date; durationMinutes: number };

export type LeaveSummaryRow = {
  leaveType: HrLeaveType;
  tracksBalance: boolean;
  openingMinutes: number | null;
  grantedMinutes: number | null;
  adjustedMinutes: number | null;
  expiredMinutes: number | null;
  utilisedMinutes: number;
  ongoingApprovedMinutes: number;
  futureApprovedMinutes: number;
  pendingMinutes: number;
  remainingMinutes: number | null;
  afterPendingMinutes: number | null;
  ledgerMismatch: boolean;
};

function singaporeYearStart(now: Date) {
  const year = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Singapore", year: "numeric" }).format(now);
  return new Date(`${year}-01-01T00:00:00+08:00`);
}

export function calculateLeaveSummary(ledger: LedgerRow[], requests: RequestRow[], now = new Date()): Map<HrLeaveType, LeaveSummaryRow> {
  const yearStart = singaporeYearStart(now);
  const summary = new Map<HrLeaveType, LeaveSummaryRow>();
  for (const leaveType of Object.values(HrLeaveType)) {
    const tracksBalance = BALANCE_LEAVE_TYPES.has(leaveType);
    let opening = 0, granted = 0, adjusted = 0, expired = 0, remaining = 0, booked = 0;
    for (const row of ledger) {
      if (row.leaveType !== leaveType || row.createdAt > now) continue;
      const activeAtStart = row.createdAt < yearStart && (!row.expiresAt || row.expiresAt >= yearStart);
      const activeNow = !row.expiresAt || row.expiresAt >= now;
      if (activeAtStart) opening += row.minutes;
      if (activeNow) remaining += row.minutes;
      if (row.createdAt >= yearStart && (row.entryType === HrLeaveLedgerEntryType.OPENING || row.entryType === HrLeaveLedgerEntryType.ACCRUAL)) granted += row.minutes;
      if (row.createdAt >= yearStart && row.entryType === HrLeaveLedgerEntryType.ADJUSTMENT) adjusted += row.minutes;
      if (row.expiresAt && row.expiresAt >= yearStart && row.expiresAt < now) expired += row.minutes;
      if (row.entryType === HrLeaveLedgerEntryType.USED || row.entryType === HrLeaveLedgerEntryType.RESTORED) booked -= row.minutes;
    }
    let utilised = 0, ongoing = 0, future = 0, pending = 0;
    for (const row of requests) {
      if (row.leaveType !== leaveType) continue;
      if (row.status === HrLeaveStatus.SUBMITTED) pending += row.durationMinutes;
      if (row.status === HrLeaveStatus.APPROVED) {
        if (row.endAt <= now) utilised += row.durationMinutes;
        else if (row.startAt > now) future += row.durationMinutes;
        else ongoing += row.durationMinutes;
      }
    }
    summary.set(leaveType, {
      leaveType, tracksBalance,
      openingMinutes: tracksBalance ? opening : null,
      grantedMinutes: tracksBalance ? granted : null,
      adjustedMinutes: tracksBalance ? adjusted : null,
      expiredMinutes: tracksBalance ? expired : null,
      utilisedMinutes: utilised, ongoingApprovedMinutes: ongoing,
      futureApprovedMinutes: future, pendingMinutes: pending,
      remainingMinutes: tracksBalance ? remaining : null,
      afterPendingMinutes: tracksBalance ? remaining - pending : null,
      ledgerMismatch: tracksBalance && booked !== utilised + ongoing + future,
    });
  }
  return summary;
}

export function leaveDays(minutes: number | null) {
  return minutes === null ? "—" : `${Number((minutes / ACCOUNTING_DAY_MINUTES).toFixed(2))}`;
}
