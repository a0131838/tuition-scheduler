"use client";

import { useMemo, useState } from "react";
import SimpleModal from "../_components/SimpleModal";
import NoticeBanner from "../_components/NoticeBanner";

type Campus = { id: string; name: string };
type RoomRow = { id: string; name: string; capacity: number; campusId: string; campusName: string };

export default function RoomsClient({
  campuses,
  initialRooms,
  labels,
}: {
  campuses: Campus[];
  initialRooms: RoomRow[];
  labels: {
    addRoom: string;
    roomName: string;
    capacity: string;
    selectCampus: string;
    add: string;
    createCampusFirst: string;
    room: string;
    campus: string;
    action: string;
    delete: string;
    deleteConfirm: string;
    noRooms: string;
    errorPrefix: string;
  };
}) {
  const [rooms, setRooms] = useState<RoomRow[]>(initialRooms);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const sorted = useMemo(() => [...rooms].sort((a, b) => a.name.localeCompare(b.name)), [rooms]);

  async function create(payload: { name: string; capacity: number; campusId: string }) {
    if (saving) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        setErr(String(data?.message ?? "Create failed"));
        return false;
      }
      setRooms((prev) => [data.room as RoomRow, ...prev]);
      setMsg("Created");
      return true;
    } catch (e: any) {
      setErr(String(e?.message ?? "Create failed"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (saving) return;
    if (!confirm(labels.deleteConfirm)) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) {
        setErr(String(data?.message ?? "Delete failed"));
        return;
      }
      setRooms((prev) => prev.filter((x) => x.id !== id));
      setMsg("Deleted");
    } catch (e: any) {
      setErr(String(e?.message ?? "Delete failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {err ? <NoticeBanner type="error" title={labels.errorPrefix} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title="Success" message={msg} /> : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={labels.addRoom} title={labels.addRoom} closeOnSubmit>
          {({ close }) => (
            <RoomCreateForm
              campuses={campuses}
              labels={labels}
              saving={saving}
              onCreate={async (payload) => {
                const ok = await create(payload);
                if (ok) close();
              }}
            />
          )}
        </SimpleModal>
      </div>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{labels.room}</th>
            <th align="left">{labels.campus}</th>
            <th align="left">{labels.capacity}</th>
            <th align="left">{labels.action}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{r.name}</td>
              <td>{r.campusName}</td>
              <td>{r.capacity}</td>
              <td>
                <button type="button" onClick={() => del(r.id)} disabled={saving}>
                  {labels.delete}
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4}>{labels.noRooms}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RoomCreateForm({
  campuses,
  labels,
  saving,
  onCreate,
}: {
  campuses: Campus[];
  labels: {
    roomName: string;
    capacity: string;
    selectCampus: string;
    add: string;
    createCampusFirst: string;
  };
  saving: boolean;
  onCreate: (payload: { name: string; capacity: number; campusId: string }) => void;
}) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [campusId, setCampusId] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const cap = Number(capacity);
        if (!name.trim() || !campusId || !Number.isFinite(cap) || cap <= 0) return;
        onCreate({ name: name.trim(), capacity: cap, campusId });
      }}
      style={{ display: "grid", gap: 8, maxWidth: 520 }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.roomName} />
      <input
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        type="number"
        min={1}
        placeholder={labels.capacity}
      />
      <select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
        <option value="" disabled>
          {labels.selectCampus}
        </option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={saving || campuses.length === 0}>
        {labels.add}
      </button>
      {campuses.length === 0 && <p style={{ color: "#b00" }}>{labels.createCampusFirst}</p>}
    </form>
  );
}
