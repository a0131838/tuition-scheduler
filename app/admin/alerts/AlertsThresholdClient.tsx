"use client";

import { useState } from "react";

export default function AlertsThresholdClient({
  initialThreshold,
  currentThresholdMin,
  labels,
}: {
  initialThreshold: number;
  currentThresholdMin: number;
  labels: {
    label: string;
    save: string;
    saved: string;
    current: string;
    errorPrefix: string;
  };
}) {
  const [value, setValue] = useState(String(initialThreshold));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState(currentThresholdMin);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/alerts/threshold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ thresholdMin: value }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      setCurrent(Number(data.thresholdMin));
      setMsg(labels.saved);
    } catch (e: any) {
      setErr(String(e?.message ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {err ? <span style={{ color: "#b00" }}>{labels.errorPrefix}: {err}</span> : null}
      {msg ? <span style={{ color: "#087" }}>{msg}</span> : null}
      <label>
        {labels.label}:
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="number"
          min={1}
          style={{ marginLeft: 6, width: 100 }}
        />
      </label>
      <button type="submit" disabled={saving}>
        {saving ? "..." : labels.save}
      </button>
      <span style={{ color: "#64748b", fontSize: 12 }}>
        {labels.current}: {current} min
      </span>
    </form>
  );
}

