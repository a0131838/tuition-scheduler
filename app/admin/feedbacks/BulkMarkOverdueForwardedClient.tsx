"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkMarkOverdueForwardedClient({
  filterStudentId,
  labels,
}: {
  filterStudentId?: string;
  labels: {
    notePlaceholder: string;
    submit: string;
    saving: string;
    donePrefix: string;
    errorPrefix: string;
    confirmText: string;
  };
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [resultText, setResultText] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!window.confirm(labels.confirmText)) return;

    setSaving(true);
    setResultText("");
    try {
      const res = await fetch("/api/admin/feedbacks/bulk-forward-overdue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: filterStudentId, note }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));

      const summary = `${labels.donePrefix}: ${data.summary ?? "ok"}`;
      setResultText(summary);
      const y = window.scrollY;
      router.refresh();
      setTimeout(() => window.scrollTo(0, y), 0);
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        border: "1px solid #86efac",
        background: "#f0fdf4",
        borderRadius: 12,
        padding: 10,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, color: "#14532d", fontWeight: 700 }}>{labels.submit}</div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={labels.notePlaceholder}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" disabled={saving}>
          {saving ? labels.saving : labels.submit}
        </button>
        {resultText ? <span style={{ fontSize: 12, color: "#166534" }}>{resultText}</span> : null}
      </div>
    </form>
  );
}
