"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherLanguageSelectorClient({
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
      const res = await fetch("/api/teacher/language", {
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
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select
        name="lang"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{ minWidth: 146, padding: "6px 8px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12 }}
      >
        <option value="BILINGUAL">Bilingual / 双语</option>
        <option value="ZH">中文</option>
        <option value="EN">English</option>
      </select>
      <button
        type="button"
        onClick={apply}
        disabled={saving}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          color: "#1d4ed8",
          fontWeight: 700,
        }}
      >
        {saving ? "..." : "Apply / 应用"}
      </button>
    </div>
  );
}
