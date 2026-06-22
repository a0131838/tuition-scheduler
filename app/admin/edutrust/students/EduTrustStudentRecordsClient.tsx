"use client";

import { useMemo, useState } from "react";

const STATUSES = [
  ["DRAFT", "Draft / 草稿"],
  ["IN_PROGRESS", "In progress / 进行中"],
  ["READY_FOR_REVIEW", "Ready for review / 可审核"],
  ["COMPLETED", "Completed / 已完成"],
  ["NEEDS_REVIEW", "Needs review / 待复核"],
] as const;

type StudentRecordDraft = {
  studentId: string;
  courseId: string;
  packageId: string;
  status: string;
  diagnosticAssessment: string;
  individualLearningPlan: string;
  progressReview: string;
  finalAssessment: string;
  completionRecord: string;
  attendanceEvidenceNote: string;
  contractEvidenceNote: string;
  outcomeSummary: string;
  externalOutcome: string;
  startedAt: string;
  completedAt: string;
};

type StudentRecordRow = {
  key: string;
  studentName: string;
  courseName: string;
  complianceName: string;
  packageLabel: string;
  totalHours: number | null;
  attendedHours: number;
  contractMode: string;
  contractStatus: string;
  courseReady: boolean;
  hourReady: boolean;
  record: StudentRecordDraft;
};

function inputStyle() {
  return {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "7px 9px",
    fontSize: 13,
    background: "#fff",
  };
}

function textareaStyle() {
  return {
    ...inputStyle(),
    minHeight: 74,
    lineHeight: 1.45,
    resize: "vertical" as const,
  };
}

const FIELDS: Array<{ key: keyof StudentRecordDraft; label: string; hint: string }> = [
  {
    key: "diagnosticAssessment",
    label: "Diagnostic assessment / 诊断评估",
    hint: "Entry level, placement reason, baseline score, learning needs.",
  },
  {
    key: "individualLearningPlan",
    label: "Individual learning plan / 个别学习计划",
    hint: "Target outcomes, lesson sequence, support plan, assessment checkpoints.",
  },
  {
    key: "progressReview",
    label: "Progress review / 进度复盘",
    hint: "Mid-course progress, attendance issues, teacher remarks, parent/student feedback.",
  },
  {
    key: "finalAssessment",
    label: "Final assessment / 最终评估",
    hint: "Final level, assessment score, completion criteria, moderation note.",
  },
  {
    key: "completionRecord",
    label: "Completion record / 完成记录",
    hint: "Completion decision, certificate/completion letter basis, outstanding follow-up.",
  },
  {
    key: "outcomeSummary",
    label: "Outcome summary / 成果摘要",
    hint: "Outcome achieved, progression, admission/test result, or improvement evidence.",
  },
];

export default function EduTrustStudentRecordsClient({ rows }: { rows: StudentRecordRow[] }) {
  const initialDrafts = useMemo(() => Object.fromEntries(rows.map((row) => [row.key, row.record])), [rows]);
  const [drafts, setDrafts] = useState<Record<string, StudentRecordDraft>>(initialDrafts);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [messageByKey, setMessageByKey] = useState<Record<string, string>>({});

  function patch(key: string, next: Partial<StudentRecordDraft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));
  }

  async function save(row: StudentRecordRow) {
    const draft = drafts[row.key];
    setBusyKey(row.key);
    setMessageByKey((prev) => ({ ...prev, [row.key]: "" }));
    try {
      const res = await fetch("/api/admin/edutrust/student-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Save failed");
      setMessageByKey((prev) => ({ ...prev, [row.key]: "Saved / 已保存" }));
      patch(row.key, { status: data.record.status });
    } catch (err) {
      setMessageByKey((prev) => ({ ...prev, [row.key]: err instanceof Error ? err.message : "Save failed" }));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row) => {
        const draft = drafts[row.key];
        return (
          <section key={row.key} style={{ border: "1px solid #dbe3ef", borderRadius: 12, background: "#fff", padding: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{row.studentName}</div>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 3 }}>{row.complianceName || row.courseName}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{row.packageLabel}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
                <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px" }}>
                  Hours {row.totalHours ?? "-"} / attended {row.attendedHours.toFixed(1)}
                </span>
                <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px" }}>
                  {row.contractMode} · {row.contractStatus}
                </span>
                <span style={{ border: `1px solid ${row.courseReady ? "#bbf7d0" : "#fed7aa"}`, color: row.courseReady ? "#166534" : "#9a3412", background: row.courseReady ? "#f0fdf4" : "#fff7ed", borderRadius: 999, padding: "4px 8px" }}>
                  {row.courseReady ? "Course ready" : "Course not ready"}
                </span>
                <span style={{ border: `1px solid ${row.hourReady ? "#bbf7d0" : "#fed7aa"}`, color: row.hourReady ? "#166534" : "#9a3412", background: row.hourReady ? "#f0fdf4" : "#fff7ed", borderRadius: 999, padding: "4px 8px" }}>
                  {row.hourReady ? ">= minimum hours" : "Low-hour risk"}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Status / 状态</span>
                <select value={draft.status} onChange={(event) => patch(row.key, { status: event.target.value })} style={inputStyle()}>
                  {STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Started / 开始日期</span>
                <input type="date" value={draft.startedAt} onChange={(event) => patch(row.key, { startedAt: event.target.value })} style={inputStyle()} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Completed / 完成日期</span>
                <input type="date" value={draft.completedAt} onChange={(event) => patch(row.key, { completedAt: event.target.value })} style={inputStyle()} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>External outcome / 外部成果</span>
                <input value={draft.externalOutcome} onChange={(event) => patch(row.key, { externalOutcome: event.target.value })} style={inputStyle()} />
              </label>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
              {FIELDS.map((field) => (
                <label key={field.key} style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                  <span>{field.label}</span>
                  <textarea
                    value={draft[field.key]}
                    onChange={(event) => patch(row.key, { [field.key]: event.target.value })}
                    placeholder={field.hint}
                    style={textareaStyle()}
                  />
                </label>
              ))}
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Attendance evidence note / 出勤证据备注</span>
                <textarea value={draft.attendanceEvidenceNote} onChange={(event) => patch(row.key, { attendanceEvidenceNote: event.target.value })} style={textareaStyle()} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Contract/FPS evidence note / 合同与 FPS 证据备注</span>
                <textarea value={draft.contractEvidenceNote} onChange={(event) => patch(row.key, { contractEvidenceNote: event.target.value })} style={textareaStyle()} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
              {messageByKey[row.key] ? <span style={{ fontSize: 12, color: messageByKey[row.key].includes("Saved") ? "#166534" : "#b91c1c" }}>{messageByKey[row.key]}</span> : null}
              <button
                type="button"
                disabled={busyKey === row.key}
                onClick={() => save(row)}
                style={{ border: "1px solid #2563eb", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}
              >
                {busyKey === row.key ? "Saving..." : "Save student record / 保存学生证据"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

