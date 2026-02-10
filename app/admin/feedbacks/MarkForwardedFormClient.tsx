"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkForwardedFormClient({
  id,
  labels,
}: {
  id: string;
  labels: {
    channelPlaceholder: string;
    notePlaceholder: string;
    submit: string;
    saving: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [channel, setChannel] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function refreshPreserveScroll() {
    const y = window.scrollY;
    router.refresh();
    setTimeout(() => window.scrollTo(0, y), 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feedbacks/forwarded", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, channel, note }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      refreshPreserveScroll();
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 6, maxWidth: 360 }}>
      <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder={labels.channelPlaceholder} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={labels.notePlaceholder} />
      <div>
        <button type="submit" disabled={saving}>
          {saving ? labels.saving : labels.submit}
        </button>
      </div>
    </form>
  );
}

