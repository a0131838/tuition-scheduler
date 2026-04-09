import crypto from "crypto";

export const PARENT_AVAILABILITY_LINK_TTL_DAYS = 7;

export const PARENT_AVAILABILITY_WEEKDAY_OPTIONS = [
  { value: "MON", zh: "周一", en: "Mon" },
  { value: "TUE", zh: "周二", en: "Tue" },
  { value: "WED", zh: "周三", en: "Wed" },
  { value: "THU", zh: "周四", en: "Thu" },
  { value: "FRI", zh: "周五", en: "Fri" },
  { value: "SAT", zh: "周六", en: "Sat" },
  { value: "SUN", zh: "周日", en: "Sun" },
] as const;

export type ParentAvailabilityPayload = {
  weekdays: string[];
  timeRanges: Array<{ start: string; end: string }>;
  earliestStartDate: string | null;
  modePreference: string | null;
  teacherPreference: string | null;
  notes: string | null;
};

function trimToNull(value: FormDataEntryValue | null, max: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function normalizeTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  return text;
}

function normalizeDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export function createParentAvailabilityToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function buildParentAvailabilityPath(token: string) {
  return `/availability/${encodeURIComponent(token)}`;
}

export function buildParentAvailabilityExpiresAt() {
  return new Date(Date.now() + PARENT_AVAILABILITY_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function parseParentAvailabilityFormData(formData: FormData): ParentAvailabilityPayload {
  const weekdays = PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => option.value).filter((value) =>
    formData.getAll("weekdays").map((item) => String(item)).includes(value)
  );
  const timeRanges = [
    {
      start: normalizeTime(formData.get("timeRange1Start")),
      end: normalizeTime(formData.get("timeRange1End")),
    },
    {
      start: normalizeTime(formData.get("timeRange2Start")),
      end: normalizeTime(formData.get("timeRange2End")),
    },
  ].filter((range): range is { start: string; end: string } => Boolean(range.start && range.end && range.end > range.start));

  return {
    weekdays,
    timeRanges,
    earliestStartDate: normalizeDate(formData.get("earliestStartDate")),
    modePreference: trimToNull(formData.get("modePreference"), 40),
    teacherPreference: trimToNull(formData.get("teacherPreference"), 120),
    notes: trimToNull(formData.get("notes"), 1000),
  };
}

export function summarizeParentAvailabilityPayload(payload: ParentAvailabilityPayload) {
  const weekdayLabelMap = new Map<string, string>(
    PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => [option.value, `${option.zh}/${option.en}`])
  );
  const parts: string[] = [];

  if (payload.weekdays.length > 0) {
    parts.push(`Available days: ${payload.weekdays.map((value) => weekdayLabelMap.get(value) ?? value).join(", ")}`);
  }
  if (payload.timeRanges.length > 0) {
    parts.push(`Available time ranges: ${payload.timeRanges.map((range) => `${range.start}-${range.end}`).join("; ")}`);
  }
  if (payload.earliestStartDate) {
    parts.push(`Earliest start: ${payload.earliestStartDate}`);
  }
  if (payload.modePreference) {
    parts.push(`Mode preference: ${payload.modePreference}`);
  }
  if (payload.teacherPreference) {
    parts.push(`Teacher preference: ${payload.teacherPreference}`);
  }
  if (payload.notes) {
    parts.push(`Parent note: ${payload.notes}`);
  }

  return parts.join("\n");
}

export function hasParentAvailabilityPayloadContent(payload: ParentAvailabilityPayload) {
  return Boolean(
    payload.weekdays.length > 0 ||
      payload.timeRanges.length > 0 ||
      payload.earliestStartDate ||
      payload.modePreference ||
      payload.teacherPreference ||
      payload.notes
  );
}
