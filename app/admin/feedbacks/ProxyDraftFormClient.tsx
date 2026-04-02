"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProxyDraftFormClient({
  sessionId,
  teacherId,
  initialNote,
  afterSuccessStatus = "proxy",
  labels,
}: {
  sessionId: string;
  teacherId: string;
  initialNote: string;
  afterSuccessStatus?: string;
  labels: {
    placeholder: string;
    submit: string;
    saving: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  function replacePreserveScroll(nextUrl: string) {
    const y = window.scrollY;
    router.replace(nextUrl, { scroll: false });
    setTimeout(() => window.scrollTo(0, y), 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/feedbacks/proxy-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, teacherId, note }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("status", afterSuccessStatus);
      nextUrl.searchParams.set("focusSessionId", sessionId);
      nextUrl.searchParams.set("feedbackFlow", "proxy-draft");
      nextUrl.searchParams.delete("focusFeedbackId");
      nextUrl.searchParams.delete("msg");
      nextUrl.searchParams.delete("err");
      replacePreserveScroll(`${nextUrl.pathname}?${nextUrl.searchParams.toString()}`);
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 6 }}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={labels.placeholder}
      />
      <div>
        <button type="submit" disabled={saving}>
          {saving ? labels.saving : labels.submit}
        </button>
      </div>
    </form>
  );
}
