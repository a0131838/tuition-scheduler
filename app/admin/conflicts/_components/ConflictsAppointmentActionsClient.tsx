"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeacherOption = { id: string; name: string };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function ConflictsAppointmentActionsClient({
  appointmentId,
  classId,
  teachers,
  defaultTeacherId,
  labels,
}: {
  appointmentId: string;
  classId: string;
  teachers: TeacherOption[];
  defaultTeacherId: string;
  labels: {
    changeTeacher: string;
    reasonOptional: string;
    confirmChange: string;
    cancel: string;
    errorPrefix: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newTeacherId, setNewTeacherId] = useState(defaultTeacherId);
  const [reason, setReason] = useState("");

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 12 }}>{labels.changeTeacher}</span>
        <select value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)} disabled={busy || teachers.length === 0}>
          {teachers.map((t) => (
            <option key={`${appointmentId}-${t.id}`} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.reasonOptional} disabled={busy} />

      <button
        type="button"
        disabled={busy || !newTeacherId || teachers.length === 0}
        onClick={async () => {
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/appointments/${encodeURIComponent(appointmentId)}/replace-teacher`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ newTeacherId, reason, classId }),
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
        {busy ? `${labels.confirmChange}...` : labels.confirmChange}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const res = await fetch(`/api/admin/appointments/${encodeURIComponent(appointmentId)}/cancel`, { method: "POST" });
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
        {busy ? `${labels.cancel}...` : labels.cancel}
      </button>
    </div>
  );
}

