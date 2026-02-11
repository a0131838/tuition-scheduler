"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "../../../_components/NoticeBanner";
import StudentSearchSelect from "../../../_components/StudentSearchSelect";

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDatetimeLocal(s: string) {
  const [date, time] = s.split("T");
  const [Y, M, D] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Y, M - 1, D, hh, mm, 0, 0);
}

export default function NewSingleAppointmentClient({
  teachers,
  students,
  labels,
}: {
  teachers: Array<{ id: string; name: string }>;
  students: Array<{ id: string; name: string }>;
  labels: {
    rejectedTitle: string;
    teacher: string;
    student: string;
    searchStudent: string;
    start: string;
    durationMin: string;
    create: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
      {err ? <NoticeBanner type="error" title={labels.rejectedTitle} message={err} /> : null}

      <form
        ref={formRef}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setErr("");
          setBusy(true);
          try {
            const fd = new FormData(formRef.current ?? undefined);
            const teacherId = String(fd.get("teacherId") ?? "");
            const studentId = String(fd.get("studentId") ?? "");
            const startAtStr = String(fd.get("startAt") ?? "");
            const durationMin = Number(fd.get("durationMin") ?? 60);

            if (!teacherId || !studentId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
              setErr("Invalid input");
              return;
            }

            const startAt = parseDatetimeLocal(startAtStr);

            const res = await fetch("/api/admin/appointments", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ teacherId, studentId, startAt: startAtStr, durationMin }),
            });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }

            const weekStart = ymd(startOfWeekMonday(startAt));
            const url = `/admin/schedule?${new URLSearchParams({ view: "teacher", teacherId, weekStart }).toString()}`;
            router.push(url);
          } finally {
            setBusy(false);
          }
        }}
        style={{ display: "grid", gap: 10 }}
      >
        <label>
          {labels.teacher}:
          <select name="teacherId" defaultValue={teachers[0]?.id ?? ""} style={{ marginLeft: 8, minWidth: 320 }} disabled={busy}>
            {teachers.map((tch) => (
              <option key={tch.id} value={tch.id}>
                {tch.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {labels.student}:
          <div style={{ marginLeft: 8 }}>
            <StudentSearchSelect
              name="studentId"
              placeholder={labels.searchStudent}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
            />
          </div>
        </label>

        <label>
          {labels.start}:
          <input name="startAt" type="datetime-local" required style={{ marginLeft: 8 }} disabled={busy} />
        </label>

        <label>
          {labels.durationMin}:
          <input name="durationMin" type="number" min={15} step={15} defaultValue={60} style={{ marginLeft: 8 }} disabled={busy} />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? `${labels.create}...` : labels.create}
        </button>
      </form>
    </div>
  );
}
