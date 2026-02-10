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

export default function BookingLinkAdminActionsClient(props: {
  lang: Lang;
  linkId: string;
  initialIsActive: boolean;
  initialOnlySelectedSlots: boolean;
}) {
  const [isActive, setIsActive] = useState(props.initialIsActive);
  const [onlySelectedSlots, setOnlySelectedSlots] = useState(props.initialOnlySelectedSlots);
  const [busy, setBusy] = useState(false);

  async function patch(body: any) {
    const res = await fetch(`/api/admin/booking-links/${encodeURIComponent(props.linkId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const err = await readErr(res);
    if (err) throw new Error(err);
    return (await res.json()) as { link: { isActive: boolean; onlySelectedSlots: boolean } };
  }

  async function toggleActive() {
    if (busy) return;
    setBusy(true);
    try {
      const next = !isActive;
      const data = await patch({ isActive: next });
      setIsActive(!!data.link.isActive);
    } catch (e: any) {
      window.alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleOnlySelectedSlots() {
    if (busy) return;
    setBusy(true);
    try {
      const next = !onlySelectedSlots;
      const data = await patch({ onlySelectedSlots: next });
      setOnlySelectedSlots(!!data.link.onlySelectedSlots);
    } catch (e: any) {
      window.alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteLink() {
    if (busy) return;
    if (!window.confirm(tr(props.lang, "Delete link?", "确认删除链接？"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/booking-links/${encodeURIComponent(props.linkId)}`, { method: "DELETE" });
      const err = await readErr(res);
      if (err) throw new Error(err);
      window.location.href = "/admin/booking-links?msg=Link+deleted";
    } catch (e: any) {
      window.alert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={toggleActive} disabled={busy}>
        {busy
          ? "..."
          : isActive
          ? tr(props.lang, "Deactivate", "停用")
          : tr(props.lang, "Activate", "启用")}
      </button>
      <button type="button" onClick={toggleOnlySelectedSlots} disabled={busy}>
        {busy
          ? "..."
          : onlySelectedSlots
          ? tr(props.lang, "Show all slots to student", "学生显示所有时段")
          : tr(props.lang, "Only show selected slots", "仅显示勾选时段")}
      </button>
      <button type="button" onClick={deleteLink} disabled={busy} style={{ color: "#b00" }}>
        {busy ? "..." : tr(props.lang, "Delete Link", "删除链接")}
      </button>
    </div>
  );
}

