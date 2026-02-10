"use client";

import { useMemo, useState } from "react";

type ReminderSession = {
  startAt: string;
  endAt: string;
  courseName: string;
  subjectName: string | null;
  levelName: string | null;
};

type ReminderRow = {
  id: string;
  name: string;
  sessions: ReminderSession[];
  teacherConfirmAt?: string | null;
};

type Kind = "teacher" | "student";

function fmtDateRange(startAtIso: string, endAtIso: string) {
  const startAt = new Date(startAtIso);
  const endAt = new Date(endAtIso);
  return `${startAt.toLocaleString()} - ${endAt.toLocaleTimeString()}`;
}

function courseLabel(s: ReminderSession) {
  const parts = [s.courseName, s.subjectName, s.levelName].filter(Boolean);
  return parts.join(" / ");
}

function formatSessionBrief(s: ReminderSession) {
  return `${fmtDateRange(s.startAt, s.endAt)} | ${courseLabel(s)}`;
}

function listWithLimit(items: string[], limit: number) {
  if (items.length <= limit) return items.join("; ");
  const shown = items.slice(0, limit).join("; ");
  return `${shown}; +${items.length - limit} more`;
}

async function postConfirm(kind: Kind, date: string, targetIds: string[]) {
  const res = await fetch("/api/admin/todos/reminders/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, date, targetIds }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(String(data?.message ?? "Confirm failed"));
  }
  return data as { ok: true; confirmedCount: number };
}

