"use client";

import { useState } from "react";

const GRADE_OPTIONS = [
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "G13",
  "UG1",
  "UG2",
  "UG3",
  "UG4",
  "大一",
  "大二",
  "大三",
  "大四",
];

export default function PartnerStudentIntakePage() {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px" }}>
      <h2 style={{ marginBottom: 16 }}>新东方学生信息填写</h2>

      {err ? <div style={{ marginBottom: 12, color: "#b00020" }}>{err}</div> : null}
      {msg ? <div style={{ marginBottom: 12, color: "#166534" }}>{msg}</div> : null}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting) return;
          setErr("");
          setMsg("");
          setSubmitting(true);
          try {
            const formEl = e.currentTarget as HTMLFormElement;
            const fd = new FormData(formEl);
            const payload = {
              name: String(fd.get("name") ?? ""),
              school: String(fd.get("school") ?? ""),
              grade: String(fd.get("grade") ?? ""),
              birthDate: String(fd.get("birthDate") ?? ""),
              note: String(fd.get("note") ?? ""),
              targetSchool: String(fd.get("targetSchool") ?? ""),
              currentMajor: String(fd.get("currentMajor") ?? ""),
              coachingContent: String(fd.get("coachingContent") ?? ""),
            };

            const res = await fetch("/api/partner/student-intake", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
              setErr(String(data?.message ?? "提交失败，请稍后重试。"));
              return;
            }

            setMsg("提交成功，我们已收到学生信息。");
            formEl.reset();
          } catch (e2: any) {
            setErr(String(e2?.message ?? "提交失败，请稍后重试。"));
          } finally {
            setSubmitting(false);
          }
        }}
        style={{ display: "grid", gap: 10 }}
      >
        <input name="name" placeholder="姓名 *" required style={{ height: 36, padding: "0 10px" }} />
        <input name="school" placeholder="目前学校" style={{ height: 36, padding: "0 10px" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select name="grade" defaultValue="" style={{ minWidth: 160, height: 36, padding: "0 10px" }}>
            <option value="">年级</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input name="birthDate" type="date" style={{ height: 36, padding: "0 10px" }} />
        </div>
        <input name="targetSchool" placeholder="申请目标院校" style={{ height: 36, padding: "0 10px" }} />
        <input name="currentMajor" placeholder="目前专业" style={{ height: 36, padding: "0 10px" }} />
        <textarea name="coachingContent" rows={3} placeholder="辅导内容" style={{ padding: 10 }} />
        <textarea name="note" rows={3} placeholder="备注（可选）" style={{ padding: 10 }} />

        <button type="submit" disabled={submitting} style={{ height: 38 }}>
          {submitting ? "提交中..." : "提交"}
        </button>
      </form>
    </div>
  );
}
