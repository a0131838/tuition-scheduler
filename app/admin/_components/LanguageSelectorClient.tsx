"use client";

import { useEffect, useState } from "react";

export default function LanguageSelectorClient({
  initialLang,
}: {
  initialLang: "BILINGUAL" | "ZH" | "EN" | string;
}) {
  const [lang, setLang] = useState(String(initialLang || "BILINGUAL"));
  const [saving, setSaving] = useState(false);
  const label = (en: string, zh: string) => lang === "ZH" ? zh : lang === "EN" ? en : `${en} / ${zh}`;

  const getMainScrollTop = () => {
    if (typeof document === "undefined") return 0;
    const main = document.querySelector(".app-main") as HTMLElement | null;
    if (main) return main.scrollTop || 0;
    return window.scrollY || 0;
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("sgt-language-scroll");
      if (!saved) return;
      sessionStorage.removeItem("sgt-language-scroll");
      const state = JSON.parse(saved);
      if (state.path !== window.location.pathname + window.location.search || Date.now() - state.at > 30000) return;
      const restore = () => {
        const main = document.querySelector(".app-main") as HTMLElement | null;
        if (main) main.scrollTop = Math.max(0, Number(state.top) || 0);
      };
      restore();
      const frame = requestAnimationFrame(restore);
      return () => cancelAnimationFrame(frame);
    } catch { /* Scroll restoration is optional; saved language remains authoritative. */ }
  }, []);

  async function apply() {
    if (saving) return;
    const y = getMainScrollTop();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/language", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? label("Unable to save language preference", "无法保存语言设置")));
      try {
        sessionStorage.setItem("sgt-language-scroll", JSON.stringify({path:window.location.pathname+window.location.search,top:y,at:Date.now()}));
      } catch { /* A blocked storage preference must not block the language change. */ }
      // Fetch the persisted preference and all server-rendered labels together.
      window.location.reload();
    } catch {
      alert(label("Unable to save language preference. Please try again.", "无法保存语言设置，请重试。"));
      setSaving(false);
    }
  }

  return (
    <div className="language-selector" style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap:"wrap" }}>
      <select
        name="lang"
        aria-label={label("Language", "语言")}
        value={lang}
        disabled={saving}
        onChange={(e) => setLang(e.target.value)}
        style={{ minWidth: 140, padding: "4px 6px", borderRadius: 6, fontSize: 12 }}
      >
        <option value="BILINGUAL">Bilingual / 双语</option>
        <option value="ZH">中文</option>
        <option value="EN">English</option>
      </select>
      <button
        type="button"
        onClick={apply}
        disabled={saving}
        style={{ minWidth: 58, whiteSpace: "nowrap", overflowWrap: "normal", flex: "0 0 auto" }}
      >
        {saving ? label("Saving…", "保存中…") : label("Apply", "应用")}
      </button>
      {lang !== initialLang && <small style={{flexBasis:"100%",textAlign:"right",color:"#64748b"}}>{label("Save unfinished edits before applying the language; the page will reload.","应用语言将重新加载页面，请先保存未完成的编辑。")}</small>}
    </div>
  );
}
