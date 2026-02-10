"use client";

import { useState } from "react";

export default function TeacherFeedbackClient({
  sessionId,
  initial,
  labels,
}: {
  sessionId: string;
  initial: {
    focusStudentName: string;
    actualStartAt: string;
    actualEndAt: string;
    classPerformance: string;
    homework: string;
    previousHomeworkDone: "" | "yes" | "no";
  };
  labels: {
    submit: string;
    saved: string;
    errorPrefix: string;
    requiredPerformance: string;
    requiredHomework: string;
    focusStudent: string;
    focusStudentPlaceholder: string;
    actualStart: string;
    actualEnd: string;
    classPerformance: string;
    classPerformancePlaceholder: string;
    homework: string;
    homeworkPlaceholder: string;
    previousHomeworkDone: string;
    notSet: string;
    yes: string;
    no: string;
  };
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [focusStudentName, setFocusStudentName] = useState(initial.focusStudentName);
  const [actualStartAt, setActualStartAt] = useState(initial.actualStartAt);
  const [actualEndAt, setActualEndAt] = useState(initial.actualEndAt);
  const [classPerformance, setClassPerformance] = useState(initial.classPerformance);
  const [homework, setHomework] = useState(initial.homework);
  const [previousHomeworkDone, setPreviousHomeworkDone] = useState(initial.previousHomeworkDone);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setMsg("");
    setErr("");

    if (!classPerformance.trim()) {
      setErr(labels.requiredPerformance);
      return;
    }
    if (!homework.trim()) {
      setErr(labels.requiredHomework);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/sessions/${encodeURIComponent(sessionId)}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          focusStudentName,
          actualStartAt,
          actualEndAt,
          classPerformance,
          homework,
          previousHomeworkDone,
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Submit failed"));
      setMsg(labels.saved);
    } catch (e: any) {
      setErr(String(e?.message ?? "Submit failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err ? <div style={{ color: "#b00", marginBottom: 10 }}>{labels.errorPrefix}: {err}</div> : null}
      {msg ? <div style={{ color: "#087", marginBottom: 10 }}>{msg}</div> : null}
      <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
        <label>
          {labels.focusStudent}
          <input
            value={focusStudentName}
            onChange={(e) => setFocusStudentName(e.target.value)}
            style={{ width: "100%" }}
            placeholder={labels.focusStudentPlaceholder}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            {labels.actualStart}
            <input
              type="datetime-local"
              value={actualStartAt}
              onChange={(e) => setActualStartAt(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            {labels.actualEnd}
            <input
              type="datetime-local"
              value={actualEndAt}
              onChange={(e) => setActualEndAt(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>
        <label>
          {labels.classPerformance}
          <textarea
            value={classPerformance}
            onChange={(e) => setClassPerformance(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
            placeholder={labels.classPerformancePlaceholder}
          />
        </label>
        <label>
          {labels.homework}
          <textarea
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
            placeholder={labels.homeworkPlaceholder}
          />
        </label>
        <label>
          {labels.previousHomeworkDone}
          <select value={previousHomeworkDone} onChange={(e) => setPreviousHomeworkDone(e.target.value as any)}>
            <option value="">{labels.notSet}</option>
            <option value="yes">{labels.yes}</option>
            <option value="no">{labels.no}</option>
          </select>
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <button type="submit" disabled={saving}>
          {saving ? "..." : labels.submit}
        </button>
      </div>
    </form>
  );
}
