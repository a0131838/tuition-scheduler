"use client";

import { useState } from "react";

export default function TeacherAlertsQuickMarkClient({
  sessionId,
  studentIds,
  labels,
}: {
  sessionId: string;
  studentIds: string[];
  labels: { absent: string; excused: string; errorPrefix: string; saved: string };
}) {
  const [saving, setSaving] = useState<"" | "ABSENT" | "EXCUSED">("");

  async function run(status: "ABSENT" | "EXCUSED") {
    if (saving) return;
    setSaving(status);
    try {
      const res = await fetch("/api/teacher/alerts/quick-mark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, status, studentIds }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Update failed"));
      // This is a high-frequency flow; keep it smooth with a minimal success signal.
      // If user needs refreshed list, they can reload.
      alert(labels.saved);
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Update failed"}`);
    } finally {
      setSaving("");
    }
  }

  return (
    <>
      <button type="button" onClick={() => run("ABSENT")} disabled={saving !== ""} style={{ padding: "6px 10px" }}>
        {saving === "ABSENT" ? "..." : labels.absent}
      </button>
      <button type="button" onClick={() => run("EXCUSED")} disabled={saving !== ""} style={{ padding: "6px 10px" }}>
        {saving === "EXCUSED" ? "..." : labels.excused}
      </button>
    </>
  );
}

