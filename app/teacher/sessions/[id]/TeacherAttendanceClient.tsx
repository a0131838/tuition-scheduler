"use client";

import { useMemo, useState } from "react";

type Row = {
  studentId: string;
  studentName: string;
  status: string;
  note: string;
};

export default function TeacherAttendanceClient({
  sessionId,
  initialRows,
  labels,
}: {
  sessionId: string;
  initialRows: Row[];
  labels: {
    save: string;
    saved: string;
    errorPrefix: string;
    colStudent: string;
    colStatus: string;
    colNote: string;
  };
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const statusOptions = useMemo(
    () => ["UNMARKED", "PRESENT", "ABSENT", "LATE", "EXCUSED"] as const,
    []
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/teacher/sessions/${encodeURIComponent(sessionId)}/attendance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            note: r.note,
          })),
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      setMsg(labels.saved);
    } catch (e: any) {
      setErr(String(e?.message ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave}>
      {err ? <div style={{ color: "#b00", marginBottom: 10 }}>{labels.errorPrefix}: {err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div> : null}
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{labels.colStudent}</th>
            <th align="left">{labels.colStatus}</th>
            <th align="left">{labels.colNote}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.studentId} style={{ borderTop: "1px solid #eee" }}>
              <td>{r.studentName}</td>
              <td>
                <select
                  value={r.status}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, status: e.target.value } : x)))
                  }
                >
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  value={r.note}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)))
                  }
                  style={{ width: "100%" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="submit" disabled={saving}>
        {saving ? "..." : labels.save}
      </button>
    </form>
  );
}
