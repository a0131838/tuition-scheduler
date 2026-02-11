"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NoticeBanner from "../../../_components/NoticeBanner";

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

function ClassTypeBadgeInline({ capacity }: { capacity: number }) {
  const oneOnOne = capacity === 1;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: oneOnOne ? "#fee2e2" : "#dbeafe",
        color: oneOnOne ? "#991b1b" : "#1e3a8a",
        border: `1px solid ${oneOnOne ? "#fecaca" : "#bfdbfe"}`,
      }}
    >
      {oneOnOne ? "1-on-1 / 一对一" : "Group / 班课"}
    </span>
  );
}

export default function NewSingleSessionClient({
  classes,
  students,
  defaultClassId,
  labels,
}: {
  classes: Array<{
    id: string;
    capacity: number;
    course: { name: string };
    subject: { name: string } | null;
    level: { name: string } | null;
    teacher: { id: string; name: string };
    campus: { name: string };
    room: { name: string } | null;
  }>;
  students: Array<{ id: string; name: string }>;
  defaultClassId: string;
  labels: {
    rejectedTitle: string;
    errorTitle: string;
    classLabel: string;
    studentForOneOnOne: string;
    selectStudent: string;
    start: string;
    durationMin: string;
    create: string;
    ruleHint: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

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
            const classId = String(fd.get("classId") ?? "");
            const startAtStr = String(fd.get("startAt") ?? "");
            const durationMin = Number(fd.get("durationMin") ?? 60);
            const studentId = String(fd.get("studentId") ?? "");

            if (!classId || !startAtStr || !Number.isFinite(durationMin) || durationMin < 15) {
              setErr("Invalid input");
              return;
            }

            const startAt = parseDatetimeLocal(startAtStr);

            const res = await fetch(`/api/admin/classes/${encodeURIComponent(classId)}/sessions`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ startAt: startAt.toISOString(), durationMin, studentId }),
            });
            const data = (await res.json().catch(() => null)) as any;
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? `Request failed (${res.status})`));
              return;
            }

            const teacherId = String(data?.session?.classTeacherId ?? classById.get(classId)?.teacher.id ?? "");
            const weekStart = ymd(startOfWeekMonday(startAt));
            const url = `/admin/schedule?${new URLSearchParams({ view: "teacher", teacherId, weekStart }).toString()}`;
            router.push(url);
          } finally {
            setBusy(false);
          }
        }}
        style={{ display: "grid", gap: 10 }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
          <ClassTypeBadgeInline capacity={2} />
          <ClassTypeBadgeInline capacity={1} />
        </div>

        <label>
          {labels.classLabel}:
          <select name="classId" defaultValue={defaultClassId} style={{ marginLeft: 8, minWidth: 520 }} disabled={busy}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.capacity === 1 ? "1-on-1/一对一" : "Group/班课"}] {c.course.name} / {c.subject?.name ?? "-"} / {c.level?.name ?? "-"} | Teacher:{" "}
                {c.teacher.name} | Campus: {c.campus.name} | Room: {c.room?.name ?? "(none)"} | CLS-{c.id.slice(0, 4)}…{c.id.slice(-4)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {labels.studentForOneOnOne}:
          <select name="studentId" defaultValue="" style={{ marginLeft: 8, minWidth: 260 }} disabled={busy}>
            <option value="">{labels.selectStudent}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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

        <p style={{ color: "#666", margin: 0 }}>{labels.ruleHint}</p>
      </form>
    </div>
  );
}
