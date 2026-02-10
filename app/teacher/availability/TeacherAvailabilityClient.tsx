"use client";

import { useMemo, useState } from "react";
import BlurTimeInput from "@/app/_components/BlurTimeInput";

type Lang = "BILINGUAL" | "ZH" | "EN";
function tr(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

const WEEKDAYS = [
  { value: 0, en: "Sun", zh: "周日" },
  { value: 1, en: "Mon", zh: "周一" },
  { value: 2, en: "Tue", zh: "周二" },
  { value: 3, en: "Wed", zh: "周三" },
  { value: 4, en: "Thu", zh: "周四" },
  { value: 5, en: "Fri", zh: "周五" },
  { value: 6, en: "Sat", zh: "周六" },
];

const AVAIL_MIN_TIME = "08:00";
const AVAIL_MAX_TIME = "22:50";
const AVAIL_MIN_MIN = 8 * 60;
const AVAIL_MAX_MIN = 22 * 60 + 50;

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseYMD(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

function inAllowedWindow(startMin: number, endMin: number) {
  return startMin >= AVAIL_MIN_MIN && endMin <= AVAIL_MAX_MIN;
}

function mergeSlots(slots: Array<{ startMin: number; endMin: number }>) {
  if (slots.length === 0) return [] as Array<{ startMin: number; endMin: number }>;
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const merged: Array<{ startMin: number; endMin: number }> = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (!last || s.startMin > last.endMin) {
      merged.push({ startMin: s.startMin, endMin: s.endMin });
    } else if (s.endMin > last.endMin) {
      last.endMin = s.endMin;
    }
  }
  return merged;
}

function buildCalendarDays(start: Date, end: Date) {
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

  const days: Date[] = [];
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

type Slot = { id: string; date: string; startMin: number; endMin: number };
type AvailabilityUndoPayload = {
  type: "CLEAR_DAY";
  teacherId: string;
  date: string;
  createdAt: string;
  slots: Array<{ date: string; startMin: number; endMin: number }>;
};

async function fetchTextIfNotOk(res: Response) {
  if (res.ok) return "";
  const t = await res.text().catch(() => "");
  return t || `Request failed: ${res.status}`;
}

export default function TeacherAvailabilityClient(props: {
  lang: Lang;
  teacherId: string;
  initialSlots: Slot[];
  initialUndoPayload: AvailabilityUndoPayload | null;
}) {
  const { teacherId, lang } = props;
  const [slots, setSlots] = useState<Slot[]>(props.initialSlots);
  const [undoPayload, setUndoPayload] = useState<AvailabilityUndoPayload | null>(props.initialUndoPayload);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const today = useMemo(() => new Date(), []);
  const start = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0), [today]);
  const end = useMemo(() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 30);
    return d;
  }, [start]);

  const slotMap = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = ymd(new Date(s.date));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
      map.set(k, arr);
    }
    return map;
  }, [slots]);

  const days = useMemo(() => buildCalendarDays(start, end), [start, end]);
  const todayYMD = useMemo(() => ymd(today), [today]);
  const in4WeeksYMD = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 28);
    return ymd(d);
  }, [today]);

  async function addSingle(date: string, startHHMM: string, endHHMM: string) {
    const startMin = toMin(startHHMM);
    const endMin = toMin(endHHMM);
    if (endMin <= startMin) throw new Error("End must be after start");
    if (!inAllowedWindow(startMin, endMin)) {
      throw new Error(`Time must be between ${AVAIL_MIN_TIME} and ${AVAIL_MAX_TIME}`);
    }
    const res = await fetch("/api/teacher/availability/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, start: startHHMM, end: endHHMM }),
    });
    const e = await fetchTextIfNotOk(res);
    if (e) throw new Error(e);
      const data = (await res.json()) as { slot: Slot };
      setSlots((prev) => [...prev, data.slot]);
  }

  async function onQuickAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("date") ?? "");
      const start = String(fd.get("start") ?? "");
      const end = String(fd.get("end") ?? "");
      await addSingle(date, start, end);
      setMsg(tr(lang, "Added 1", "已添加 1"));
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onBulkAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const from = String(fd.get("from") ?? "");
      const to = String(fd.get("to") ?? "");
      const start = String(fd.get("start") ?? "");
      const end = String(fd.get("end") ?? "");
      const weekdays = fd.getAll("weekday").map((v) => Number(String(v))).filter((n) => Number.isFinite(n));
      const res = await fetch("/api/teacher/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, start, end, weekdays }),
      });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      const data = (await res.json()) as { added: number };
      setMsg(tr(lang, `Bulk added ${data.added}`, `批量添加 ${data.added}`));

      // Refresh local slots in the affected range.
      const list = await fetch(`/api/teacher/availability/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const e3 = await fetchTextIfNotOk(list);
      if (e3) throw new Error(e3);
      const data3 = (await list.json()) as { slots: Slot[] };
      setSlots((prev) => {
        const keep = prev.filter((s) => {
          const d = ymd(new Date(s.date));
          return d < from || d > to;
        });
        return [...keep, ...data3.slots];
      });
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onAddInCell(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("date") ?? "");
      const start = String(fd.get("start") ?? "");
      const end = String(fd.get("end") ?? "");
      await addSingle(date, start, end);
      setMsg(tr(lang, "Added 1", "已添加 1"));
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onUpdateSlot(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(e.currentTarget);
      const start = String(fd.get("start") ?? "");
      const end = String(fd.get("end") ?? "");
      const res = await fetch(`/api/teacher/availability/slots/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      const startMin = toMin(start);
      const endMin = toMin(end);
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, startMin, endMin } : s)));
      setMsg(tr(lang, "Updated 1", "已更新 1"));
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteSlot(id: string) {
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/teacher/availability/slots/${encodeURIComponent(id)}`, { method: "DELETE" });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      setMsg(tr(lang, "Deleted 1", "已删除 1"));
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onClearDay(date: string) {
    if (busy) return;
    if (!window.confirm(`${tr(lang, "Clear all availability slots on", "确定清空当天全部时段")} ${date}?`)) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/teacher/availability/clear-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      const data = (await res.json()) as { undoPayload: AvailabilityUndoPayload };
      setUndoPayload(data.undoPayload);
      setSlots((prev) => prev.filter((s) => ymd(new Date(s.date)) !== date));
      setMsg(tr(lang, `Cleared ${date}`, `已清空 ${date}`));
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onUndo() {
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/teacher/availability/undo", { method: "POST" });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      const data = (await res.json()) as { restoredCount: number; slots: Slot[] };
      setUndoPayload(null);
      // Replace slots for dates in snapshot by server return.
      const restoredDates = new Set(data.slots.map((s) => ymd(new Date(s.date))));
      setSlots((prev) => {
        const keep = prev.filter((s) => !restoredDates.has(ymd(new Date(s.date))));
        return [...keep, ...data.slots];
      });
      setMsg(tr(lang, `Undo done, restored ${data.restoredCount} slots`, `撤回完成，恢复 ${data.restoredCount} 条时段`));
    } catch (err: any) {
      setErr(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2>{tr(lang, "My Availability", "我的可上课时间")}</h2>
      {err ? <div style={{ color: "#b00", marginBottom: 2 }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 2 }}>{msg}</div> : null}

      {undoPayload ? (
        <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8, padding: 10 }}>
          <div style={{ marginBottom: 6 }}>
            {tr(lang, "Undo available for last clear-day action", "有可撤回的最近清空操作")} ({undoPayload.date})
          </div>
          <button type="button" onClick={onUndo} disabled={busy}>
            {tr(lang, "Undo last clear-day", "撤回上次清空当天")}
          </button>
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr(lang, "Quick Add (Single Day)", "快速添加（单日）")}</div>
        <form onSubmit={onQuickAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="date" type="date" required defaultValue={todayYMD} />
          <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="16:00" />
          <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="20:00" />
          <button type="submit" disabled={busy}>
            {tr(lang, "Add", "添加")}
          </button>
        </form>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr(lang, "Bulk Add by Date Range", "批量添加（日期区间）")}</div>
        <form onSubmit={onBulkAdd} style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              {tr(lang, "From", "从")}
              <input name="from" type="date" required defaultValue={todayYMD} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {tr(lang, "To", "到")}
              <input name="to" type="date" required defaultValue={in4WeeksYMD} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {tr(lang, "Start", "开始")}
              <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="16:00" style={{ marginLeft: 6 }} />
            </label>
            <label>
              {tr(lang, "End", "结束")}
              <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue="20:00" style={{ marginLeft: 6 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {WEEKDAYS.map((d) => (
              <label key={d.value} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" name="weekday" value={String(d.value)} defaultChecked={d.value >= 1 && d.value <= 5} />
                {tr(lang, d.en, d.zh)}
              </label>
            ))}
          </div>
          <div>
            <button type="submit" disabled={busy}>
              {tr(lang, "Bulk Add", "批量添加")}
            </button>
          </div>
        </form>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr(lang, "Availability Calendar (Next 30 days)", "未来30天可上课日历")}</div>
        <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[tr(lang, "Sun", "周日"), tr(lang, "Mon", "周一"), tr(lang, "Tue", "周二"), tr(lang, "Wed", "周三"), tr(lang, "Thu", "周四"), tr(lang, "Fri", "周五"), tr(lang, "Sat", "周六")].map((h) => (
                <th key={h} align="left" style={{ border: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, row) => (
              <tr key={row}>
                {days.slice(row * 7, row * 7 + 7).map((d) => {
                  const key = ymd(d);
                  const inRange = d >= start && d <= end;
                  const daySlots = slotMap.get(key) ?? [];
                  const mergedDaySlots = mergeSlots(daySlots);
                  return (
                    <td
                      key={key}
                      style={{
                        border: "1px solid #e5e7eb",
                        verticalAlign: "top",
                        width: `${100 / 7}%`,
                        minHeight: 130,
                        background: inRange ? "#fff" : "#f8fafc",
                        opacity: inRange ? 1 : 0.55,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 4, alignItems: "center" }}>
                        <b>{d.getDate()}</b>
                        {inRange && daySlots.length > 0 ? (
                          <button type="button" onClick={() => onClearDay(key)} disabled={busy} style={{ fontSize: 11, color: "#b91c1c" }}>
                            {tr(lang, "Clear day", "清空当天")}
                          </button>
                        ) : null}
                      </div>

                      <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                        {inRange ? (
                          daySlots.length > 0 ? (
                            mergedDaySlots.map((s, idx) => (
                              <div
                                key={`${key}-merged-${idx}-${s.startMin}-${s.endMin}`}
                                style={{
                                  border: "1px solid #dbeafe",
                                  borderRadius: 6,
                                  background: "#f8fbff",
                                  padding: "4px 6px",
                                  fontSize: 12,
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ fontWeight: 700 }}>
                                  {fromMin(s.startMin)} - {fromMin(s.endMin)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: 12 }}>{tr(lang, "No slots", "无时段")}</div>
                          )
                        ) : (
                          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{tr(lang, "Out of range", "范围外")}</div>
                        )}

                        {inRange && daySlots.length > 0 ? (
                          <details style={{ marginTop: 2 }}>
                            <summary style={{ cursor: "pointer", fontSize: 11 }}>{tr(lang, "Manage raw slots", "管理原始时段")}</summary>
                            <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                              {daySlots.map((s) => (
                                <div
                                  key={s.id}
                                  style={{
                                    border: "1px solid #dbeafe",
                                    borderRadius: 6,
                                    background: "#f8fbff",
                                    padding: "4px 6px",
                                    fontSize: 12,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 4,
                                    alignItems: "center",
                                  }}
                                >
                                  <span style={{ fontWeight: 700 }}>
                                    {fromMin(s.startMin)} - {fromMin(s.endMin)}
                                  </span>
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <details>
                                      <summary style={{ cursor: "pointer", fontSize: 11 }}>{tr(lang, "Edit", "编辑")}</summary>
                                      <form
                                        onSubmit={(e) => onUpdateSlot(s.id, e)}
                                        style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}
                                      >
                                        <BlurTimeInput
                                          name="start"
                                          min={AVAIL_MIN_TIME}
                                          max={AVAIL_MAX_TIME}
                                          step={600}
                                          defaultValue={fromMin(s.startMin)}
                                          style={{ fontSize: 11, width: 82 }}
                                        />
                                        <span style={{ fontSize: 11 }}>-</span>
                                        <BlurTimeInput
                                          name="end"
                                          min={AVAIL_MIN_TIME}
                                          max={AVAIL_MAX_TIME}
                                          step={600}
                                          defaultValue={fromMin(s.endMin)}
                                          style={{ fontSize: 11, width: 82 }}
                                        />
                                        <button type="submit" disabled={busy} style={{ fontSize: 11 }}>{tr(lang, "Save", "保存")}</button>
                                      </form>
                                    </details>
                                    <button type="button" onClick={() => onDeleteSlot(s.id)} disabled={busy} style={{ fontSize: 11 }}>
                                      {tr(lang, "Del", "删")}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : null}

                        {inRange ? (
                          <details style={{ marginTop: 2, paddingTop: 4, borderTop: "1px dashed #e5e7eb" }}>
                            <summary style={{ cursor: "pointer", fontSize: 11 }}>{tr(lang, "Add slot", "添加时段")}</summary>
                            <form
                              onSubmit={onAddInCell}
                              style={{
                                marginTop: 6,
                                display: "flex",
                                gap: 4,
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <input type="hidden" name="date" value={key} />
                              <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} defaultValue="16:00" style={{ fontSize: 11, width: 82 }} />
                              <span style={{ fontSize: 11 }}>-</span>
                              <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} defaultValue="18:00" style={{ fontSize: 11, width: 82 }} />
                              <button type="submit" disabled={busy} style={{ fontSize: 11 }}>
                                {tr(lang, "Add", "添加")}
                              </button>
                            </form>
                          </details>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
