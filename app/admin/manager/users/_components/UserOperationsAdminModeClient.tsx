"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserOperationsAdminModeClient({
  userId,
  enabled,
  labels,
}: {
  userId: string;
  enabled: boolean;
  labels: { title: string; save: string; confirm: string; errorPrefix: string };
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!window.confirm(labels.confirm)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/manager/users/${userId}/operations-admin`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Save failed");
      router.refresh();
    } catch (error) {
      window.alert(`${labels.errorPrefix}: ${error instanceof Error ? error.message : "Save failed"}`);
      setChecked(enabled);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
        <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        {labels.title}
      </label>
      {checked !== enabled ? <button type="button" disabled={saving} onClick={save}>{saving ? "..." : labels.save}</button> : null}
    </div>
  );
}
