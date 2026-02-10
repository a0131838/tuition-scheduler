"use client";

import { useMemo, useState } from "react";

type Row = { id: string; name: string; isActive: boolean };

export default function StudentTypesClient({
  initialTypes,
  labels,
}: {
  initialTypes: Row[];
  labels: {
    placeholder: string;
    add: string;
    name: string;
    active: string;
    students: string;
    action: string;
    yes: string;
    no: string;
    filter: string;
    disable: string;
    enable: string;
    delete: string;
    deleteConfirm: string;
    deleteBlocked: string;
    errorPrefix: string;
  };
}) {
  const [types, setTypes] = useState<Row[]>(initialTypes);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    return [...types].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [types]);

  async function create() {
    const v = name.trim();
    if (!v || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/student-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: v }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Create failed"));
      setTypes((prev) => [data.type as Row, ...prev]);
      setName("");
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Create failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, isActive: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/student-types", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Update failed"));
      setTypes((prev) => prev.map((x) => (x.id === id ? (data.type as Row) : x)));
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
      const res = await fetch("/api/admin/student-types", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        if (String(data?.message ?? "").includes("used")) throw new Error(labels.deleteBlocked);
        throw new Error(String(data?.message ?? "Delete failed"));
      }
      setTypes((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(`${labels.errorPrefix}: ${e?.message ?? "Delete failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.placeholder} />
        <button type="button" onClick={create} disabled={saving}>
          {labels.add}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ color: "#999" }}>-</div>
      ) : (
        <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{labels.name}</th>
              <th align="left">{labels.active}</th>
              <th align="left">{labels.students}</th>
              <th align="left">{labels.action}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tt) => (
              <tr key={tt.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{tt.name}</td>
                <td>{tt.isActive ? labels.yes : labels.no}</td>
                <td>
                  <a href={`/admin/students?studentTypeId=${tt.id}`}>{labels.filter}</a>
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => toggle(tt.id, !tt.isActive)} disabled={saving}>
                    {tt.isActive ? labels.disable : labels.enable}
                  </button>
                  <button type="button" onClick={() => del(tt.id)} disabled={saving}>
                    {labels.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

