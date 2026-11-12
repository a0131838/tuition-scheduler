"use client";
import { NO_HOMEWORK_TEXT } from "@/lib/homework-status";

import { FEEDBACK_ATTACHMENT_MAX_BYTES, FEEDBACK_ATTACHMENT_MAX_COUNT } from "@/lib/homework-upload-keys";
import type { feedbackAttachmentDto } from "@/lib/feedback-attachments";
import { useState } from "react";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";
import {
  PARENT_FEEDBACK_SECTIONS,
  buildParentFeedbackText,
  getMissingParentFeedbackSectionLabels,
  parseParentFeedbackSections,
  type ParentFeedbackSectionKey,
} from "@/lib/parent-feedback-format";

type Attachment = ReturnType<typeof feedbackAttachmentDto>;
type SelectedFile = { file: File; key: string; audience: string; studentId: string; label: string; error?: string };

export default function TeacherFeedbackClient({
  sessionId,
  initial,
  labels,
  completionGuide,
  homeworkStudents,
  groupLesson,
  initialAttachments,
  initialPendingUploads,
  initialReviewStatus,
}: {
  sessionId: string;
  homeworkStudents: { id: string; name: string }[];
  groupLesson: boolean;
  initialAttachments: Attachment[];
  initialPendingUploads: number;
  initialReviewStatus: string;
  initial: {
    focusStudentName: string;
    actualStartAt: string;
    actualEndAt: string;
    classPerformance: string;
    homework: string;
    previousHomeworkDone: "" | "yes" | "no" | "not_assigned";
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
    preview: string;
    example: string;
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
  const [parentFeedbackSections, setParentFeedbackSections] = useState(() => parseParentFeedbackSections(initial.classPerformance));
  const [homework, setHomework] = useState(initial.homework);
  const [previousHomeworkDone, setPreviousHomeworkDone] = useState(initial.previousHomeworkDone);
  const parentFeedbackText = buildParentFeedbackText(parentFeedbackSections);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [pending, setPending] = useState<SelectedFile[]>([]);
  const [pendingCount, setPendingCount] = useState(initialPendingUploads);
  const [reviewStatus, setReviewStatus] = useState(initialReviewStatus);
  const [audience, setAudience] = useState(groupLesson ? "" : homeworkStudents[0]?.id || "internal");
  const feedbackUrl = `/api/teacher/sessions/${encodeURIComponent(sessionId)}/feedback`;

  function selectFiles(files: File[]) {
    setErr("");
    const remaining = FEEDBACK_ATTACHMENT_MAX_COUNT - attachments.length - pending.length;
    if (files.length > remaining) {
      setErr("每节课最多上传 9 个作业文件 / Maximum 9 files per lesson");
      return;
    }
    if (files.some(file => file.size === 0 || file.size > FEEDBACK_ATTACHMENT_MAX_BYTES)) {
      setErr("每个文件须大于 0 且不超过 15 MB / Each file must be between 1 byte and 15 MB");
      return;
    }
    const scope = audience === "internal" || audience === "class" ? audience : "student";
    const label = scope === "internal" ? "仅员工可见" : scope === "class" ? "本节班课家长" : homeworkStudents.find(student => student.id === audience)?.name || "";
    setPending(rows => rows.concat(files.map(file => ({
      file, key: crypto.randomUUID(), audience: scope, studentId: scope === "student" ? audience : "", label,
    }))));
  }

  async function removeAttachment(attachment: Attachment) {
    setSaving(true);
    setErr("");
    try {
      const response = await fetch(attachment.viewUrl, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "删除失败");
      setAttachments(rows => rows.filter(row => row.id !== attachment.id));
    } catch (error) {
      setErr(error instanceof Error ? error.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSelectedFiles(feedbackId: string) {
    let failures = 0;
    for (const row of pending) {
      try {
        const form = new FormData();
        form.set("file", row.file);
        form.set("feedbackId", feedbackId);
        form.set("uploadKey", row.key);
        form.set("audience", row.audience);
        form.set("studentId", row.studentId);
        const response = await fetch(feedbackUrl + "/attachments", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok || !data.attachment) throw new Error(data.message || "上传失败");
        const attachment = data.attachment as Attachment;
        setAttachments(rows => rows.some(file => file.id === attachment.id) ? rows : rows.concat(attachment));
        setPending(rows => rows.filter(file => file.key !== row.key));
        setPendingCount(count => Math.max(0, count - 1));
      } catch (error) {
        failures++;
        setPending(rows => rows.map(file => file.key === row.key
          ? { ...file, error: error instanceof Error ? error.message : "上传失败" } : file));
      }
    }
    return failures;
  }


  function updateParentFeedbackSection(key: ParentFeedbackSectionKey, value: string) {
    setParentFeedbackSections((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErr("");
    setSaveResult(null);

    const missingSections = getMissingParentFeedbackSectionLabels(parentFeedbackSections);
    if (missingSections.length > 0) {
      setErr(labels.requiredPerformance);
      return;
    }
    if (!homework.trim()) {
      setErr(labels.requiredHomework);
      return;
    }
    if (!previousHomeworkDone) {
      setErr("Previous homework completion is required / 请选择之前作业完成情况");
      return;
    }

    if (pendingCount > pending.length && !window.confirm("有未补传的文件。确认只提交本次已选的文件？")) return;

    setSaving(true);
    try {
      const res = await fetch(feedbackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          focusStudentName,
          actualStartAt,
          actualEndAt,
          parentFeedbackSections,
          classPerformance: parentFeedbackText,
          homework,
          previousHomeworkDone,
          homeworkUploadIds: pending.map(row => row.key),
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "Submit failed"));
      setReviewStatus("PENDING_REVIEW");
      setPendingCount(pending.length);
      const failures = await uploadSelectedFiles(data.feedbackId);
      if (failures) {
        setErr(`有 ${failures} 个文件待重试。可重新提交补传，已成功的文件会保留。`);
        return;
      }
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
        <section style={{ display: "grid", gap: 10 }}>
          {labels.classPerformance}
          <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: "4px 0 6px" }}>
            {labels.templateHint}
          </div>
          {PARENT_FEEDBACK_SECTIONS.map((section) => (
            <label
              key={section.key}
              style={{
                border: "1px solid #dbe4f0",
                borderRadius: 12,
                padding: 12,
                background: "#ffffff",
                display: "grid",
                gap: 6,
              }}
            >
              <span style={{ fontWeight: 800 }}>{section.en} / {section.zh}</span>
              <span style={{ color: "#475569", fontSize: 12, lineHeight: 1.5 }}>
                {section.promptEn} / {section.promptZh}
              </span>
              <details>
                <summary style={{ color: "#2563eb", cursor: "pointer", fontSize: 12 }}>{labels.example}</summary>
                <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>
                  {section.exampleEn} / {section.exampleZh}
                </div>
              </details>
              <textarea
                value={parentFeedbackSections[section.key]}
                onChange={(e) => updateParentFeedbackSection(section.key, e.target.value)}
                rows={3}
                style={{ width: "100%" }}
                placeholder={labels.classPerformancePlaceholder}
              />
            </label>
          ))}
          {getMissingParentFeedbackSectionLabels(parentFeedbackSections).length > 0 ? (
            <div style={{ color: "#92400e", fontSize: 12, marginTop: 4 }}>
              {labels.missingParentSections}: {getMissingParentFeedbackSectionLabels(parentFeedbackSections).join("、")}
            </div>
          ) : null}
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              padding: 12,
              background: "#eff6ff",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 800, color: "#1d4ed8" }}>{labels.preview}</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#0f172a", lineHeight: 1.5, fontSize: 13 }}>{parentFeedbackText}</div>
          </div>
        </section>
        <label>
          {labels.homework}
          <button type="button" onClick={() => setHomework(NO_HOMEWORK_TEXT)}>Not Set / 本节未布置作业</button>
          <textarea
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
            placeholder={labels.homeworkPlaceholder}
          />
        </label>
        <section aria-label="Homework files / 作业电子版" style={{ padding: 14, border: "1px solid #dbe4f0", borderRadius: 10, display: "grid", gap: 9 }}>
          <strong>作业电子版 / Homework files</strong>
          <small style={{ color: "#475569" }}>可上传照片或 PDF，最多 9 个，每个不超过 15 MB。随反馈审核后发布。</small>
          <label>发送范围 / Visible to{" "}
            <select value={audience} disabled={saving} onChange={event => setAudience(event.target.value)}>
              <option value="" disabled>请选择 / Select</option>
              {homeworkStudents.map(student => <option key={student.id} value={student.id}>{student.name}的家长</option>)}
              {groupLesson && homeworkStudents.length ? <option value="class">本节班课家长 / Whole class</option> : null}
              <option value="internal">仅员工 / Staff only</option>
            </select>
          </label>
          <label>添加照片或 PDF / Add files{" "}
            <input type="file" multiple disabled={saving || !audience} accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
              onChange={event => { selectFiles(Array.from(event.currentTarget.files || [])); event.currentTarget.value = ""; }} />
          </label>
          {pendingCount > pending.length ? <div role="status">还有文件待补传。请重新选取文件再提交，或直接提交本次已选的内容。</div> : null}
          {pending.map(row => <div key={row.key} style={{ overflowWrap: "anywhere" }}>
            {row.file.name} · {row.label} · {row.error ? `待重试：${row.error}` : "待上传"}{" "}
            <button type="button" disabled={saving} onClick={() => setPending(rows => rows.filter(file => file.key !== row.key))}>移除</button>
          </div>)}
          {attachments.map(row => <div key={row.id} style={{ overflowWrap: "anywhere" }}>
            <a href={row.viewUrl} target="_blank" rel="noreferrer">{row.name}</a> · 已上传 · {homeworkStudents.find(student => student.id === row.studentId)?.name || row.visibilityText}{" "}
            {reviewStatus !== "PUBLISHED" ? <button type="button" disabled={saving} onClick={() => removeAttachment(row)}>删除</button> : null}
          </div>)}
        </section>
        <label>
          {labels.previousHomeworkDone}
          <select value={previousHomeworkDone} onChange={(e) => setPreviousHomeworkDone(e.target.value as any)}>
            <option value="">{labels.notSet}</option>
            <option value="yes">{labels.yes}</option>
            <option value="no">{labels.no}</option>
            <option value="not_assigned">Not Set / 上次未布置或首次课</option>
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
