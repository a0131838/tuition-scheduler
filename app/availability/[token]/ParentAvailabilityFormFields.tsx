"use client";

import { useMemo, useState } from "react";
import {
  PARENT_AVAILABILITY_WEEKDAY_OPTIONS,
  type ParentAvailabilityPayload,
  type ParentAvailabilitySelectionMode,
} from "@/lib/parent-availability";

type CalendarEntry = {
  date: string;
  enabled: boolean;
  start: string;
  end: string;
};

const CALENDAR_WEEKDAY_LABELS = [
  { zh: "周日", en: "Sun" },
  { zh: "周一", en: "Mon" },
  { zh: "周二", en: "Tue" },
  { zh: "周三", en: "Wed" },
  { zh: "周四", en: "Thu" },
  { zh: "周五", en: "Fri" },
  { zh: "周六", en: "Sat" },
] as const;

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildCalendarDates(selectedDates: string[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const merged = new Set<string>();
  for (let index = 0; index < 14; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    merged.add(toYmd(date));
  }
  for (const value of selectedDates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      merged.add(value);
    }
  }
  return Array.from(merged).sort();
}

function formatCalendarLabel(value: string) {
  const date = parseYmd(value);
  if (!date) {
    return {
      title: value,
      subtitle: value,
    };
  }
  const weekday = CALENDAR_WEEKDAY_LABELS[date.getDay()] ?? CALENDAR_WEEKDAY_LABELS[0];
  return {
    title: `${date.getMonth() + 1}/${date.getDate()}`,
    subtitle: `${weekday.zh} / ${weekday.en}`,
  };
}

