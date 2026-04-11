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

export type ParentAvailabilitySelectionMode = "weekly" | "calendar";

export type ParentAvailabilityDateSelection = {
  date: string;
  start: string;
  end: string;
};

export type ParentAvailabilityPayload = {
  selectionMode: ParentAvailabilitySelectionMode;
  weekdays: string[];
  timeRanges: Array<{ start: string; end: string }>;
  dateSelections: ParentAvailabilityDateSelection[];
  earliestStartDate: string | null;
  modePreference: string | null;
  teacherPreference: string | null;
  notes: string | null;
};

export type ParentAvailabilityFieldRow = {
  label: string;
  value: string;
};

const MAX_CALENDAR_RANGES_PER_DATE = 3;

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

function parseDateStart(value: string | null | undefined) {
  const normalized = normalizeDate(value ?? null);
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectCalendarDateSelections(formData: FormData, date: string) {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) return [];

  const indexedRanges = Array.from({ length: MAX_CALENDAR_RANGES_PER_DATE }, (_, index) => ({
    start: normalizeTime(formData.get(`specificDateStart:${date}:${index}`)),
    end: normalizeTime(formData.get(`specificDateEnd:${date}:${index}`)),
  })).filter((range): range is { start: string; end: string } => Boolean(range.start && range.end && range.end > range.start));

  if (indexedRanges.length > 0) {
    return indexedRanges.map((range) => ({ date: normalizedDate, start: range.start, end: range.end }));
  }

  const legacyStart = normalizeTime(formData.get(`specificDateStart:${date}`));
  const legacyEnd = normalizeTime(formData.get(`specificDateEnd:${date}`));
  if (!legacyStart || !legacyEnd || legacyEnd <= legacyStart) {
    return [];
  }

  return [{ date: normalizedDate, start: legacyStart, end: legacyEnd }];
}

function formatGroupedDateSelections(dateSelections: ParentAvailabilityDateSelection[]) {
  const grouped = new Map<string, string[]>();
  for (const selection of dateSelections) {
    const current = grouped.get(selection.date) ?? [];
    current.push(`${selection.start}-${selection.end}`);
    grouped.set(selection.date, current);
  }
  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, ranges]) => `${date} ${ranges.join(" / ")}`);
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
  const selectionMode = String(formData.get("selectionMode") ?? "").trim() === "calendar" ? "calendar" : "weekly";
  const weekdays =
    selectionMode === "weekly"
      ? PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => option.value).filter((value) =>
          formData.getAll("weekdays").map((item) => String(item)).includes(value)
        )
      : [];
  const timeRanges =
    selectionMode === "weekly"
      ? [
          {
            start: normalizeTime(formData.get("timeRange1Start")),
            end: normalizeTime(formData.get("timeRange1End")),
          },
          {
            start: normalizeTime(formData.get("timeRange2Start")),
            end: normalizeTime(formData.get("timeRange2End")),
          },
        ].filter((range): range is { start: string; end: string } => Boolean(range.start && range.end && range.end > range.start))
      : [];
  const dateSelections =
    selectionMode === "calendar"
      ? Array.from(new Set(formData.getAll("specificDates").map((item) => String(item)))).flatMap((date) =>
          collectCalendarDateSelections(formData, date)
        )
      : [];

  return {
    selectionMode,
    weekdays,
    timeRanges,
    dateSelections,
    earliestStartDate: selectionMode === "weekly" ? normalizeDate(formData.get("earliestStartDate")) : null,
    modePreference: trimToNull(formData.get("modePreference"), 40),
    teacherPreference: trimToNull(formData.get("teacherPreference"), 120),
    notes: trimToNull(formData.get("notes"), 1000),
  };
}

export function coerceParentAvailabilityPayload(value: unknown): ParentAvailabilityPayload {
  const payload = (value ?? {}) as Partial<ParentAvailabilityPayload>;
  const dateSelections = Array.isArray(payload.dateSelections)
    ? payload.dateSelections
        .map((item) => ({
          date: typeof item?.date === "string" ? item.date : "",
          start: typeof item?.start === "string" ? item.start : "",
          end: typeof item?.end === "string" ? item.end : "",
        }))
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && /^\d{2}:\d{2}$/.test(item.start) && /^\d{2}:\d{2}$/.test(item.end) && item.end > item.start)
    : [];

  const selectionMode: ParentAvailabilitySelectionMode =
    payload.selectionMode === "calendar" || (!(payload.selectionMode === "weekly") && dateSelections.length > 0)
      ? "calendar"
      : "weekly";

  return {
    selectionMode,
    weekdays: Array.isArray(payload.weekdays) ? payload.weekdays.map((item) => String(item)) : [],
    timeRanges: Array.isArray(payload.timeRanges)
      ? payload.timeRanges
          .map((item) => ({
            start: typeof item?.start === "string" ? item.start : "",
            end: typeof item?.end === "string" ? item.end : "",
          }))
          .filter((item) => item.start && item.end && item.end > item.start)
      : [],
    dateSelections,
    earliestStartDate: typeof payload.earliestStartDate === "string" ? payload.earliestStartDate : null,
    modePreference: typeof payload.modePreference === "string" ? payload.modePreference : null,
    teacherPreference: typeof payload.teacherPreference === "string" ? payload.teacherPreference : null,
    notes: typeof payload.notes === "string" ? payload.notes : null,
  };
}

