"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TeacherOption = { id: string; name: string };

function preserveRefresh(router: ReturnType<typeof useRouter>) {
  const y = window.scrollY;
  router.refresh();
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export default function ScheduleReplaceTeacherClient({
  kind,
  id,
  classId,
  teachers,
  labels,
}: {
  kind: "session" | "appointment";
  id: string;
  classId?: string;
  teachers: TeacherOption[];
  labels: {
    selectTeacher: string;
    reasonOptional: string;
    replace: string;
    errorPrefix: string;
    thisSessionOnly?: string;
    futureSessions?: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [scope, setScope] = useState<"single" | "future">("single");
  const [reason, setReason] = useState("");

  const canSubmit = Boolean(newTeacherId) && !busy;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {err ? (
        <div style={{ color: "#b00", fontSize: 12 }}>
          {labels.errorPrefix}: {err}
        </div>
      ) : null}

      <select value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)} style={{ minWidth: 180 }} disabled={busy}>
        <option value="" disabled>
          {labels.selectTeacher}
        </option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {kind === "session" ? (
        <select value={scope} onChange={(e) => setScope(e.target.value as any)} disabled={busy}>
          <option value="single">{labels.thisSessionOnly ?? "This session only"}</option>
          <option value="future">{labels.futureSessions ?? "Future sessions"}</option>
        </select>
      ) : null}

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={labels.reasonOptional}
        disabled={busy}
      />

      <button
        type="button"
        disabled={!canSubmit}
        onClick={async () => {
          if (!newTeacherId) return;
          setErr("");
          setBusy(true);
          try {
            const res =
              kind === "session"
                ? await fetch(`/api/admin/classes/${encodeURIComponent(classId ?? "")}/sessions/replace-teacher`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ sessionId: id, newTeacherId, scope, reason }),
                  })
                : await fetch(`/api/admin/appointments/${encodeURIComponent(id)}/replace-teacher`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ newTeacherId, reason }),
                  });

            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }

            setNewTeacherId("");
            setReason("");
            preserveRefresh(router);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? `${labels.replace}...` : labels.replace}
      </button>
    </div>
  );
}

