"use client";

import { useState } from "react";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";
import { buildParentFeedbackTemplate, getMissingParentFeedbackSections } from "@/lib/parent-feedback-format";

export default function TeacherFeedbackClient({
  sessionId,
  initial,
  labels,
  completionGuide,
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
    errorPrefix: string;
    savedOnTime: string;
    savedLate: string;
    deadlinePrefix: string;
    ruleHint: string;
    requiredPerformance: string;
    requiredHomework: string;
    missingParentSections: string;
    templateHint: string;
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
  completionGuide?: {
    title: string;
    detail: string;
    href: string;
    actionLabel: string;
  };
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saveResult, setSaveResult] = useState<null | { status: "ON_TIME" | "LATE"; dueAtText: string }>(null);

  const [focusStudentName, setFocusStudentName] = useState(initial.focusStudentName);
  const [actualStartAt, setActualStartAt] = useState(initial.actualStartAt);
  const [actualEndAt, setActualEndAt] = useState(initial.actualEndAt);
  const [classPerformance, setClassPerformance] = useState(initial.classPerformance || buildParentFeedbackTemplate());
  const [homework, setHomework] = useState(initial.homework);
  const [previousHomeworkDone, setPreviousHomeworkDone] = useState(initial.previousHomeworkDone);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErr("");
    setSaveResult(null);

    const missingSections = getMissingParentFeedbackSections(classPerformance);
    if (!classPerformance.trim() || missingSections.length > 0) {
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
      setSaveResult({
        status: data?.status === "LATE" ? "LATE" : "ON_TIME",
        dueAtText: String(data?.dueAtText ?? ""),
      });
    } catch (e: any) {
      setErr(String(e?.message ?? "Submit failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err ? <div style={{ color: "#b00", marginBottom: 10 }}>{labels.errorPrefix}: {err}</div> : null}
      {saveResult ? (
        <div
          style={{
            color: "#166534",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            display: "grid",
            gap: 6,
          }}
        >
          <div>{saveResult.status === "LATE" ? labels.savedLate : labels.savedOnTime}</div>
          <div style={{ fontSize: 13 }}>
            {labels.deadlinePrefix}: {saveResult.dueAtText || "-"}
          </div>
          <div style={{ fontSize: 13 }}>{labels.ruleHint}</div>
          {completionGuide ? (
            <>
              <div style={{ fontWeight: 700 }}>{completionGuide.title}</div>
              <div style={{ fontSize: 13 }}>{completionGuide.detail}</div>
              <a href={completionGuide.href}>{completionGuide.actionLabel}</a>
            </>
          ) : null}
        </div>
      ) : null}
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
            <DateTimeSplitInput
              value={actualStartAt}
              onChange={setActualStartAt}
              wrapperStyle={{ width: "100%" }}
              dateStyle={{ width: "100%" }}
            />
          </label>
          <label>
            {labels.actualEnd}
            <DateTimeSplitInput
              value={actualEndAt}
              onChange={setActualEndAt}
              wrapperStyle={{ width: "100%" }}
              dateStyle={{ width: "100%" }}
            />
          </label>
        </div>
        <label>
          {labels.classPerformance}
          <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: "4px 0 6px" }}>
            {labels.templateHint}
          </div>
          <textarea
            value={classPerformance}
            onChange={(e) => setClassPerformance(e.target.value)}
            rows={12}
            style={{ width: "100%" }}
            placeholder={labels.classPerformancePlaceholder}
          />
          {getMissingParentFeedbackSections(classPerformance).length > 0 ? (
            <div style={{ color: "#92400e", fontSize: 12, marginTop: 4 }}>
              {labels.missingParentSections}: {getMissingParentFeedbackSections(classPerformance).join("、")}
            </div>
          ) : null}
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
