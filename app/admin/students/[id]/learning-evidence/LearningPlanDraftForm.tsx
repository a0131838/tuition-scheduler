"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  studentId: string;
  from: string;
  to: string;
  courseId: string;
};

const inputStyle = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 10px", font: "inherit" } as const;

export default function LearningPlanDraftForm({ studentId, from, to, courseId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/students/${encodeURIComponent(studentId)}/learning-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        goals: form.get("goals"),
        teacherActions: form.get("teacherActions"),
        studentActions: form.get("studentActions"),
        parentActions: form.get("parentActions"),
        reviewDueAt: form.get("reviewDueAt"),
        from,
        to,
        courseId,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok || !payload?.ok) {
      setMessage(payload?.message || "Could not save the plan draft. Please try again.");
      return;
    }
    event.currentTarget.reset();
    setMessage("Plan draft saved. Review and approve it before sharing outside the academic team.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 5, fontWeight: 700 }}>
        Plan title / 计划标题
        <input name="title" required maxLength={160} placeholder="e.g. September writing structure plan" style={inputStyle} />
      </label>
      <label style={{ display: "grid", gap: 5, fontWeight: 700 }}>
        Learning goals / 学习目标
        <textarea name="goals" required maxLength={6000} rows={5} placeholder="Write 2–3 measurable goals, each linked to the selected feedback evidence." style={inputStyle} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <label style={{ display: "grid", gap: 5, fontWeight: 700 }}>
          Teacher actions / 老师动作
          <textarea name="teacherActions" maxLength={4000} rows={4} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 5, fontWeight: 700 }}>
          Student actions / 学生动作
          <textarea name="studentActions" maxLength={4000} rows={4} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 5, fontWeight: 700 }}>
          Parent actions / 家长动作
          <textarea name="parentActions" maxLength={4000} rows={4} style={inputStyle} />
        </label>
      </div>
      <label style={{ display: "grid", gap: 5, fontWeight: 700, maxWidth: 280 }}>
        Review date / 复核日期
        <input name="reviewDueAt" type="date" style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" disabled={saving} style={{ border: 0, borderRadius: 9, padding: "10px 14px", background: "#0f766e", color: "#fff", fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>
          {saving ? "Saving…" : "Save internal plan draft / 保存内部计划草稿"}
        </button>
        <span style={{ color: message.includes("saved") ? "#166534" : "#b45309", fontSize: 13 }}>{message}</span>
      </div>
    </form>
  );
}
