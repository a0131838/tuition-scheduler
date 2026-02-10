"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LanguageSelectorClient({
  initialLang,
}: {
  initialLang: "BILINGUAL" | "ZH" | "EN" | string;
}) {
  const router = useRouter();
  const [lang, setLang] = useState(String(initialLang || "BILINGUAL"));
  const [saving, setSaving] = useState(false);

  async function apply() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Apply failed"));
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Apply failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <select
        name="lang"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{ minWidth: 140, padding: "4px 6px", borderRadius: 6, fontSize: 12 }}
      >
        <option value="BILINGUAL">Bilingual / 双语</option>
        <option value="ZH">中文</option>
        <option value="EN">English</option>
      </select>
      <button type="button" onClick={apply} disabled={saving}>
        {saving ? "..." : "Apply"}
      </button>
    </div>
  );
}

