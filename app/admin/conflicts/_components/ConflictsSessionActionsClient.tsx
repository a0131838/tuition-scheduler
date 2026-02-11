"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TeacherOption = { id: string; name: string };
type RoomOption = { id: string; name: string; capacity: number };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function ConflictsSessionActionsClient({
  sessionId,
  classId,
  eligibleTeachers,
  defaultTeacherId,
  rooms,
  defaultRoomId,
  classCapacity,
  rangeFrom,
  rangeTo,
  labels,
}: {
  sessionId: string;
  classId: string;
  eligibleTeachers: TeacherOption[];
  defaultTeacherId: string;
  rooms: RoomOption[];
  defaultRoomId: string;
  classCapacity: number;
  rangeFrom: string;
  rangeTo: string;
  labels: {
    errorPrefix: string;
    changeSessionTeacher: string;
    reasonOptional: string;
    confirmChangeSessionTeacher: string;
    noEligibleTeachers: string;
    changeRoomClass: string;
    noneRoom: string;
    capacityLabel: string;
    confirm: string;
    noRooms: string;
    cancelSession: string;
    roomNote: string;
    disabledRoomNotePrefix: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [newTeacherId, setNewTeacherId] = useState(defaultTeacherId);
  const [reason, setReason] = useState("");

  const [roomId, setRoomId] = useState(defaultRoomId);

  const hasDisabledRooms = useMemo(() => rooms.some((r) => r.capacity < classCapacity), [rooms, classCapacity]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}

      <div style={{ border: "1px solid #dbeafe", borderRadius: 8, padding: 8, background: "#f8fbff" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>
          {labels.changeSessionTeacher}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <select
            value={newTeacherId}
            onChange={(e) => setNewTeacherId(e.target.value)}
            disabled={busy || eligibleTeachers.length === 0}
          >
            {eligibleTeachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.reasonOptional} disabled={busy} />
          <button
            type="button"
            disabled={busy || eligibleTeachers.length === 0 || !newTeacherId}
            onClick={async () => {
              if (busy) return;
              setErr("");
              setBusy(true);
              try {
                const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/replace-teacher`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ newTeacherId, reason }),
                });
                const data = (await res.json().catch(() => null)) as any;
                if (!res.ok || !data?.ok) {
                  setErr(String(data?.message ?? `Request failed (${res.status})`));
                  return;
                }
                setReason("");
                preserveRefresh(router);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? `${labels.confirmChangeSessionTeacher}...` : labels.confirmChangeSessionTeacher}
          </button>

          {eligibleTeachers.length === 0 ? <div style={{ color: "#b00", fontSize: 12 }}>{labels.noEligibleTeachers}</div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12 }}>{labels.changeRoomClass}</span>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={busy || rooms.length === 0}>
            <option value="">{labels.noneRoom}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} disabled={r.capacity < classCapacity}>
                {r.name} ({labels.capacityLabel} {r.capacity})
              </option>
            ))}
          </select>
        </label>

        {hasDisabledRooms ? <div style={{ fontSize: 11, color: "#b45309" }}>{labels.disabledRoomNotePrefix}</div> : null}
        <div style={{ fontSize: 11, color: "#666" }}>{labels.roomNote}</div>

        <button
          type="button"
          disabled={busy || rooms.length === 0}
          onClick={async () => {
            if (busy) return;
            setErr("");
            setBusy(true);
            try {
              const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/change-room`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ roomId, rangeFrom, rangeTo }),
              });
              const data = (await res.json().catch(() => null)) as any;
              if (!res.ok || !data?.ok) {
                setErr(String(data?.message ?? `Request failed (${res.status})`));
                return;
              }
              preserveRefresh(router);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? `${labels.confirm}...` : labels.confirm}
        </button>

        {rooms.length === 0 ? <div style={{ color: "#b00", fontSize: 12 }}>{labels.noRooms}</div> : null}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }
            preserveRefresh(router);
          } finally {
            setBusy(false);
          }
        }}
        style={{ background: "#fee2e2", borderColor: "#fca5a5" }}
      >
        {busy ? `${labels.cancelSession}...` : labels.cancelSession}
      </button>
    </div>
  );
}

