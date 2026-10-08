"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
const t = (lang: Lang, en: string, zh: string) => lang === "EN" ? en : lang === "ZH" ? zh : `${en} / ${zh}`;
import { checkResultEvidence, type ResultAction } from "@/lib/ticket-result-evidence";

type Lesson = { id: string; label: string; cancelled: boolean; startAt?: string; endAt?: string; teacherId?: string; courseLabel?: string; charge?: boolean; recommended?: boolean };

export default function TicketLessonPicker({ ticketId, actionId, name, multiple = false, initial = [], lang = "BILINGUAL", resultAction }: {
  ticketId: string; actionId?: string; name: string; multiple?: boolean; initial?: Lesson[]; lang?: Lang; resultAction?: Omit<ResultAction, "requestedStartAt"> & { requestedStartAt?: string | null };
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
  const evidence = resultAction && selected.length ? checkResultEvidence({ ...resultAction, requestedStartAt: resultAction.requestedStartAt ? new Date(resultAction.requestedStartAt) : null }, selected.map(row => ({
    id: row.id, startAt: new Date(row.startAt ?? ""), endAt: new Date(row.endAt ?? ""), teacherId: row.teacherId ?? "", courseLabel: row.courseLabel ?? "", cancelled: row.cancelled, charge: Boolean(row.charge),
  }))) : null;
  return <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
    {selected.length ? selected.map((row) => <input key={row.id} type="hidden" name={name} value={row.id} />) : <input type="hidden" name={name} value="" />}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <label>{t(lang, "Lesson window start", "课程起始日")} <input type="date" aria-label={t(lang, "Lesson window start", "课程起始日")} value={date} onChange={(e) => { setDate(e.target.value); void load(e.target.value, 0); }} /></label>
      <button type="button" disabled={loading || page === 0} title="前一页" onClick={() => void load(date, page - 1)}>{t(lang, "Previous", "上一页")}</button>
      <button type="button" disabled={loading || !hasMore} title="后一页" onClick={() => void load(date, page + 1)}>{t(lang, "Next", "下一页")}</button>
    </div>
    {error && <div role="alert">{error} <button type="button" onClick={() => void load(date, page)}>{t(lang, "Retry", "重试")}</button></div>}
    {loading ? <div role="status">{t(lang, "Loading lessons…", "读取课程中…")}</div> : null}
    <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #d1d5db", borderRadius: 4, padding: 8 }}>
      {[...selected.filter((row) => !rows.some((item) => item.id === row.id)), ...rows].map((row) => <label key={row.id} style={{ display: "flex", gap: 8, padding: "6px 0", alignItems: "flex-start", overflowWrap: "anywhere" }}>
        <input type={multiple ? "checkbox" : "radio"} name={`${name}-choice-${actionId ?? "new"}`} checked={selected.some((item) => item.id === row.id)} onChange={(e) => toggle(row, e.target.checked)} />
        <span>{row.recommended && resultAction ? <b style={{ color: "#0f766e" }}>{t(lang, "Matches request · ", "符合条件候选 · ")}</b> : null}{row.label}</span>
      </label>)}
      {!loading && !rows.length && !selected.length ? <span>{t(lang, "No lessons in the 31-day window", "此日期起31天内没有课程")}</span> : null}
    </div>
    {multiple && selected.length > 0 ? <div>{t(lang, "Selected lessons", "本次选择节数")}：{selected.length} · {t(lang, "Minutes", "分钟")}：{selected.reduce((sum, row) => sum + (row.startAt && row.endAt ? Math.round((Date.parse(row.endAt) - Date.parse(row.startAt)) / 60000) : 0), 0)}</div> : null}
    {evidence ? <div role="status" style={{ background: evidence.errors.length ? "#fff7ed" : "#f0fdfa", padding: 10, borderRadius: 6 }}>
      <div>{t(lang, "Expected / selected lessons", "要求／选择节数")}：{evidence.expectedCount} / {selected.length} · {evidence.totalMinutes} {t(lang, "minutes", "分钟")}</div>
      {evidence.differences.map(item => <div key={item}>{item}</div>)}
      {evidence.errors.filter(item => !item.includes("请核对，若需求已变更")).map(item => <div key={item}>{item}</div>)}
      {evidence.differences.length ? <div>{t(lang, "Confirm these changes and record who agreed before submitting.", "提交前请确认这些变更，并填写确认人及依据。")}</div> : !evidence.complete ? <div>{t(lang, "Not all requested lessons are linked. The remaining work stays open.", "尚未关联齐要求的课程，剩余事项将继续保留。")}</div> : <div>{t(lang, "Final verification rechecks the current records on the server.", "提交时系统会再次核对最新记录。")}</div>}
    </div> : null}
  </div>;
}
