"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";

function tr(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

async function readErr(res: Response) {
  if (res.ok) return "";
  const t = await res.text().catch(() => "");
  return t || `Request failed: ${res.status}`;
}

export default function SlotVisibilityToggleCard(props: {
  lang: Lang;
  linkId: string;
  teacherId: string;
  startAtIso: string;
  endAtIso: string;
  startLabel: string;
  endLabel: string;
  teacherName: string;
  initialVisible: boolean;
}) {
  const { lang } = props;
  const [visible, setVisible] = useState<boolean>(props.initialVisible);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const next = !visible;
      const res = await fetch(`/api/admin/booking-links/${encodeURIComponent(props.linkId)}/selected-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: props.teacherId,
          startAt: props.startAtIso,
          endAt: props.endAtIso,
          checked: next,
        }),
      });
      const err = await readErr(res);
      if (err) {
        window.alert(err);
        return;
      }
      setVisible(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        fontSize: 12,
        border: `1px solid ${visible ? "#98d8b5" : "#e3e3e3"}`,
        background: visible ? "#effcf3" : "#f8f8f8",
        borderRadius: 4,
        padding: 4,
        display: "grid",
        gap: 4,
      }}
    >
      <div>
        {props.startLabel}-{props.endLabel} {props.teacherName}
        <span style={{ marginLeft: 6, color: visible ? "#157347" : "#777" }}>
          {visible ? tr(lang, "(Visible to student)", "（学生可见）") : tr(lang, "(Hidden from student)", "（学生不可见）")}
        </span>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        style={{
          border: "none",
          borderRadius: 4,
          padding: "5px 8px",
          cursor: busy ? "not-allowed" : "pointer",
          background: visible ? "#6c757d" : "#0d6efd",
          color: "#fff",
          opacity: busy ? 0.8 : 1,
        }}
      >
        {busy ? "..." : visible ? tr(lang, "Change to hidden", "改为学生不可见") : tr(lang, "Change to visible", "改为学生可见")}
      </button>
    </div>
  );
}