export default function ParentAvailabilityFormFields({
  payload,
}: {
  payload: ParentAvailabilityPayload;
}) {
  const [selectionMode, setSelectionMode] = useState<ParentAvailabilitySelectionMode>(payload.selectionMode);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(payload.weekdays);
  const [timeRange1Start, setTimeRange1Start] = useState(payload.timeRanges[0]?.start ?? "");
  const [timeRange1End, setTimeRange1End] = useState(payload.timeRanges[0]?.end ?? "");
  const [timeRange2Start, setTimeRange2Start] = useState(payload.timeRanges[1]?.start ?? "");
  const [timeRange2End, setTimeRange2End] = useState(payload.timeRanges[1]?.end ?? "");
  const [earliestStartDate, setEarliestStartDate] = useState(payload.earliestStartDate ?? "");
  const [modePreference, setModePreference] = useState(payload.modePreference ?? "");
  const [teacherPreference, setTeacherPreference] = useState(payload.teacherPreference ?? "");
  const [notes, setNotes] = useState(payload.notes ?? "");
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>(() => {
    const existing = new Map(payload.dateSelections.map((item) => [item.date, item]));
    return buildCalendarDates(payload.dateSelections.map((item) => item.date)).map((date) => {
      const current = existing.get(date);
      return {
        date,
        enabled: Boolean(current),
        start: current?.start ?? "",
        end: current?.end ?? "",
      };
    });
  });

  const selectedWeekdaySet = useMemo(() => new Set(selectedWeekdays), [selectedWeekdays]);

  function toggleWeekday(value: string) {
    setSelectedWeekdays((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function updateCalendarEntry(date: string, patch: Partial<CalendarEntry>) {
    setCalendarEntries((current) =>
      current.map((entry) => (entry.date === date ? { ...entry, ...patch } : entry))
    );
  }

  return (
    <>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12 }}>
        <input type="hidden" name="selectionMode" value={selectionMode} />
        <div style={{ fontWeight: 800 }}>Choose a collection mode / 选择填写方式</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          You can either give us a weekly template that repeats, or pick exact dates in a calendar-like view. / 你可以填写每周重复的固定模板，也可以直接按日期选择具体时间。
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <label
            style={{
              display: "grid",
              gap: 6,
              border: selectionMode === "weekly" ? "2px solid #2563eb" : "1px solid #cbd5e1",
              borderRadius: 14,
              padding: 14,
              background: selectionMode === "weekly" ? "#eff6ff" : "#fff",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="selectionModePicker"
              checked={selectionMode === "weekly"}
              onChange={() => setSelectionMode("weekly")}
            />
            <div style={{ fontWeight: 800 }}>Weekly template / 每周固定模板</div>
            <div style={{ color: "#475569", fontSize: 13 }}>
              Best when your family usually follows the same weekdays and time windows every week.
            </div>
          </label>
          <label
            style={{
              display: "grid",
              gap: 6,
              border: selectionMode === "calendar" ? "2px solid #2563eb" : "1px solid #cbd5e1",
              borderRadius: 14,
              padding: 14,
              background: selectionMode === "calendar" ? "#eff6ff" : "#fff",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="selectionModePicker"
              checked={selectionMode === "calendar"}
              onChange={() => setSelectionMode("calendar")}
            />
            <div style={{ fontWeight: 800 }}>Calendar dates / 按具体日期选择</div>
            <div style={{ color: "#475569", fontSize: 13 }}>
              Best when the next few available dates are irregular and easier to choose one by one.
            </div>
          </label>
        </div>
      </div>

      {selectionMode === "weekly" ? (
        <>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 800 }}>Available weekdays / 可上课星期</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Choose the weekdays that usually work best. You can pick more than one. / 请选择通常方便上课的星期，可以多选。
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #cbd5e1",
                    borderRadius: 999,
                    padding: "8px 12px",
                    background: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={option.value}
                    checked={selectedWeekdaySet.has(option.value)}
                    onChange={() => toggleWeekday(option.value)}
                  />
                  <span>{option.zh} / {option.en}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 800 }}>Preferred time ranges / 常用可上课时间段</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Please share the time windows your family usually prefers, for example `18:00-19:30`. / 请填写家里通常方便的时间段，例如 `18:00-19:30`。
            </div>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Range 1 / 时间段一</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="time" name="timeRange1Start" value={timeRange1Start} onChange={(event) => setTimeRange1Start(event.target.value)} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
                  <input type="time" name="timeRange1End" value={timeRange1End} onChange={(event) => setTimeRange1End(event.target.value)} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
                </div>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Range 2 / 时间段二</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="time" name="timeRange2Start" value={timeRange2Start} onChange={(event) => setTimeRange2Start(event.target.value)} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
                  <input type="time" name="timeRange2End" value={timeRange2End} onChange={(event) => setTimeRange2End(event.target.value)} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
                </div>
              </label>
            </div>
          </div>
        </>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Calendar date picks / 具体日期选择</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Tick the dates that work, then fill a start and end time for each selected date. / 勾选方便的日期后，请为每一天填写开始和结束时间。
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", minWidth: 860 }}>
              {calendarEntries.map((entry) => {
                const label = formatCalendarLabel(entry.date);
                return (
                  <div
                    key={entry.date}
                    style={{
                      border: entry.enabled ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      borderRadius: 14,
                      background: entry.enabled ? "#eff6ff" : "#fff",
                      padding: 12,
                      display: "grid",
                      gap: 8,
                      alignContent: "start",
                    }}
                  >
                    <label style={{ display: "grid", gap: 4, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{label.title}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{label.subtitle}</div>
                        </div>
                        <input
                          type="checkbox"
                          name="specificDates"
                          value={entry.date}
                          checked={entry.enabled}
                          onChange={(event) => updateCalendarEntry(entry.date, { enabled: event.target.checked })}
                        />
                      </div>
                    </label>
                    {entry.enabled ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <input
                          type="time"
                          name={`specificDateStart:${entry.date}`}
                          value={entry.start}
                          onChange={(event) => updateCalendarEntry(entry.date, { start: event.target.value })}
                          style={{ minHeight: 38, border: "1px solid #93c5fd", borderRadius: 10, padding: "6px 8px" }}
                        />
                        <input
                          type="time"
                          name={`specificDateEnd:${entry.date}`}
                          value={entry.end}
                          onChange={(event) => updateCalendarEntry(entry.date, { end: event.target.value })}
                          style={{ minHeight: 38, border: "1px solid #93c5fd", borderRadius: 10, padding: "6px 8px" }}
                        />
                      </div>
                    ) : (
                      <div style={{ minHeight: 82, borderRadius: 10, border: "1px dashed #cbd5e1", background: "#f8fafc" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {selectionMode === "weekly" ? (
          <label style={{ display: "grid", gap: 6 }}>
            <span>Earliest start date / 最早可开始日期</span>
            <input type="date" name="earliestStartDate" value={earliestStartDate} onChange={(event) => setEarliestStartDate(event.target.value)} style={{ minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
          </label>
        ) : null}
        <label style={{ display: "grid", gap: 6 }}>
          <span>Mode preference / 上课形式偏好</span>
          <select name="modePreference" value={modePreference} onChange={(event) => setModePreference(event.target.value)} style={{ minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}>
            <option value="">Either / 都可以</option>
            <option value="Online only">Online only / 仅线上</option>
            <option value="Onsite only">Onsite only / 仅线下</option>
            <option value="Prefer online">Prefer online / 更偏向线上</option>
            <option value="Prefer onsite">Prefer onsite / 更偏向线下</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Teacher preference / 老师偏好</span>
          <input type="text" name="teacherPreference" maxLength={120} value={teacherPreference} onChange={(event) => setTeacherPreference(event.target.value)} style={{ minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Notes / 备注</span>
        <textarea
          name="notes"
          rows={5}
          maxLength={1000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Share any fixed constraints, exam weeks, travel periods, or special requests."
          style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 12, padding: 12 }}
        />
      </label>
    </>
  );
}
