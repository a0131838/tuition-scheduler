export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateOnly(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

export function formatMonthKey(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}`;
}

const BUSINESS_TIMEZONE_OFFSET_MINUTES = 8 * 60;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnlyToUTCNoon(value: string) {
  const m = String(value).trim().match(DATE_ONLY_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function formatUTCDateOnly(value: Date) {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

export function formatUTCMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}`;
}

export function parseBusinessDateStart(value: string) {
  const m = String(value).trim().match(DATE_ONLY_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BUSINESS_TIMEZONE_OFFSET_MINUTES * 60_000);
}

export function parseBusinessDateEnd(value: string) {
  const start = parseBusinessDateStart(value);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function formatBusinessDateOnly(value: Date) {
  return formatUTCDateOnly(new Date(value.getTime() + BUSINESS_TIMEZONE_OFFSET_MINUTES * 60_000));
}

export function formatBusinessDateTime(value: Date, withSeconds = false) {
  const shifted = new Date(value.getTime() + BUSINESS_TIMEZONE_OFFSET_MINUTES * 60_000);
  const base =
    `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())} ` +
    `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
  if (!withSeconds) return base;
  return `${base}:${pad2(shifted.getUTCSeconds())}`;
}

export function formatBusinessTimeOnly(value: Date, withSeconds = false) {
  const shifted = new Date(value.getTime() + BUSINESS_TIMEZONE_OFFSET_MINUTES * 60_000);
  const base = `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
  if (!withSeconds) return base;
  return `${base}:${pad2(shifted.getUTCSeconds())}`;
}

export function normalizeDateOnly(value: string | Date | null | undefined, fallback?: Date | null) {
  if (value instanceof Date) {
    return Number.isNaN(+value) ? (fallback ? formatDateOnly(fallback) : null) : formatBusinessDateOnly(value);
  }
  const raw = String(value ?? "").trim();
  if (raw) {
    const direct = raw.match(DATE_ONLY_RE);
    if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
    const parsed = new Date(raw);
    if (!Number.isNaN(+parsed)) return formatBusinessDateOnly(parsed);
  }
  return fallback ? formatDateOnly(fallback) : null;
}

export function normalizeNullableDateOnly(value: string | Date | null | undefined) {
  return normalizeDateOnly(value, null);
}

export function monthKeyFromDateOnly(value: string | Date | null | undefined) {
  const normalized = normalizeDateOnly(value, new Date()) ?? formatDateOnly(new Date());
  return normalized.slice(0, 7);
}
