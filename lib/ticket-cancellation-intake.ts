import { formatBusinessDateOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";

const DAY_MS = 24 * 60 * 60 * 1000;

export const CANCELLATION_LOOKBACK_DAYS = 7;
export const CANCELLATION_LOOKAHEAD_DAYS = 90;

export type CancellationSourceStatus = "UPCOMING" | "IN_PROGRESS" | "ENDED" | "ATTENDANCE_LOCKED";

export function attendanceLocksCancellation(attendance: {
  status?: string | null;
  deductedMinutes?: number | null;
  deductedCount?: number | null;
  packageId?: string | null;
  excusedCharge?: boolean | null;
} | null | undefined) {
  return Boolean(
    attendance &&
    (attendance.status !== "UNMARKED" || Number(attendance.deductedMinutes) > 0 || Number(attendance.deductedCount) > 0 || attendance.packageId || attendance.excusedCharge)
  );
}

export function cancellationSourceDateWindow(dateText: string | null | undefined, now = new Date()) {
  const todayText = formatBusinessDateOnly(now);
  const todayStart = parseBusinessDateStart(todayText)!;
  const requestedText = String(dateText ?? "").trim() || todayText;
  const dayStart = parseBusinessDateStart(requestedText);
  const dayEnd = parseBusinessDateEnd(requestedText);
  const minStart = new Date(todayStart.getTime() - CANCELLATION_LOOKBACK_DAYS * DAY_MS);
  const maxStart = new Date(todayStart.getTime() + CANCELLATION_LOOKAHEAD_DAYS * DAY_MS);
  if (!dayStart || !dayEnd || dayStart < minStart || dayStart > maxStart) return null;
  return {
    dateText: requestedText,
    start: dayStart,
    end: dayEnd,
    minDate: formatBusinessDateOnly(minStart),
    maxDate: formatBusinessDateOnly(maxStart),
    today: todayText,
  };
}

export function cancellationSourceStatus(input: {
  startAt: Date;
  endAt: Date;
  attendanceLocked?: boolean;
}, now = new Date()): { status: CancellationSourceStatus; label: string; canAutoExecute: boolean } {
  if (input.attendanceLocked) {
    return { status: "ATTENDANCE_LOCKED", label: "已有点名或扣课，需管理员处理", canAutoExecute: false };
  }
  if (input.startAt > now) {
    return { status: "UPCOMING", label: "未开始，可处理", canAutoExecute: true };
  }
  if (input.endAt > now) {
    return { status: "IN_PROGRESS", label: "正在上课，需教务核实", canAutoExecute: false };
  }
  return { status: "ENDED", label: "已结束，需教务核实", canAutoExecute: false };
}

export function isManualCancellationTarget(input: {
  actionType?: string | null;
  sourceSessionId?: string | null;
  requestedStartAt?: Date | string | null;
  courseLabel?: string | null;
}, now = new Date()) {
  if (input.actionType !== "CANCEL_SESSION" || input.sourceSessionId) return false;
  const requestedStartAt = input.requestedStartAt instanceof Date
    ? input.requestedStartAt
    : input.requestedStartAt
      ? new Date(input.requestedStartAt)
      : null;
  return Boolean(
    requestedStartAt &&
    !Number.isNaN(requestedStartAt.getTime()) &&
    String(input.courseLabel ?? "").trim() &&
    cancellationSourceDateWindow(formatBusinessDateOnly(requestedStartAt), now)
  );
}
