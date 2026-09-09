"use client";

import { useEffect, useRef, useState } from "react";

type Lesson = { id: string; label: string; cancelled: boolean; startAt?: string; endAt?: string };

export default function TicketLessonPicker({ ticketId, actionId, name, multiple = false, initial = [] }: {
  ticketId: string; actionId?: string; name: string; multiple?: boolean; initial?: Lesson[];
}) {
  const [date, setDate] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson[]>(initial);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  async function load(day: string, index: number) {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date: day, page: String(index) });
      if (actionId) params.set("actionId", actionId);
      const response = await fetch(`/api/admin/tickets/${ticketId}/results?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok || !data.ok) throw new Error(data.message ?? "课程读取失败");
      setRows(data.lessons); setDate(data.date); setPage(data.page); setHasMore(data.hasMore);
    } catch (e) { if (version === requestVersion.current) setError(e instanceof Error ? e.message : "课程读取失败"); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }
  useEffect(() => { void load("", 0); return () => { requestVersion.current++; }; }, [ticketId, actionId]);
  function toggle(lesson: Lesson, checked: boolean) {
    setSelected((current) => multiple ? checked ? [...current.filter((row) => row.id !== lesson.id), lesson] : current.filter((row) => row.id !== lesson.id) : [lesson]);
  }
  return <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
    {selected.length ? selected.map((row) => <input key={row.id} type="hidden" name={name} value={row.id} />) : <input type="hidden" name={name} value="" />}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <label>课程起始日 <input type="date" aria-label="课程起始日" value={date} onChange={(e) => { setDate(e.target.value); void load(e.target.value, 0); }} /></label>
      <button type="button" disabled={loading || page === 0} title="前一页" onClick={() => void load(date, page - 1)}>上一页</button>
      <button type="button" disabled={loading || !hasMore} title="后一页" onClick={() => void load(date, page + 1)}>下一页</button>
    </div>
    {error && <div role="alert">{error} <button type="button" onClick={() => void load(date, page)}>重试</button></div>}
    {loading ? <div role="status">读取课程中…</div> : null}
    <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #d1d5db", borderRadius: 4, padding: 8 }}>
      {[...selected.filter((row) => !rows.some((item) => item.id === row.id)), ...rows].map((row) => <label key={row.id} style={{ display: "flex", gap: 8, padding: "6px 0", alignItems: "flex-start", overflowWrap: "anywhere" }}>
        <input type={multiple ? "checkbox" : "radio"} name={`${name}-choice-${actionId ?? "new"}`} checked={selected.some((item) => item.id === row.id)} onChange={(e) => toggle(row, e.target.checked)} />
        <span>{row.label}</span>
      </label>)}
      {!loading && !rows.length && !selected.length ? <span>此日期起31天内没有课程</span> : null}
    </div>
    {multiple && selected.length > 0 ? <div>本次选择 {selected.length} 节，共 {selected.reduce((sum, row) => sum + (row.startAt && row.endAt ? Math.round((Date.parse(row.endAt) - Date.parse(row.startAt)) / 60000) : 0), 0)} 分钟</div> : null}
  </div>;
}
