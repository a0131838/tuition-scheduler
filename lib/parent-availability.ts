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

export type ParentAvailabilityFieldRow = {
  label: string;
  value: string;
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

export function coerceParentAvailabilityPayload(value: unknown): ParentAvailabilityPayload {
  const payload = (value ?? {}) as Partial<ParentAvailabilityPayload>;
  return {
    weekdays: Array.isArray(payload.weekdays) ? payload.weekdays.map((item) => String(item)) : [],
    timeRanges: Array.isArray(payload.timeRanges)
      ? payload.timeRanges
          .map((item) => ({
            start: typeof item?.start === "string" ? item.start : "",
            end: typeof item?.end === "string" ? item.end : "",
          }))
          .filter((item) => item.start && item.end)
      : [],
    earliestStartDate: typeof payload.earliestStartDate === "string" ? payload.earliestStartDate : null,
    modePreference: typeof payload.modePreference === "string" ? payload.modePreference : null,
    teacherPreference: typeof payload.teacherPreference === "string" ? payload.teacherPreference : null,
    notes: typeof payload.notes === "string" ? payload.notes : null,
  };
}

export function formatParentAvailabilityFieldRows(payload: ParentAvailabilityPayload): ParentAvailabilityFieldRow[] {
  const weekdayLabelMap = new Map<string, string>(
    PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => [option.value, `${option.zh} / ${option.en}`])
  );
  const rows: ParentAvailabilityFieldRow[] = [];

  if (payload.weekdays.length > 0) {
    rows.push({
      label: "Available weekdays / 可上课星期",
      value: payload.weekdays.map((value) => weekdayLabelMap.get(value) ?? value).join("、"),
    });
  }
  if (payload.timeRanges.length > 0) {
    rows.push({
      label: "Preferred time ranges / 常用可上课时间段",
      value: payload.timeRanges.map((range) => `${range.start}-${range.end}`).join("；"),
    });
  }
  if (payload.earliestStartDate) {
    rows.push({
      label: "Earliest start date / 最早可开始日期",
      value: payload.earliestStartDate,
    });
  }
  if (payload.modePreference) {
    rows.push({
      label: "Mode preference / 上课形式偏好",
      value: payload.modePreference,
    });
  }
  if (payload.teacherPreference) {
    rows.push({
      label: "Teacher preference / 老师偏好",
      value: payload.teacherPreference,
    });
  }
  if (payload.notes) {
    rows.push({
      label: "Notes / 备注",
      value: payload.notes,
    });
  }

  return rows;
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

export function buildParentAvailabilityShareText(args: {
  studentName: string;
  courseLabel?: string | null;
  url: string;
}) {
  const courseLine = args.courseLabel ? `课程 / Course: ${args.courseLabel}` : "";
  return [
    `您好，请帮忙填写 ${args.studentName} 的可上课时间。`,
    courseLine,
    "这只是时间收集表，不代表已经排课成功。",
    "",
    `Hello, please share the available lesson times for ${args.studentName}.`,
    args.courseLabel ? `Course: ${args.courseLabel}` : "",
    "This form only collects available times. It does not confirm the final schedule by itself.",
    "",
    args.url,
  ]
    .filter(Boolean)
    .join("\n");
}
