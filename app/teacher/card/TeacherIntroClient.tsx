"use client";

import { useState } from "react";

export default function TeacherIntroClient({
  initialIntro,
  labels,
}: {
  initialIntro: string;
  labels: { placeholder: string; save: string; saved: string };
}) {
  const [intro, setIntro] = useState(initialIntro);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/teacher/intro", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intro }),
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
    <form onSubmit={onSave} style={{ display: "grid", gap: 8 }}>
      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      {msg ? <div style={{ color: "#087" }}>{msg}</div> : null}
      <textarea
        name="intro"
        rows={5}
        value={intro}
        placeholder={labels.placeholder}
        onChange={(e) => setIntro(e.target.value)}
      />
      <div>
        <button type="submit" disabled={saving}>
          {saving ? "..." : labels.save}
        </button>
      </div>
    </form>
  );
}

