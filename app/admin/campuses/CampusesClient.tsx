"use client";

import { useEffect, useMemo, useState } from "react";

type CampusRow = { id: string; name: string; isOnline: boolean; requiresRoom: boolean };

export default function CampusesClient({
  initialCampuses,
  labels,
}: {
  initialCampuses: CampusRow[];
  labels: {
    campusName: string;
    onlineCampus: string;
    requiresRoom: string;
    noRoomNeeded: string;
    add: string;
    name: string;
    type: string;
    typeOnline: string;
    typeOffline: string;
    action: string;
    delete: string;
    deleteConfirm: string;
    noCampuses: string;
    errorPrefix: string;
  };
}) {
  const [campuses, setCampuses] = useState<CampusRow[]>(initialCampuses);
  const [name, setName] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [requiresRoom, setRequiresRoom] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCampuses(initialCampuses);
  }, [initialCampuses]);

  const sorted = useMemo(() => [...campuses].sort((a, b) => a.name.localeCompare(b.name)), [campuses]);

  async function create() {
    const v = name.trim();
    if (!v || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/campuses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: v, isOnline, requiresRoom }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Create failed"));
      setCampuses((prev) => [data.campus as CampusRow, ...prev]);
      setName("");
      setIsOnline(false);
      setRequiresRoom(true);
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Create failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateCampus(id: string, patch: Partial<Pick<CampusRow, "isOnline" | "requiresRoom">>) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/campuses", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Update failed"));
      setCampuses((prev) => prev.map((row) => (row.id === id ? (data.campus as CampusRow) : row)));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Update failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (saving) return;
    if (!confirm(labels.deleteConfirm)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/campuses", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Delete failed"));
      setCampuses((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Delete failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.campusName} />
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={isOnline}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsOnline(checked);
              if (checked) setRequiresRoom(false);
            }}
          />
          {labels.onlineCampus}
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={requiresRoom}
            disabled={isOnline}
            onChange={(e) => setRequiresRoom(e.target.checked)}
          />
          {labels.requiresRoom}
        </label>
        <button type="button" onClick={create} disabled={saving}>
          {labels.add}
        </button>
      </div>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{labels.name}</th>
            <th align="left">{labels.type}</th>
            <th align="left">{labels.requiresRoom}</th>
            <th align="left">ID</th>
            <th align="left">{labels.action}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{c.name}</td>
              <td>{c.isOnline ? labels.typeOnline : labels.typeOffline}</td>
              <td>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={c.requiresRoom}
                    disabled={saving || c.isOnline}
                    onChange={(e) => updateCampus(c.id, { requiresRoom: e.target.checked })}
                  />
                  {c.requiresRoom ? labels.requiresRoom : labels.noRoomNeeded}
                </label>
              </td>
              <td style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }} title={c.id}>
                CMP-{c.id.length > 10 ? `${c.id.slice(0, 4)}…${c.id.slice(-4)}` : c.id}
              </td>
              <td>
                <button type="button" onClick={() => del(c.id)} disabled={saving}>
                  {labels.delete}
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5}>{labels.noCampuses}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
