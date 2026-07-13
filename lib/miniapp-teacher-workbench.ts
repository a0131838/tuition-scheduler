import { formatBusinessDateOnly, formatBusinessDateTime, parseBusinessDateStart } from "@/lib/date-only";

export const MINIAPP_TEACHER_AVAILABILITY_DAYS = 30;

export function miniappTeacherMonthRange(rawMonth: string | null | undefined, now = new Date()) {
  const fallback = formatBusinessDateOnly(now).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(String(rawMonth ?? "").trim()) ? String(rawMonth).trim() : fallback;
  const start = parseBusinessDateStart(`${month}-01`);
  if (!start) throw new Error("Invalid month");
  const shifted = new Date(start.getTime() + 8 * 60 * 60 * 1000);
  const nextMonth = `${shifted.getUTCMonth() === 11 ? shifted.getUTCFullYear() + 1 : shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() === 11 ? 1 : shifted.getUTCMonth() + 2
  ).padStart(2, "0")}-01`;
  const end = parseBusinessDateStart(nextMonth);
  if (!end) throw new Error("Invalid month");
  return { month, start, end };
}

export function validateMiniappTeacherAvailabilityDate(rawDate: string, now = new Date()) {
  const date = parseBusinessDateStart(rawDate);
  if (!date) return { ok: false as const, message: "日期格式不正确" };
  const today = parseBusinessDateStart(formatBusinessDateOnly(now)) ?? now;
  const last = new Date(today.getTime() + MINIAPP_TEACHER_AVAILABILITY_DAYS * 24 * 60 * 60 * 1000);
  if (date < today || date > last) return { ok: false as const, message: "只能维护今天起未来30天的可用时间" };
  return { ok: true as const, date };
}

export function miniappTeacherDurationText(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest}分钟`;
  if (!rest) return `${hours}小时`;
  return `${hours}小时${rest}分钟`;
}

export function miniappTeacherExpenseStatusText(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "等待审批";
    case "APPROVED":
      return "已批准，等待付款";
    case "REJECTED":
      return "已驳回，需补充";
    case "PAID":
      return "已付款";
    case "WITHDRAWN":
      return "已撤回";
    default:
      return status || "-";
  }
}

export function miniappTeacherSessionTimeText(startAt: Date, endAt: Date) {
  return `${formatBusinessDateTime(startAt)} - ${formatBusinessDateTime(endAt).slice(11)}`;
}
