"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AttendanceEditor, { AttendanceRow } from "./AttendanceEditor";

export default function AdminSessionAttendanceClient({
  sessionId,
  lang,
  rows,
  canMarkAll,
  labels,
}: {
  sessionId: string;
  lang: any;
  rows: AttendanceRow[];
  canMarkAll: boolean;
  labels: {
    title: string;
    markAllPresent: string;
    markAllPresentWaived: string;
    save: string;
    saving: string;
    saveErrorPrefix: string;
    markAllErrorPrefix: string;
    waiveDeduction: string;
    waiveHint: string;
    waiveReasonPlaceholder: string;
  };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const initialWaiveDeduction = rows.some((row) => Boolean(row.waiveDeduction));
  const initialWaiveReason =
    rows.find((row) => row.waiveReason && row.waiveReason.trim())?.waiveReason ?? "Assessment lesson";
  const [waiveDeduction, setWaiveDeduction] = useState(initialWaiveDeduction);
  const [waiveReason, setWaiveReason] = useState(initialWaiveReason);
  const markAllLabel = waiveDeduction ? labels.markAllPresentWaived : labels.markAllPresent;

  function refreshPreserveScroll() {
    const y = window.scrollY;
    router.refresh();
    // Give the browser a moment to paint the refreshed content before restoring scroll.
    setTimeout(() => window.scrollTo(0, y), 0);
  }

  async function markAll() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/attendance/mark-all-present`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ waiveDeduction, waiveReason }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Mark all failed"));
      refreshPreserveScroll();
    } catch (e: any) {
      alert(`${labels.markAllErrorPrefix}: ${e?.message ?? "Mark all failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function save(formData: FormData) {
    if (saving) return;
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        studentId: r.studentId,
        status: String(formData.get(`status:${r.studentId}`) ?? r.status),
        deductedMinutes: Number(formData.get(`dm:${r.studentId}`) ?? r.deductedMinutes),
        deductedCount: Number(formData.get(`dc:${r.studentId}`) ?? r.deductedCount),
        note: String(formData.get(`note:${r.studentId}`) ?? r.note ?? ""),
        packageId: String(formData.get(`pkg:${r.studentId}`) ?? r.packageId ?? ""),
        excusedCharge: String(formData.get(`charge:${r.studentId}`) ?? "") === "on",
        waiveDeduction,
        waiveReason: waiveDeduction ? waiveReason : "",
      }));

      const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/attendance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Save failed"));
      refreshPreserveScroll();
    } catch (e: any) {
      alert(`${labels.saveErrorPrefix}: ${e?.message ?? "Save failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div
        style={{
          border: "1px solid #fde68a",
          background: "#fffbeb",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={waiveDeduction}
            onChange={(e) => setWaiveDeduction(e.target.checked)}
          />
          {labels.waiveDeduction}
        </label>
        <div style={{ color: "#666", fontSize: 12 }}>
          {labels.waiveHint}
        </div>
        <input
          type="text"
          value={waiveReason}
          onChange={(e) => setWaiveReason(e.target.value)}
          placeholder={labels.waiveReasonPlaceholder}
          disabled={!waiveDeduction}
          style={{ maxWidth: 360 }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>{labels.title}</div>
        {canMarkAll && (
          <button type="button" onClick={markAll} disabled={saving}>
            {saving ? labels.saving : markAllLabel}
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(new FormData(e.currentTarget));
        }}
      >
        <AttendanceEditor lang={lang} rows={rows} />
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={saving}>
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </form>
    </div>
  );
}
