"use client";

import { useState } from "react";

export default function TeacherLanguageSelectorClient({
  initialLang,
}: {
  initialLang: "BILINGUAL" | "ZH" | "EN" | string;
}) {
  const [lang, setLang] = useState(String(initialLang || "BILINGUAL"));
  const [saving, setSaving] = useState(false);
  const label=(en:string,zh:string)=>lang==='EN'?en:lang==='ZH'?zh:`${en} / ${zh}`;

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
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? label("Unable to save language preference","无法保存语言设置")));
      window.location.reload();
    } catch (e: any) {
      alert(e?.message ?? label("Unable to save language preference","无法保存语言设置"));
      setSaving(false);
    }
  }

  return (
    <div className="language-selector" style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select
        name="lang"
        aria-label={label("Language","语言")}
        disabled={saving}
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
          whiteSpace: "nowrap",
          overflowWrap: "normal",
          wordBreak: "keep-all",
          flex: "0 0 auto",
        }}
      >
        {saving ? label("Saving…","保存中…") : label("Apply","应用")}
      </button>
      {lang !== initialLang && <small style={{flexBasis:"100%",textAlign:"right",color:"#64748b"}}>{label("Save unfinished edits before applying the language; the page will reload.","应用语言将重新加载页面，请先保存未完成的编辑。")}</small>}
    </div>
  );
}
