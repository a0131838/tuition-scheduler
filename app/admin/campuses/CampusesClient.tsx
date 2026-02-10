"use client";

import { useMemo, useState } from "react";

type CampusRow = { id: string; name: string; isOnline: boolean };

export default function CampusesClient({
  initialCampuses,
  labels,
}: {
  initialCampuses: CampusRow[];
  labels: {
    campusName: string;
    onlineCampus: string;
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
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...campuses].sort((a, b) => a.name.localeCompare(b.name)), [campuses]);

  async function create() {
    const v = name.trim();
    if (!v || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/campuses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: v, isOnline }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Create failed"));
      setCampuses((prev) => [data.campus as CampusRow, ...prev]);
      setName("");
      setIsOnline(false);
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Create failed"}`);
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
          <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} />
          {labels.onlineCampus}
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
            <th align="left">ID</th>
            <th align="left">{labels.action}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{c.name}</td>
              <td>{c.isOnline ? labels.typeOnline : labels.typeOffline}</td>
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
              <td colSpan={4}>{labels.noCampuses}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