function ReminderCard(props: {
  kind: Kind;
  title: string;
  countLabel: string;
  showConfirmedLabel: string;
  hideConfirmedLabel: string;
  confirmAllLabel: string;
  confirmLabel: string;
  confirmedLabel: string;
  emptyLabel: string;
  date: string;
  maxListItems: number;
  initialPending: ReminderRow[];
  initialConfirmed: ReminderRow[];
}) {
  const {
    kind,
    title,
    countLabel,
    showConfirmedLabel,
    hideConfirmedLabel,
    confirmAllLabel,
    confirmLabel,
    confirmedLabel,
    emptyLabel,
    date,
    maxListItems,
    initialPending,
    initialConfirmed,
  } = props;

  const [showConfirmed, setShowConfirmed] = useState(false);
  const [pending, setPending] = useState<ReminderRow[]>(initialPending);
  const [confirmed, setConfirmed] = useState<ReminderRow[]>(initialConfirmed);
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState("");

  const pendingIds = useMemo(() => pending.map((p) => p.id), [pending]);

  const confirmIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    setError("");
    await postConfirm(kind, date, ids);
    setPending((prev) => prev.filter((x) => !ids.includes(x.id)));
    setConfirmed((prev) => {
      const moved = pending.filter((x) => ids.includes(x.id));
      const map = new Map(prev.map((x) => [x.id, x] as const));
      for (const m of moved) map.set(m.id, m);
      return Array.from(map.values());
    });
  };

  const cardStyle = {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
  } as const;

  const tableStyle = { borderCollapse: "collapse", width: "100%" } as const;
  const detailLineStyle = { fontSize: 12, color: "#334155", lineHeight: 1.4 } as const;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#666", fontSize: 12 }}>
            {countLabel}: {pending.length}
          </span>
          <button type="button" onClick={() => setShowConfirmed((v) => !v)} style={{ fontSize: 12 }}>
            {showConfirmed ? hideConfirmedLabel : showConfirmedLabel}
          </button>
          {pending.length > 0 ? (
            <button
              type="button"
              disabled={loadingAll}
              onClick={async () => {
                if (loadingAll) return;
                setLoadingAll(true);
                try {
                  await confirmIds(pendingIds);
                } catch (e: any) {
                  setError(String(e?.message ?? "Confirm failed"));
                } finally {
                  setLoadingAll(false);
                }
              }}
            >
              {loadingAll ? "..." : confirmAllLabel}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div style={{ marginTop: 8, color: "#b00", fontSize: 12 }}>{error}</div> : null}

      {pending.length === 0 ? (
        <div style={{ color: "#999", marginTop: 8 }}>{emptyLabel}</div>
      ) : (
        <table cellPadding={8} style={{ ...tableStyle, marginTop: 8 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{kind === "teacher" ? "Teacher" : "Student"}</th>
              <th align="left">Sessions</th>
              <th align="left">Detail</th>
              {kind === "teacher" ? <th align="left">Teacher Confirm</th> : null}
              <th align="left">Action</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((x) => (
              <tr key={x.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{x.name}</td>
                <td>{x.sessions.length}</td>
                <td>
                  {listWithLimit(x.sessions.map((s) => formatSessionBrief(s)), maxListItems)
                    .split("; ")
                    .map((line, idx) => (
                      <div key={`${x.id}-s-${idx}`} style={detailLineStyle}>
                        {line}
                      </div>
                    ))}
                </td>
                {kind === "teacher" ? (
                  <td style={{ color: x.teacherConfirmAt ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                    {x.teacherConfirmAt ? `Confirmed ${new Date(x.teacherConfirmAt).toLocaleTimeString()}` : "Not confirmed"}
                  </td>
                ) : null}
                <td>
                  <button
                    type="button"
                    disabled={Boolean(loadingIds[x.id])}
                    onClick={async () => {
                      setLoadingIds((m) => ({ ...m, [x.id]: true }));
                      try {
                        await confirmIds([x.id]);
                      } catch (e: any) {
                        setError(String(e?.message ?? "Confirm failed"));
                      } finally {
                        setLoadingIds((m) => ({ ...m, [x.id]: false }));
                      }
                    }}
                  >
                    {loadingIds[x.id] ? "..." : confirmLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showConfirmed && confirmed.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
            {confirmedLabel}: {confirmed.length}
          </div>
          <table cellPadding={8} style={tableStyle}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left">{kind === "teacher" ? "Teacher" : "Student"}</th>
                <th align="left">Sessions</th>
                <th align="left">Detail</th>
                {kind === "teacher" ? <th align="left">Teacher Confirm</th> : null}
                <th align="left">Status</th>
              </tr>
            </thead>
            <tbody>
              {confirmed.map((x) => (
                <tr key={`c-${x.id}`} style={{ borderTop: "1px solid #eee" }}>
                  <td>{x.name}</td>
                  <td>{x.sessions.length}</td>
                  <td>
                    {listWithLimit(x.sessions.map((s) => formatSessionBrief(s)), maxListItems)
                      .split("; ")
                      .map((line, idx) => (
                        <div key={`${x.id}-c-${idx}`} style={detailLineStyle}>
                          {line}
                        </div>
                      ))}
                  </td>
                  {kind === "teacher" ? (
                    <td style={{ color: x.teacherConfirmAt ? "#166534" : "#b91c1c", fontWeight: 700 }}>
                      {x.teacherConfirmAt ? `Confirmed ${new Date(x.teacherConfirmAt).toLocaleTimeString()}` : "Not confirmed"}
                    </td>
                  ) : null}
                  <td>{confirmedLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminTodosRemindersClient(props: {
  date: string;
  maxListItems: number;
  teacherPending: ReminderRow[];
  teacherConfirmed: ReminderRow[];
  studentPending: ReminderRow[];
  studentConfirmed: ReminderRow[];
  labels: {
    teacherTitle: string;
    studentTitle: string;
    count: string;
    showConfirmed: string;
    hideConfirmed: string;
    confirmAll: string;
    confirm: string;
    confirmed: string;
    emptyTeachers: string;
    emptyStudents: string;
  };
}) {
  const { date, maxListItems, teacherPending, teacherConfirmed, studentPending, studentConfirmed, labels } = props;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
      <ReminderCard
        kind="teacher"
        title={labels.teacherTitle}
        countLabel={labels.count}
        showConfirmedLabel={labels.showConfirmed}
        hideConfirmedLabel={labels.hideConfirmed}
        confirmAllLabel={labels.confirmAll}
        confirmLabel={labels.confirm}
        confirmedLabel={labels.confirmed}
        emptyLabel={labels.emptyTeachers}
        date={date}
        maxListItems={maxListItems}
        initialPending={teacherPending}
        initialConfirmed={teacherConfirmed}
      />
      <ReminderCard
        kind="student"
        title={labels.studentTitle}
        countLabel={labels.count}
        showConfirmedLabel={labels.showConfirmed}
        hideConfirmedLabel={labels.hideConfirmed}
        confirmAllLabel={labels.confirmAll}
        confirmLabel={labels.confirm}
        confirmedLabel={labels.confirmed}
        emptyLabel={labels.emptyStudents}
        date={date}
        maxListItems={maxListItems}
        initialPending={studentPending}
        initialConfirmed={studentConfirmed}
      />
    </div>
  );
}
