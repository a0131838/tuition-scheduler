"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

type SourceOption = { id: string; name: string };
type TypeOption = { id: string; name: string };

export default function StudentEditClient({
  studentId,
  initial,
  sources,
  types,
  gradeOptions,
  labels,
}: {
  studentId: string;
  initial: {
    name: string;
    school: string;
    grade: string;
    birthDate: string;
    sourceChannelId: string;
    studentTypeId: string;
    note: string;
  };
  sources: SourceOption[];
  types: TypeOption[];
  gradeOptions: string[];
  labels: {
    title: string;
    name: string;
    school: string;
    grade: string;
    birthDate: string;
    source: string;
    type: string;
    notes: string;
    save: string;
    deleteStudent: string;
    deleteConfirm: string;
    ok: string;
    error: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function save() {
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Save failed"));
      return;
    }
    setMsg("OK");
    router.refresh();
  }

  async function del() {
    if (!confirm(labels.deleteConfirm)) return;
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Delete failed"));
      return;
    }
    router.push("/admin/students");
  }

  return (
    <details id="edit-student" style={{ marginBottom: 14 }}>
      <summary style={{ fontWeight: 700 }}>{labels.title}</summary>

      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}

      <div style={{ display: "grid", gap: 8, maxWidth: 720, marginTop: 8 }}>
        <input
          value={form.name}
          placeholder={labels.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <input
          value={form.school}
          placeholder={labels.school}
          onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
          />
          <select value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}>
            <option value="">{labels.grade}</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={form.sourceChannelId}
            onChange={(e) => setForm((p) => ({ ...p, sourceChannelId: e.target.value }))}
          >
            <option value="">{labels.source}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={form.studentTypeId}
            onChange={(e) => setForm((p) => ({ ...p, studentTypeId: e.target.value }))}
          >
            <option value="">{labels.type}</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={form.note}
          placeholder={labels.notes}
          rows={4}
          onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
        />
        <button type="button" onClick={save} disabled={!canSave}>
          {labels.save}
        </button>

        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={del} style={{ color: "#b00" }}>
            {labels.deleteStudent}
          </button>
        </div>
      </div>
    </details>
  );
}

