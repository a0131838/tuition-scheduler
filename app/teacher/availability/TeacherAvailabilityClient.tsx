"use client";

import { useEffect, useMemo, useState } from "react";
import BlurTimeInput from "@/app/_components/BlurTimeInput";

type Lang = "BILINGUAL" | "ZH" | "EN";

type Slot = { id: string; date: string; startMin: number; endMin: number };

type AvailabilityUndoPayload = {
  type: "CLEAR_DAY";
  teacherId: string;
  date: string;
  createdAt: string;
  slots: Array<{ date: string; startMin: number; endMin: number }>;
};

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

function tr(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

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

function addDays(ymdValue: string, days: number) {
  const [y, m, d] = ymdValue.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + days);
  return ymd(date);
}

function overlapsMinutes(startMin: number, endMin: number, otherStartMin: number, otherEndMin: number) {
  return startMin < otherEndMin && otherStartMin < endMin;
}

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
  const { lang } = props;
  const [slots, setSlots] = useState<Slot[]>(props.initialSlots);
  const [undoPayload, setUndoPayload] = useState<AvailabilityUndoPayload | null>(props.initialUndoPayload);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [quickFormPreset, setQuickFormPreset] = useState({ version: 0, date: "", start: "16:00", end: "20:00" });
  const [bulkFormPreset, setBulkFormPreset] = useState({
    version: 0,
    from: "",
    to: "",
    start: "16:00",
    end: "20:00",
    weekdays: [1, 2, 3, 4, 5] as number[],
  });
  const [copySourceDate, setCopySourceDate] = useState("");
  const [copyTargetDate, setCopyTargetDate] = useState("");

  useEffect(() => {
    setSlots(props.initialSlots);
  }, [props.initialSlots]);

  useEffect(() => {
    setUndoPayload(props.initialUndoPayload);
  }, [props.initialUndoPayload]);

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
      const key = s.date;
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

  useEffect(() => {
    setQuickFormPreset((prev) => ({ ...prev, date: prev.date || todayYMD }));
    setBulkFormPreset((prev) => ({
      ...prev,
      from: prev.from || todayYMD,
      to: prev.to || in4WeeksYMD,
    }));
    setCopySourceDate((prev) => prev || todayYMD);
    setCopyTargetDate((prev) => prev || addDays(todayYMD, 1));
  }, [todayYMD, in4WeeksYMD]);

  function loadQuickTemplate(startHHMM: string, endHHMM: string, offsetDays = 0) {
    setQuickFormPreset((prev) => ({
      version: prev.version + 1,
      date: addDays(todayYMD, offsetDays),
      start: startHHMM,
      end: endHHMM,
    }));
    setMsg(tr(lang, "Quick add template loaded", "单日模板已载入"));
    setErr("");
  }

  function loadBulkTemplate(template: {
    from?: string;
    to?: string;
    start: string;
    end: string;
    weekdays: number[];
  }) {
    setBulkFormPreset((prev) => ({
      version: prev.version + 1,
      from: template.from ?? todayYMD,
      to: template.to ?? in4WeeksYMD,
      start: template.start,
      end: template.end,
      weekdays: template.weekdays,
    }));
    setMsg(tr(lang, "Bulk template loaded", "批量模板已载入"));
    setErr("");
  }

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
    return data.slot;
  }

  async function onQuickAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(form);
      const date = String(fd.get("date") ?? "");
      const startV = String(fd.get("start") ?? "");
      const endV = String(fd.get("end") ?? "");
      await addSingle(date, startV, endV);
      setMsg(tr(lang, "Added 1", "已添加 1"));
    } catch (error: any) {
      setErr(error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onBulkAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(form);
      const from = String(fd.get("from") ?? "");
      const to = String(fd.get("to") ?? "");
      const startV = String(fd.get("start") ?? "");
      const endV = String(fd.get("end") ?? "");
      const weekdays = fd.getAll("weekday").map((v) => Number(String(v))).filter((n) => Number.isFinite(n));

      const res = await fetch("/api/teacher/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, start: startV, end: endV, weekdays }),
      });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      const data = (await res.json()) as { added: number };
      setMsg(tr(lang, `Bulk added ${data.added}`, `批量添加 ${data.added}`));

      const list = await fetch(`/api/teacher/availability/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const e3 = await fetchTextIfNotOk(list);
      if (e3) throw new Error(e3);
      const data3 = (await list.json()) as { slots: Slot[] };
      setSlots((prev) => {
        const keep = prev.filter((s) => {
          return s.date < from || s.date > to;
        });
        return [...keep, ...data3.slots];
      });
    } catch (error: any) {
      setErr(error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onAddInCell(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(form);
      const date = String(fd.get("date") ?? "");
      const startV = String(fd.get("start") ?? "");
      const endV = String(fd.get("end") ?? "");
      await addSingle(date, startV, endV);
      setMsg(tr(lang, "Added 1", "已添加 1"));
      form.reset();
    } catch (error: any) {
      setErr(error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onUpdateSlot(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData(form);
      const startV = String(fd.get("start") ?? "");
      const endV = String(fd.get("end") ?? "");
      const res = await fetch(`/api/teacher/availability/slots/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: startV, end: endV }),
      });
      const e2 = await fetchTextIfNotOk(res);
      if (e2) throw new Error(e2);
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, startMin: toMin(startV), endMin: toMin(endV) } : s)));
      setMsg(tr(lang, "Updated 1", "已更新 1"));
    } catch (error: any) {
      setErr(error?.message ?? String(error));
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
    } catch (error: any) {
      setErr(error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  }

  async function onClearDay(date: string) {
    if (busy) return;
    if (!window.confirm(`${tr(lang, "Clear all availability slots on", "确认清空当天全部时段")} ${date}?`)) return;
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
      setSlots((prev) => prev.filter((s) => s.date !== date));
      setMsg(tr(lang, `Cleared ${date}`, `已清空 ${date}`));
    } catch (error: any) {
      setErr(error?.message ?? String(error));
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
      const restoredDates = new Set(data.slots.map((s) => s.date));
      setSlots((prev) => {
        const keep = prev.filter((s) => !restoredDates.has(s.date));
        return [...keep, ...data.slots];
      });
      setMsg(tr(lang, `Undo done, restored ${data.restoredCount} slots`, `撤销完成，恢复 ${data.restoredCount} 条时段`));
    } catch (error: any) {
      setErr(error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  }

  async function copyDaySlots(sourceDate: string, targetDate: string) {
    if (sourceDate === targetDate) throw new Error(tr(lang, "Choose a different target day", "请选择不同的目标日期"));
    const sourceSlots = slotMap.get(sourceDate) ?? [];
    if (sourceSlots.length === 0) {
      throw new Error(tr(lang, "No slots on source day", "来源日期没有可复制的时段"));
    }

    let added = 0;
    let skipped = 0;
    const targetWorking = [...(slotMap.get(targetDate) ?? [])].map((slot) => ({
      startMin: slot.startMin,
      endMin: slot.endMin,
    }));

    for (const slot of sourceSlots) {
      const duplicateOrOverlap = targetWorking.some((existing) =>
        overlapsMinutes(slot.startMin, slot.endMin, existing.startMin, existing.endMin)
      );
      if (duplicateOrOverlap) {
        skipped += 1;
        continue;
      }
      try {
        await addSingle(targetDate, fromMin(slot.startMin), fromMin(slot.endMin));
        targetWorking.push({ startMin: slot.startMin, endMin: slot.endMin });
        added += 1;
      } catch {
        skipped += 1;
      }
    }

    if (added === 0 && skipped > 0) {
      throw new Error(tr(lang, "No new slots copied because the target day already overlaps existing availability", "没有复制到新时段，目标日期已存在重叠可上课时间"));
    }
    setMsg(
      tr(
        lang,
        `Copied ${added} slot(s) to ${targetDate}${skipped ? `, skipped ${skipped}` : ""}`,
        `已复制 ${added} 条时段到 ${targetDate}${skipped ? `，跳过 ${skipped} 条` : ""}`
      )
    );
  }

  async function onQuickCopy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await copyDaySlots(copySourceDate, copyTargetDate);
    } catch (error: any) {
      setErr(error?.message ?? String(error));
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
            {tr(lang, "Undo available for last clear-day action", "可撤回的最近清空操作")} ({undoPayload.date})
          </div>
          <button type="button" onClick={onUndo} disabled={busy}>
            {tr(lang, "Undo last clear-day", "撤回上次清空当天")}
          </button>
        </div>
      ) : null}

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff", display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{tr(lang, "Common templates", "常用模板")}</div>
        <div style={{ color: "#64748b", fontSize: 13 }}>
          {tr(
            lang,
            "Load a preset into the quick-add or bulk-add areas first, then adjust only if you need something special.",
            "先把常用模板载入到单日或批量表单里，再按需要微调，能少点很多次。"
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #dbeafe", borderRadius: 10, padding: 10, background: "#f8fbff", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{tr(lang, "Weekday after school", "工作日放学后")}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Mon-Fri · 16:00-20:00</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => loadBulkTemplate({ start: "16:00", end: "20:00", weekdays: [1, 2, 3, 4, 5] })} disabled={busy}>
                {tr(lang, "Load to bulk add", "载入批量添加")}
              </button>
              <button type="button" onClick={() => loadQuickTemplate("16:00", "20:00")} disabled={busy}>
                {tr(lang, "Load to single day", "载入单日添加")}
              </button>
            </div>
          </div>
          <div style={{ border: "1px solid #dbeafe", borderRadius: 10, padding: 10, background: "#f8fbff", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{tr(lang, "Weekday evening", "工作日晚间")}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Mon-Fri · 18:00-21:00</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => loadBulkTemplate({ start: "18:00", end: "21:00", weekdays: [1, 2, 3, 4, 5] })} disabled={busy}>
                {tr(lang, "Load to bulk add", "载入批量添加")}
              </button>
              <button type="button" onClick={() => loadQuickTemplate("18:00", "21:00")} disabled={busy}>
                {tr(lang, "Load to single day", "载入单日添加")}
              </button>
            </div>
          </div>
          <div style={{ border: "1px solid #dcfce7", borderRadius: 10, padding: 10, background: "#f0fdf4", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{tr(lang, "Weekend morning", "周末上午")}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Sat-Sun · 09:00-12:00</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => loadBulkTemplate({ start: "09:00", end: "12:00", weekdays: [0, 6] })} disabled={busy}>
                {tr(lang, "Load to bulk add", "载入批量添加")}
              </button>
              <button type="button" onClick={() => loadQuickTemplate("09:00", "12:00", 1)} disabled={busy}>
                {tr(lang, "Load to single day", "载入单日添加")}
              </button>
            </div>
          </div>
          <div style={{ border: "1px solid #fde68a", borderRadius: 10, padding: 10, background: "#fffbeb", display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>{tr(lang, "Weekend afternoon", "周末下午")}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Sat-Sun · 13:00-18:00</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => loadBulkTemplate({ start: "13:00", end: "18:00", weekdays: [0, 6] })} disabled={busy}>
                {tr(lang, "Load to bulk add", "载入批量添加")}
              </button>
              <button type="button" onClick={() => loadQuickTemplate("13:00", "18:00", 1)} disabled={busy}>
                {tr(lang, "Load to single day", "载入单日添加")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr(lang, "Quick Add (Single Day)", "快速添加（单日）")}</div>
        <form key={`quick-${quickFormPreset.version}`} onSubmit={onQuickAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="date" type="date" required defaultValue={quickFormPreset.date || todayYMD} />
          <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue={quickFormPreset.start} />
          <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue={quickFormPreset.end} />
          <button type="submit" disabled={busy}>{tr(lang, "Add", "添加")}</button>
        </form>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr(lang, "Bulk Add by Date Range", "批量添加（日期区间）")}</div>
        <form key={`bulk-${bulkFormPreset.version}`} onSubmit={onBulkAdd} style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              {tr(lang, "From", "从")}
              <input name="from" type="date" required defaultValue={bulkFormPreset.from || todayYMD} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {tr(lang, "To", "到")}
              <input name="to" type="date" required defaultValue={bulkFormPreset.to || in4WeeksYMD} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {tr(lang, "Start", "开始")}
              <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue={bulkFormPreset.start} style={{ marginLeft: 6 }} />
            </label>
            <label>
              {tr(lang, "End", "结束")}
              <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} required defaultValue={bulkFormPreset.end} style={{ marginLeft: 6 }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {WEEKDAYS.map((d) => (
              <label key={d.value} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" name="weekday" value={String(d.value)} defaultChecked={bulkFormPreset.weekdays.includes(d.value)} />
                {tr(lang, d.en, d.zh)}
              </label>
            ))}
          </div>

          <div>
            <button type="submit" disabled={busy}>{tr(lang, "Bulk Add", "批量添加")}</button>
          </div>
        </form>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff", display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>{tr(lang, "Quick Copy by Date", "按日期快速复制")}</div>
        <div style={{ color: "#64748b", fontSize: 13 }}>
          {tr(
            lang,
            "Copy all slots from one day to another day. Existing overlaps on the target day are skipped automatically.",
            "把某一天的全部时段复制到另一日期。目标日期已有重叠时段时会自动跳过。"
          )}
        </div>
        <form onSubmit={onQuickCopy} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            {tr(lang, "Source", "来源")}
            <input type="date" value={copySourceDate} onChange={(e) => setCopySourceDate(e.target.value)} style={{ marginLeft: 6 }} />
          </label>
          <label>
            {tr(lang, "Target", "目标")}
            <input type="date" value={copyTargetDate} onChange={(e) => setCopyTargetDate(e.target.value)} style={{ marginLeft: 6 }} />
          </label>
          <button type="submit" disabled={busy}>{tr(lang, "Copy day slots", "复制当天时段")}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCopySourceDate(todayYMD);
              setCopyTargetDate(addDays(todayYMD, 7));
            }}
          >
            {tr(lang, "Use today -> +7d", "今天 -> 7天后")}
          </button>
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
                                <span style={{ fontWeight: 700 }}>{fromMin(s.startMin)} - {fromMin(s.endMin)}</span>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: "#94a3b8", fontSize: 12 }}>{tr(lang, "No slots", "无时段")}</div>
                          )
                        ) : (
                          <div style={{ color: "#cbd5e1", fontSize: 12 }}>{tr(lang, "Out of range", "超范围")}</div>
                        )}

                        {inRange && daySlots.length > 0 ? (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              disabled={busy}
                              style={{ fontSize: 11 }}
                              onClick={async () => {
                                setBusy(true);
                                setErr("");
                                setMsg("");
                                try {
                                  await copyDaySlots(key, addDays(key, 1));
                                } catch (error: any) {
                                  setErr(error?.message ?? String(error));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              {tr(lang, "Copy +1d", "复制到次日")}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              style={{ fontSize: 11 }}
                              onClick={async () => {
                                setBusy(true);
                                setErr("");
                                setMsg("");
                                try {
                                  await copyDaySlots(key, addDays(key, 7));
                                } catch (error: any) {
                                  setErr(error?.message ?? String(error));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              {tr(lang, "Copy +7d", "复制到下周")}
                            </button>
                          </div>
                        ) : null}

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
                                  <span style={{ fontWeight: 700 }}>{fromMin(s.startMin)} - {fromMin(s.endMin)}</span>
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
                              style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}
                            >
                              <input type="hidden" name="date" value={key} />
                              <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} defaultValue="16:00" style={{ fontSize: 11, width: 82 }} />
                              <span style={{ fontSize: 11 }}>-</span>
                              <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={600} defaultValue="18:00" style={{ fontSize: 11, width: 82 }} />
                              <button type="submit" disabled={busy} style={{ fontSize: 11 }}>{tr(lang, "Add", "添加")}</button>
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
