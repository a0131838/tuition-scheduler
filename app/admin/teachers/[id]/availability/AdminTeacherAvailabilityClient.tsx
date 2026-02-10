"use client";

import { useMemo, useState } from "react";
import BlurTimeInput from "@/app/_components/BlurTimeInput";

function fromMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type DateSlot = { id: string; date: string; startMin: number; endMin: number };
type WeeklySlot = { id: string; weekday: number; startMin: number; endMin: number };

const WEEKDAYS = [
  { en: "Sun", zh: "周日" },
  { en: "Mon", zh: "周一" },
  { en: "Tue", zh: "周二" },
  { en: "Wed", zh: "周三" },
  { en: "Thu", zh: "周四" },
  { en: "Fri", zh: "周五" },
  { en: "Sat", zh: "周六" },
];

const AVAIL_MIN_TIME = "08:00";
const AVAIL_MAX_TIME = "22:50";

function parseMonth(s: string) {
  const [y, m] = s.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startPad = first.getDay(); // 0=Sun
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
  const cells: Array<Date | null> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > daysInMonth) cells.push(null);
    else cells.push(new Date(year, monthIndex, dayNum));
  }
  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { first, last, weeks };
}

async function jsonOrNull(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function AdminTeacherAvailabilityClient(props: {
  teacherId: string;
  teacherName: string;
  initialMonth: string; // YYYY-MM
  initialDateAvails: DateSlot[];
  initialWeeklyAvails: WeeklySlot[];
  labels: {
    title: string;
    prev: string;
    next: string;
    monthlyTitle: string;
    weeklyTitle: string;
    add: string;
    delete: string;
    addWeekly: string;
    generate: string;
    noSlots: string;
    noWeekly: string;
  };
}) {
  const { teacherId, teacherName, initialMonth, initialDateAvails, initialWeeklyAvails, labels } = props;

  const [month, setMonth] = useState(initialMonth);
  const [dateAvails, setDateAvails] = useState<DateSlot[]>(initialDateAvails);
  const [weeklyAvails, setWeeklyAvails] = useState<WeeklySlot[]>(initialWeeklyAvails);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const parsed = useMemo(() => parseMonth(month), [month]);
  const grid = useMemo(() => {
    const p = parsed;
    if (!p) return buildMonthGrid(new Date().getFullYear(), new Date().getMonth());
    return buildMonthGrid(p.year, p.monthIndex);
  }, [parsed]);

  const prevMonth = useMemo(() => {
    const p = parsed;
    if (!p) return monthKey(new Date());
    return monthKey(new Date(p.year, p.monthIndex - 1, 1));
  }, [parsed, month]);
  const nextMonth = useMemo(() => {
    const p = parsed;
    if (!p) return monthKey(new Date());
    return monthKey(new Date(p.year, p.monthIndex + 1, 1));
  }, [parsed, month]);

  const dateMap = useMemo(() => {
    const m = new Map<string, DateSlot[]>();
    for (const a of dateAvails) {
      const arr = m.get(a.date) ?? [];
      arr.push(a);
      m.set(a.date, arr);
    }
    for (const arr of m.values()) arr.sort((x, y) => x.startMin - y.startMin);
    return m;
  }, [dateAvails]);

  const loadMonth = async (m: string) => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/availability?month=${encodeURIComponent(m)}`);
      const data = await jsonOrNull(res);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Load failed"));
      setMonth(String(data.month));
      setDateAvails(Array.isArray(data.dateAvails) ? data.dateAvails : []);
      setWeeklyAvails(Array.isArray(data.weeklyAvails) ? data.weeklyAvails : []);
      window.history.replaceState(null, "", `/admin/teachers/${teacherId}/availability?month=${encodeURIComponent(String(data.month))}`);
    } catch (e: any) {
      setError(String(e?.message ?? "Load failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>
        {labels.title} - {teacherName}
      </h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => loadMonth(prevMonth)} disabled={loading}>
          {labels.prev}
        </button>
        <div style={{ fontWeight: 700 }}>{month}</div>
        <button type="button" onClick={() => loadMonth(nextMonth)} disabled={loading}>
          {labels.next}
        </button>
        {loading ? <span style={{ color: "#666", fontSize: 12 }}>Loading...</span> : null}
      </div>

      {error ? <div style={{ marginTop: 10, color: "#b00", fontSize: 12 }}>{error}</div> : null}
      {msg ? <div style={{ marginTop: 10, color: "#166534", fontSize: 12 }}>{msg}</div> : null}

      <h3 style={{ marginTop: 18 }}>{labels.monthlyTitle}</h3>

      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {WEEKDAYS.map((d, i) => (
              <th key={i} align="left">
                {d.en} / {d.zh}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                if (!day) return <td key={j} style={{ border: "1px solid #eee", height: 120 }} />;
                const key = ymd(day);
                const list = dateMap.get(key) ?? [];

                return (
                  <td key={j} style={{ border: "1px solid #eee", verticalAlign: "top", padding: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{day.getDate()}</div>

                    {list.length === 0 ? (
                      <div style={{ color: "#999", fontSize: 12 }}>{labels.noSlots}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 4, marginBottom: 6 }}>
                        {list.map((a) => (
                          <div key={a.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontFamily: "monospace" }}>
                              {fromMin(a.startMin)}-{fromMin(a.endMin)}
                            </span>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={async () => {
                                setLoading(true);
                                setError("");
                                setMsg("");
                                try {
                                  const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/availability/date`, {
                                    method: "DELETE",
                                    headers: { "content-type": "application/json" },
                                    body: JSON.stringify({ id: a.id }),
                                  });
                                  const data = await jsonOrNull(res);
                                  if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Delete failed"));
                                  setDateAvails((prev) => prev.filter((x) => x.id !== a.id));
                                } catch (e: any) {
                                  setError(String(e?.message ?? "Delete failed"));
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              {labels.delete}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (loading) return;
                        const fd = new FormData(e.currentTarget);
                        const start = String(fd.get("start") ?? "");
                        const end = String(fd.get("end") ?? "");
                        setLoading(true);
                        setError("");
                        setMsg("");
                        try {
                          const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/availability/date`, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ date: key, start, end }),
                          });
                          const data = await jsonOrNull(res);
                          if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Add failed"));
                          setDateAvails((prev) => [...prev, data.slot]);
                        } catch (e2: any) {
                          setError(String(e2?.message ?? "Add failed"));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{ display: "grid", gap: 4 }}
                    >
                      <div style={{ display: "flex", gap: 6 }}>
                        <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="18:00" />
                        <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="20:00" />
                      </div>
                      <button type="submit" disabled={loading}>
                        {labels.add}
                      </button>
                    </form>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 24 }}>{labels.weeklyTitle}</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (loading) return;
          const fd = new FormData(e.currentTarget);
          const weekday = Number(fd.get("weekday"));
          const start = String(fd.get("start") ?? "");
          const end = String(fd.get("end") ?? "");
          setLoading(true);
          setError("");
          setMsg("");
          try {
            const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/availability/weekly`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ weekday, start, end }),
            });
            const data = await jsonOrNull(res);
            if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Add weekly failed"));
            setWeeklyAvails((prev) => [...prev, data.slot]);
          } catch (e2: any) {
            setError(String(e2?.message ?? "Add weekly failed"));
          } finally {
            setLoading(false);
          }
        }}
        style={{ display: "flex", gap: 8, marginBottom: 12 }}
      >
        <select name="weekday" defaultValue="1">
          {WEEKDAYS.map((w, i) => (
            <option key={i} value={i}>
              {w.en}/{w.zh}({i})
            </option>
          ))}
        </select>
        <BlurTimeInput name="start" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="18:00" />
        <BlurTimeInput name="end" min={AVAIL_MIN_TIME} max={AVAIL_MAX_TIME} step={900} defaultValue="20:00" />
        <button type="submit" disabled={loading}>
          {labels.addWeekly}
        </button>
      </form>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">Weekday</th>
            <th align="left">Start</th>
            <th align="left">End</th>
            <th align="left">Action</th>
          </tr>
        </thead>
        <tbody>
          {weeklyAvails.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{WEEKDAYS[a.weekday] ? `${WEEKDAYS[a.weekday].en}/${WEEKDAYS[a.weekday].zh}` : a.weekday}</td>
              <td>{fromMin(a.startMin)}</td>
              <td>{fromMin(a.endMin)}</td>
              <td>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    setMsg("");
                    try {
                      const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/availability/weekly`, {
                        method: "DELETE",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ id: a.id }),
                      });
                      const data = await jsonOrNull(res);
                      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Delete failed"));
                      setWeeklyAvails((prev) => prev.filter((x) => x.id !== a.id));
                    } catch (e: any) {
                      setError(String(e?.message ?? "Delete failed"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {labels.delete}
                </button>
              </td>
            </tr>
          ))}
          {weeklyAvails.length === 0 ? (
            <tr>
              <td colSpan={4}>{labels.noWeekly}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError("");
          setMsg("");
          try {
            const res = await fetch(`/api/admin/teachers/${encodeURIComponent(teacherId)}/availability/generate-month`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ month }),
            });
            const data = await jsonOrNull(res);
            if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Generate failed"));
            setMsg(`Generated ${Number(data.created ?? 0)}`);
            // Re-load month to reflect new date slots.
            await loadMonth(month);
          } catch (e: any) {
            setError(String(e?.message ?? "Generate failed"));
          } finally {
            setLoading(false);
          }
        }}
      >
        {labels.generate}
      </button>
    </div>
  );
}
