"use client";

import { useState } from "react";

export default function TeacherConfirmCoursesButton({
  dayKind,
  date,
  initialConfirmedAt,
  labels,
}: {
  dayKind: "today" | "tomorrow";
  date: string; // YYYY-MM-DD
  initialConfirmedAt: string | null;
  labels: {
    confirm: string;
    confirmed: string;
    errorPrefix: string;
  };
}) {
  const [confirmedAt, setConfirmedAt] = useState<string | null>(initialConfirmedAt);
  const [saving, setSaving] = useState(false);

  async function onConfirm() {
    if (saving || confirmedAt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/confirm-courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayKind, date }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        throw new Error(String(data?.message ?? "Request failed"));
      }
      setConfirmedAt(String(data.confirmedAt ?? new Date().toISOString()));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  if (confirmedAt) {
    return (
      <span style={{ color: "#166534", fontWeight: 700 }}>
        {labels.confirmed}: {new Date(confirmedAt).toLocaleTimeString()}
      </span>
    );
  }

  return (
    <button type="button" onClick={onConfirm} disabled={saving}>
      {labels.confirm}
    </button>
  );
}

