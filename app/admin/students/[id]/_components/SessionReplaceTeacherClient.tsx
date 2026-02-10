"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

type TeacherOption = { id: string; name: string };

export default function SessionReplaceTeacherClient({
  studentId,
  sessionId,
  teachers,
  labels,
}: {
  studentId: string;
  sessionId: string;
  teachers: TeacherOption[];
  labels: {
    changeTeacher: string;
    selectTeacher: string;
    reasonOptional: string;
    replaceTeacher: string;
    ok: string;
    error: string;
  };
}) {
  const router = useRouter();
  const [newTeacherId, setNewTeacherId] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    setErr("");
    setMsg("");
    if (!newTeacherId) return;

    const res = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/sessions/replace-teacher`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, newTeacherId, reason }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErr(String(data?.message ?? "Replace teacher failed"));
      return;
    }
    setMsg("OK");
    setNewTeacherId("");
    setReason("");
    router.refresh();
  }

  return (
    <details>
      <summary style={{ cursor: "pointer" }}>{labels.changeTeacher}</summary>
      {err ? <NoticeBanner type="error" title={labels.error} message={err} /> : null}
      {msg ? <NoticeBanner type="success" title={labels.ok} message={msg} /> : null}
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        <select value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)} style={{ minWidth: 200 }}>
          <option value="" disabled>
            {labels.selectTeacher}
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.reasonOptional} />
        <button type="button" onClick={submit} disabled={!newTeacherId}>
          {labels.replaceTeacher}
        </button>
      </div>
    </details>
  );
}

