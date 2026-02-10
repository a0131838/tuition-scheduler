"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PackageLedgerGiftClient({
  packageId,
  isGroupPack,
  labels,
}: {
  packageId: string;
  isGroupPack: boolean;
  labels: {
    count: string;
    minutes: string;
    note: string;
    add: string;
    saving: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [minutes, setMinutes] = useState("1");
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
      const res = await fetch(`/api/admin/packages/${encodeURIComponent(packageId)}/ledger/gift`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ minutes, note }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      setNote("");
      setMinutes("1");
      refreshPreserveScroll();
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <input
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        type="number"
        min={1}
        step={1}
        placeholder={isGroupPack ? labels.count : labels.minutes}
      />
      <input value={note} onChange={(e) => setNote(e.target.value)} type="text" placeholder={labels.note} style={{ minWidth: 220 }} />
      <button type="submit" disabled={saving}>
        {saving ? labels.saving : labels.add}
      </button>
    </form>
  );
}