export function deriveParentAvailabilitySearchWindow(args: {
  payload: ParentAvailabilityPayload | null | undefined;
  now?: Date;
  defaultHorizonDays?: number;
}) {
  const now = args.now ? new Date(args.now) : new Date();
  const defaultHorizonDays = Math.max(1, args.defaultHorizonDays ?? 14);
  const payload = args.payload;

  if (payload?.selectionMode === "calendar" && payload.dateSelections.length > 0) {
    const dates = payload.dateSelections
      .map((item) => parseDateStart(item.date))
      .filter((item): item is Date => Boolean(item))
      .sort((a, b) => a.getTime() - b.getTime());
    const startAt = dates[0] ?? now;
    const lastDate = dates[dates.length - 1] ?? startAt;
    const diffDays = Math.max(0, Math.round((lastDate.getTime() - startAt.getTime()) / 86400000));
    return {
      startAt,
      horizonDays: Math.max(1, diffDays + 1),
    };
  }

  if (payload?.earliestStartDate) {
    return {
      startAt: new Date(`${payload.earliestStartDate}T00:00:00`),
      horizonDays: defaultHorizonDays,
    };
  }

  return {
    startAt: now,
    horizonDays: defaultHorizonDays,
  };
}

export function formatParentAvailabilityFieldRows(payload: ParentAvailabilityPayload): ParentAvailabilityFieldRow[] {
  const weekdayLabelMap = new Map<string, string>(
    PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => [option.value, `${option.zh} / ${option.en}`])
  );
  const rows: ParentAvailabilityFieldRow[] = [
    {
      label: "Collection mode / 收集方式",
      value: payload.selectionMode === "calendar" ? "按具体日期 / Specific dates" : "每周固定模板 / Weekly template",
    },
  ];

  if (payload.selectionMode === "weekly" && payload.weekdays.length > 0) {
    rows.push({
      label: "Available weekdays / 可上课星期",
      value: payload.weekdays.map((value) => weekdayLabelMap.get(value) ?? value).join("、"),
    });
  }
  if (payload.selectionMode === "weekly" && payload.timeRanges.length > 0) {
    rows.push({
      label: "Preferred time ranges / 常用可上课时间段",
      value: payload.timeRanges.map((range) => `${range.start}-${range.end}`).join("；"),
    });
  }
  if (payload.selectionMode === "calendar" && payload.dateSelections.length > 0) {
    rows.push({
      label: "Specific calendar dates / 具体日期时间",
      value: formatGroupedDateSelections(payload.dateSelections).join("；"),
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
  const parts: string[] = [
    payload.selectionMode === "calendar"
      ? "收集方式 / Collection mode: 按具体日期 / Specific dates"
      : "收集方式 / Collection mode: 每周固定模板 / Weekly template",
  ];

  if (payload.selectionMode === "weekly" && payload.weekdays.length > 0) {
    parts.push(`可上课星期 / Available days: ${payload.weekdays.map((value) => weekdayLabelMap.get(value) ?? value).join(", ")}`);
  }
  if (payload.selectionMode === "weekly" && payload.timeRanges.length > 0) {
    parts.push(`常用可上课时间段 / Available time ranges: ${payload.timeRanges.map((range) => `${range.start}-${range.end}`).join("; ")}`);
  }
  if (payload.selectionMode === "calendar" && payload.dateSelections.length > 0) {
    parts.push(`具体日期时间 / Specific dates: ${formatGroupedDateSelections(payload.dateSelections).join("; ")}`);
  }
  if (payload.earliestStartDate) {
    parts.push(`最早可开始日期 / Earliest start: ${payload.earliestStartDate}`);
  }
  if (payload.modePreference) {
    parts.push(`上课形式偏好 / Mode preference: ${payload.modePreference}`);
  }
  if (payload.teacherPreference) {
    parts.push(`老师偏好 / Teacher preference: ${payload.teacherPreference}`);
  }
  if (payload.notes) {
    parts.push(`家长备注 / Parent note: ${payload.notes}`);
  }

  return parts.join("\n");
}

export function hasParentAvailabilityPayloadContent(payload: ParentAvailabilityPayload) {
  return Boolean(
    payload.weekdays.length > 0 ||
      payload.timeRanges.length > 0 ||
      payload.dateSelections.length > 0 ||
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
    "现在可以二选一：填写每周固定模板，或者直接按日历选择具体日期和时间。",
    "这只是时间收集表，不代表已经排课成功。",
    "",
    `Hello, please share the available lesson times for ${args.studentName}.`,
    args.courseLabel ? `Course: ${args.courseLabel}` : "",
    "You can either fill a weekly template or pick specific calendar dates and times.",
    "This form only collects available times. It does not confirm the final schedule by itself.",
    "",
    args.url,
  ]
    .filter(Boolean)
    .join("\n");
}
