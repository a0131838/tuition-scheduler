"use client";

import {
  getTicketFieldLabel,
  SCHEDULING_COORDINATION_TICKET_TYPE,
  TICKET_HIGH_FREQUENCY_TYPES,
  getTicketTypeTemplate,
  parseTicketSituationSummary,
  TICKET_CS_STATUS_OPTIONS,
  TICKET_MODE_OPTIONS,
  TICKET_OWNER_OPTIONS,
  TICKET_PRIORITY_OPTIONS,
  TICKET_SOURCE_OPTIONS,
  TICKET_SYSTEM_UPDATED_OPTIONS,
  TICKET_TYPE_OPTIONS,
  TICKET_VERSION_OPTIONS,
} from "@/lib/tickets";
import { useEffect, useMemo, useState } from "react";
import DateTimeSplitInput from "@/app/_components/DateTimeSplitInput";
import { formatBusinessDateTime } from "@/lib/date-only";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 700,
  fontSize: 13,
};

function OptionList({
  options,
  placeholder,
}: {
  options: { value: string; zh: string; en: string }[];
  placeholder: string;
}) {
  return (
    <>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.zh} / {opt.en}
        </option>
      ))}
    </>
  );
}

export default function IntakeForm({
  apiPath,
  uploadPath,
  studentLookupPath,
  teacherLookupPath,
  createdByNameDefault,
  lockCreatedByName,
}: {
  apiPath: string;
  uploadPath: string;
  studentLookupPath: string;
  teacherLookupPath: string;
  createdByNameDefault?: string;
  lockCreatedByName?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [dupes, setDupes] = useState<Array<{ ticketNo: string; status: string; createdAt: string; summary: string }>>([]);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherIdValue, setTeacherIdValue] = useState("");
  const [gradeValue, setGradeValue] = useState("");
  const [courseValue, setCourseValue] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState<{
    grade: boolean;
    teacher: boolean;
    course: boolean;
  }>({ grade: false, teacher: false, course: false });
  const [selectedType, setSelectedType] = useState("");
  const [situationCurrent, setSituationCurrent] = useState("");
  const [situationAction, setSituationAction] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [submittedParentAvailability, setSubmittedParentAvailability] = useState<{
    ticketId: string;
    ticketNo: string;
    url: string;
    expiresAt: string | null;
    reusedExisting: boolean;
  } | null>(null);
  const [studentLookupState, setStudentLookupState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [studentLookupResult, setStudentLookupResult] = useState<{
    matchType: string;
    candidates: Array<{ studentId: string; name: string; grade: string | null; teachers: string[]; courses: string[] }>;
  }>({ matchType: "empty", candidates: [] });
  const [selectedStudentCandidate, setSelectedStudentCandidate] = useState<{
    studentId: string;
    name: string;
    grade: string | null;
    teachers: string[];
    courses: string[];
  } | null>(null);
  const [teacherLookupState, setTeacherLookupState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [teacherLookupResult, setTeacherLookupResult] = useState<{
    matchType: string;
    candidates: Array<{ teacherId: string; name: string; courses: string[] }>;
  }>({ matchType: "empty", candidates: [] });
  const [selectedTeacherCandidate, setSelectedTeacherCandidate] = useState<{
    teacherId: string;
    name: string;
    courses: string[];
  } | null>(null);
  const selectedTemplate = useMemo(() => getTicketTypeTemplate(selectedType), [selectedType]);
  const fieldRequired = (field: "grade" | "course" | "teacher" | "durationMin" | "mode" | "wechat") =>
    selectedTemplate.requiredFields.includes(field);
  const fieldSuggested = (field: "grade" | "course" | "teacher" | "durationMin" | "mode" | "wechat") =>
    selectedTemplate.suggestedFields.includes(field);
  const proofFiles = useMemo(
    () =>
      proofUrls.map((url, index) => {
        const rawName = url.split("/").pop() ?? `file-${index + 1}`;
        return { url, label: `File ${index + 1}`, name: decodeURIComponent(rawName) };
      }),
    [proofUrls]
  );
  const applySituationDraft = (type: string, force = false) => {
    const template = getTicketTypeTemplate(type);
    setSelectedType(type);
    setSituationCurrent((prev) => (force || !prev.trim() ? template.draftCurrentIssue : prev));
    setSituationAction((prev) => (force || !prev.trim() ? template.draftRequiredAction : prev));
  };

  useEffect(() => {
    const query = studentName.trim();
    if (query.length < 2) {
      setStudentLookupState("idle");
      setStudentLookupResult({ matchType: "empty", candidates: [] });
      return;
    }
    const timer = window.setTimeout(async () => {
      setStudentLookupState("loading");
      try {
        const res = await fetch(`${studentLookupPath}?name=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setStudentLookupState("error");
          return;
        }
        setStudentLookupResult({
          matchType: String(data.matchType ?? "none"),
          candidates: Array.isArray(data.candidates) ? data.candidates : [],
        });
        setStudentLookupState("done");
      } catch {
        setStudentLookupState("error");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [studentLookupPath, studentName]);

  useEffect(() => {
    const query = teacherName.trim();
    if (query.length < 2) {
      setTeacherLookupState("idle");
      setTeacherLookupResult({ matchType: "empty", candidates: [] });
      return;
    }
    const timer = window.setTimeout(async () => {
      setTeacherLookupState("loading");
      try {
        const res = await fetch(`${teacherLookupPath}?name=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setTeacherLookupState("error");
          return;
        }
        setTeacherLookupResult({
          matchType: String(data.matchType ?? "none"),
          candidates: Array.isArray(data.candidates) ? data.candidates : [],
        });
        setTeacherLookupState("done");
      } catch {
        setTeacherLookupState("error");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [teacherLookupPath, teacherName]);

  useEffect(() => {
    if (selectedStudentCandidate && studentName.trim() !== selectedStudentCandidate.name) {
      setSelectedStudentCandidate(null);
    }
  }, [studentName, selectedStudentCandidate]);

  useEffect(() => {
    if (selectedTeacherCandidate && teacherName.trim() !== selectedTeacherCandidate.name) {
      setSelectedTeacherCandidate(null);
      setTeacherIdValue("");
    }
  }, [teacherName, selectedTeacherCandidate]);

  useEffect(() => {
    if (!selectedStudentCandidate) return;
    if (!gradeValue.trim() && selectedStudentCandidate.grade) {
      setGradeValue(selectedStudentCandidate.grade);
      setAutoFilledFields((prev) => ({ ...prev, grade: true }));
    }
    if (!teacherName.trim() && selectedStudentCandidate.teachers[0]) {
      setTeacherName(selectedStudentCandidate.teachers[0]);
      setAutoFilledFields((prev) => ({ ...prev, teacher: true }));
    }
    if (!courseValue.trim() && selectedStudentCandidate.courses[0]) {
      setCourseValue(selectedStudentCandidate.courses[0]);
      setAutoFilledFields((prev) => ({ ...prev, course: true }));
    }
  }, [selectedStudentCandidate, gradeValue, teacherName, courseValue]);

  const exactCandidate =
    studentLookupResult.matchType === "exact" && studentLookupResult.candidates.length === 1
      ? studentLookupResult.candidates[0]
      : null;
  const exactTeacherCandidate =
    teacherLookupResult.matchType === "exact" && teacherLookupResult.candidates.length === 1
      ? teacherLookupResult.candidates[0]
      : null;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 12px 24px" }}>
      <h2 style={{ margin: "8px 0 4px" }}>工单录入 / Ticket Intake</h2>
      <div style={{ color: "#475569", marginBottom: 12 }}>
        客服快速录入（免登录）/ Quick no-login intake for customer service
      </div>
      {createdByNameDefault ? (
        <div style={{ color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, marginBottom: 10 }}>
          当前链接默认录入人 / Intake agent: <b>{createdByNameDefault}</b>
          {lockCreatedByName ? "，此字段已锁定并会同步到个人工单看板。" : ""}
        </div>
      ) : null}
      {msg ? <div style={{ color: "#166534", marginBottom: 10 }}>{msg}</div> : null}
      {err ? <div style={{ color: "#b91c1c", marginBottom: 10 }}>{err}</div> : null}
      {submittedParentAvailability ? (
        <div
          style={{
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800, color: "#166534" }}>
            {submittedParentAvailability.reusedExisting
              ? "当前排课协调工单已沿用 / Current coordination ticket reused"
              : "家长时间填写链接已生成 / Parent availability link ready"}
          </div>
          <div style={{ fontSize: 13, color: "#166534" }}>
            {submittedParentAvailability.reusedExisting
              ? `工单 ${submittedParentAvailability.ticketNo} 已沿用。现在可以继续把下面这个当前有效链接发给家长，让家长填写可上课时间。`
              : `工单 ${submittedParentAvailability.ticketNo} 已创建。现在可以直接把下面这个临时链接发给家长，让家长填写可上课时间。`}
          </div>
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div style={{ border: "1px solid #86efac", borderRadius: 8, background: "#fff", padding: 10 }}>
              <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>Step 1 / 第一步</div>
              <div style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>
                复制链接并发给家长。/ Copy this link and send it to the parent.
              </div>
            </div>
            <div style={{ border: "1px solid #86efac", borderRadius: 8, background: "#fff", padding: 10 }}>
              <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>Step 2 / 第二步</div>
              <div style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>
                家长填完后，系统会自动回写到这张排课协调工单。/ Once submitted, the result flows back into this scheduling ticket automatically.
              </div>
            </div>
            <div style={{ border: "1px solid #86efac", borderRadius: 8, background: "#fff", padding: 10 }}>
              <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>Step 3 / 第三步</div>
              <div style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>
                教务再根据老师 availability 继续排课。/ Ops can continue scheduling from teacher availability afterwards.
              </div>
            </div>
          </div>
          <div
            style={{
              border: "1px solid #86efac",
              borderRadius: 8,
              padding: "10px 12px",
              background: "#fff",
              fontFamily: "monospace",
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            {submittedParentAvailability.url}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(submittedParentAvailability.url);
                  setMsg(`已复制家长链接 / Copied parent link: ${submittedParentAvailability.ticketNo}`);
                } catch {
                  setErr("复制失败，请手动复制链接 / Copy failed, please copy manually");
                }
              }}
            >
              复制链接 / Copy Link
            </button>
            <button
              type="button"
              onClick={async () => {
                const shareText = [
                  "您好，这里是课程时间收集表，请填写您方便上课的时间。",
                  "This form collects your available lesson times.",
                  submittedParentAvailability.url,
                ].join("\n");
                try {
                  await navigator.clipboard.writeText(shareText);
                  setMsg(`已复制发送文案 / Copied parent message: ${submittedParentAvailability.ticketNo}`);
                } catch {
                  setErr("复制发送文案失败，请手动复制 / Copy message failed, please copy manually");
                }
              }}
            >
              复制发送文案 / Copy Message
            </button>
            <a
              href={submittedParentAvailability.url}
              target="_blank"
              rel="noreferrer"
              style={{ alignSelf: "center" }}
            >
              打开家长页 / Open Parent Form
            </a>
          </div>
          <div style={{ fontSize: 12, color: "#166534", display: "grid", gap: 4 }}>
            {submittedParentAvailability.expiresAt
              ? `有效期至 / Expires at: ${formatBusinessDateTime(new Date(submittedParentAvailability.expiresAt))}`
              : "默认短期有效 / Temporary link"}
            <span>请提醒家长：这是时间收集表，不代表已经排课成功。/ Please remind the parent that this is only a time-preference form, not a confirmed schedule.</span>
          </div>
        </div>
      ) : null}
      <details style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: "8px 10px", marginBottom: 10 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>快速流程 / Quick SOP</summary>
        <ol style={{ margin: "8px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
          <li>先录入工单，再在群里同步。/ Create ticket first, then notify in chat.</li>
          <li>每单都要有状态与下一步截止时间。/ Every ticket needs status and next deadline.</li>
          <li>负责人按角色写清楚（CS/Ops/Mgmt）。/ Set owner role clearly (CS/Ops/Mgmt).</li>
          <li>有证据就上传文件或图片，不放在口头。/ Upload proof files/images instead of verbal-only notes.</li>
          <li>完成定义：家长已通知 + 系统已更新。/ Done means parent informed + system updated.</li>
        </ol>
      </details>

      {dupes.length > 0 ? (
        <div style={{ marginBottom: 10, border: "1px solid #f59e0b", background: "#fffbeb", padding: 10, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>可能重复工单 / Potential Duplicates</div>
          {dupes.map((d) => (
            <div key={d.ticketNo} style={{ fontSize: 12, color: "#92400e" }}>
              {d.ticketNo} | {d.status} | {formatBusinessDateTime(new Date(d.createdAt))} | {parseTicketSituationSummary(d.summary).currentIssue || d.summary || "-"}
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12 }}>
            勾选后可继续提交 / Check to continue anyway
          </div>
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <input type="checkbox" checked={forceDuplicate} onChange={(e) => setForceDuplicate(e.target.checked)} />
            确认继续提交 / Force Submit
          </label>
        </div>
      ) : null}

      <form
        style={{ display: "grid", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting) return;
          if (selectedType === SCHEDULING_COORDINATION_TICKET_TYPE && !selectedStudentCandidate) {
            setErr("排课协调工单需要先从学生匹配结果里确认学生 / Scheduling coordination needs a confirmed student match first");
            return;
          }
          const form = e.currentTarget;
          const fd = new FormData(form);
          setSubmitting(true);
          setMsg("");
          setErr("");
          setSubmittedParentAvailability(null);
          const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
          payload.studentId = selectedStudentCandidate?.studentId ?? "";
          payload.proof = proofUrls.join("\n");
          if (forceDuplicate) payload.forceDuplicate = "1";
          try {
            const res = await fetch(apiPath, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
              if (data?.code === "DUPLICATE" && Array.isArray(data?.duplicates)) {
                setDupes(data.duplicates);
                setErr("检测到重复工单，请确认后再提交 / Potential duplicates detected");
                return;
              }
              setErr(String(data?.message ?? "提交失败 / Submit failed"));
              return;
            }
            setMsg(
              data?.reusedExisting
                ? `已沿用当前排课协调工单 / Reused current coordination ticket: ${data.ticketNo}`
                : `提交成功 / Submitted: ${data.ticketNo}`
            );
            setSubmittedParentAvailability(
              data?.parentAvailabilityUrl
                ? {
                    ticketId: String(data.id),
                    ticketNo: String(data.ticketNo),
                    url: String(data.parentAvailabilityUrl),
                    expiresAt: data.parentAvailabilityExpiresAt ? String(data.parentAvailabilityExpiresAt) : null,
                    reusedExisting: Boolean(data.reusedExisting),
                  }
                : null
            );
            setDupes([]);
            setForceDuplicate(false);
            setStudentName("");
            setTeacherName("");
            setTeacherIdValue("");
            setGradeValue("");
            setCourseValue("");
            setAutoFilledFields({ grade: false, teacher: false, course: false });
            setSelectedType("");
            setSituationCurrent("");
            setSituationAction("");
            setProofUrls([]);
            setSelectedStudentCandidate(null);
            setSelectedTeacherCandidate(null);
            setStudentLookupState("idle");
            setStudentLookupResult({ matchType: "empty", candidates: [] });
            setTeacherLookupState("idle");
            setTeacherLookupResult({ matchType: "empty", candidates: [] });
            form.reset();
          } catch (e2: any) {
            setErr(String(e2?.message ?? "提交失败 / Submit failed"));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>高频模板快捷入口 / Quick Ticket Templates</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TICKET_HIGH_FREQUENCY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => applySituationDraft(type, true)}
                style={{
                  border: selectedType === type ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: selectedType === type ? "#dbeafe" : "#fff",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
            点击后会自动切换工单类型，并套用 Situation 草稿。/ Click to set type and apply a draft.
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <label style={labelStyle}>
            学生姓名* / Student*
            <input type="hidden" name="studentId" value={selectedStudentCandidate?.studentId ?? ""} />
            <input
              name="studentName"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={fieldStyle}
            />
            {studentLookupState === "loading" ? (
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>正在校验学生姓名... / Checking student name...</div>
            ) : null}
            {studentLookupState === "error" ? (
              <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>学生校验失败，请稍后重试 / Student check failed</div>
            ) : null}
            {studentLookupState === "done" && exactCandidate ? (
              <button
                type="button"
                onClick={() => {
                  setStudentName(exactCandidate.name);
                  setSelectedStudentCandidate(exactCandidate);
                }}
                style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8, padding: 8, fontSize: 12, color: "#166534", textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 700 }}>已匹配学生 / Student found</div>
                <div>{exactCandidate.name}{exactCandidate.grade ? ` | ${exactCandidate.grade}` : ""}</div>
                <div>最近老师 / Recent teacher: {exactCandidate.teachers.length > 0 ? exactCandidate.teachers.join("、") : "暂无 / None"}</div>
                <div style={{ marginTop: 4, fontWeight: 500 }}>点击确认使用该学生 / Click to confirm</div>
              </button>
            ) : null}
            {studentLookupState === "done" && studentLookupResult.matchType === "multiple-exact" ? (
              <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 8, padding: 8, fontSize: 12, color: "#92400e" }}>
                <div style={{ fontWeight: 700 }}>找到多个同名学生，请确认 / Multiple exact matches</div>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {studentLookupResult.candidates.map((candidate) => (
                    <button
                      key={candidate.studentId}
                      type="button"
                      onClick={() => {
                        setStudentName(candidate.name);
                        setSelectedStudentCandidate(candidate);
                      }}
                      style={{ border: "1px solid #fcd34d", background: "#fff", borderRadius: 6, padding: "6px 8px", textAlign: "left", cursor: "pointer", color: "#92400e" }}
                    >
                      {candidate.name}{candidate.grade ? ` | ${candidate.grade}` : ""} | 最近老师：{candidate.teachers.length > 0 ? candidate.teachers.join("、") : "暂无"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {studentLookupState === "done" && studentLookupResult.matchType === "fuzzy" ? (
              <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, padding: 8, fontSize: 12, color: "#1d4ed8" }}>
                <div style={{ fontWeight: 700 }}>未找到完全匹配，以下是候选学生 / Closest student matches</div>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {studentLookupResult.candidates.map((candidate) => (
                    <button
                      key={candidate.studentId}
                      type="button"
                      onClick={() => {
                        setStudentName(candidate.name);
                        setSelectedStudentCandidate(candidate);
                      }}
                      style={{ border: "1px solid #bfdbfe", background: "#fff", borderRadius: 6, padding: "6px 8px", textAlign: "left", cursor: "pointer", color: "#1d4ed8" }}
                    >
                      {candidate.name}{candidate.grade ? ` | ${candidate.grade}` : ""} | 最近老师：{candidate.teachers.length > 0 ? candidate.teachers.join("、") : "暂无"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {studentLookupState === "done" && studentLookupResult.matchType === "none" ? (
              <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>
                数据库中未找到该学生，请确认姓名是否填写正确 / Student not found in database
              </div>
            ) : null}
            {selectedStudentCandidate ? (
              <div style={{ border: "1px solid #bbf7d0", background: "#f8fff8", borderRadius: 8, padding: 8, fontSize: 12, color: "#166534" }}>
                <div style={{ fontWeight: 700 }}>已确认学生 / Confirmed student</div>
                <div>{selectedStudentCandidate.name}{selectedStudentCandidate.grade ? ` | ${selectedStudentCandidate.grade}` : ""}</div>
                <div>最近老师 / Recent teacher: {selectedStudentCandidate.teachers.length > 0 ? selectedStudentCandidate.teachers.join("、") : "暂无 / None"}</div>
                <div>最近课程 / Recent course: {selectedStudentCandidate.courses.length > 0 ? selectedStudentCandidate.courses.join("、") : "暂无 / None"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {selectedStudentCandidate.grade ? (
                    <button
                      type="button"
                      onClick={() => setGradeValue(selectedStudentCandidate.grade ?? "")}
                      style={{ border: "1px solid #bbf7d0", background: "#fff", borderRadius: 999, padding: "4px 8px", fontSize: 12, cursor: "pointer", color: "#166534" }}
                    >
                      采用年级：{selectedStudentCandidate.grade}
                    </button>
                  ) : null}
                  {selectedStudentCandidate.teachers[0] ? (
                    <button
                      type="button"
                      onClick={() => setTeacherName(selectedStudentCandidate.teachers[0] ?? "")}
                      style={{ border: "1px solid #bbf7d0", background: "#fff", borderRadius: 999, padding: "4px 8px", fontSize: 12, cursor: "pointer", color: "#166534" }}
                    >
                      采用最近老师：{selectedStudentCandidate.teachers[0]}
                    </button>
                  ) : null}
                  {selectedStudentCandidate.courses[0] ? (
                    <button
                      type="button"
                      onClick={() => setCourseValue(selectedStudentCandidate.courses[0] ?? "")}
                      style={{ border: "1px solid #bbf7d0", background: "#fff", borderRadius: 999, padding: "4px 8px", fontSize: 12, cursor: "pointer", color: "#166534" }}
                    >
                      采用最近课程：{selectedStudentCandidate.courses[0]}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </label>
          <label style={labelStyle}>
            来源* / Source*
            <select name="source" required style={fieldStyle}>
              <OptionList options={TICKET_SOURCE_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            工单类型* / Type*
            <select
              name="type"
              required
              style={fieldStyle}
              value={selectedType}
              onChange={(e) => {
                const nextType = e.target.value;
                setSelectedType(nextType);
                if (nextType && !situationCurrent.trim() && !situationAction.trim()) {
                  applySituationDraft(nextType, false);
                }
              }}
            >
              <OptionList options={TICKET_TYPE_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          {selectedType ? (
            <div style={{ gridColumn: "1 / -1", border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedTemplate.title}</div>
              <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
                必填字段：{selectedTemplate.requiredFields.length > 0 ? selectedTemplate.requiredFields.map(getTicketFieldLabel).join("、") : "无额外必填"}
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                录入提示：{selectedTemplate.checklist.join("；")}
              </div>
            </div>
          ) : null}
          <label style={labelStyle}>
            优先级* / Priority*
            <select name="priority" required style={fieldStyle}>
              <OptionList options={TICKET_PRIORITY_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            状态* / Status*
            <select name="status" required defaultValue="Need Info" style={fieldStyle}>
              <OptionList options={TICKET_CS_STATUS_OPTIONS} placeholder="默认待补信息 / Default Need Info" />
            </select>
          </label>
          <label style={labelStyle}>
            负责人* / Owner*
            <select name="owner" required style={fieldStyle} defaultValue="">
              <OptionList options={TICKET_OWNER_OPTIONS} placeholder="请选择 / Select" />
            </select>
          </label>
          <label style={labelStyle}>
            年级{fieldRequired("grade") ? "*" : ""} / Grade{fieldRequired("grade") ? "*" : ""}
            <input
              name="grade"
              required={fieldRequired("grade")}
              value={gradeValue}
              onChange={(e) => {
                setGradeValue(e.target.value);
                setAutoFilledFields((prev) => ({ ...prev, grade: false }));
              }}
              placeholder={fieldSuggested("grade") || fieldRequired("grade") ? "如：P3 / G6" : ""}
              style={{
                ...fieldStyle,
                borderColor: autoFilledFields.grade ? "#93c5fd" : fieldStyle.border?.toString(),
                background: autoFilledFields.grade ? "#f8fbff" : "#fff",
              }}
            />
            {autoFilledFields.grade ? (
              <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 500 }}>系统建议值 / Suggested from student match</div>
            ) : null}
          </label>
          <label style={labelStyle}>
            课程{fieldRequired("course") ? "*" : ""} / Course{fieldRequired("course") ? "*" : ""}
            <input
              name="course"
              required={fieldRequired("course")}
              value={courseValue}
              onChange={(e) => {
                setCourseValue(e.target.value);
                setAutoFilledFields((prev) => ({ ...prev, course: false }));
              }}
              placeholder={fieldSuggested("course") || fieldRequired("course") ? "如：英语口语 / Math" : ""}
              style={{
                ...fieldStyle,
                borderColor: autoFilledFields.course ? "#93c5fd" : fieldStyle.border?.toString(),
                background: autoFilledFields.course ? "#f8fbff" : "#fff",
              }}
            />
            {autoFilledFields.course ? (
              <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 500 }}>系统建议值 / Suggested from student match</div>
            ) : null}
          </label>
          <label style={labelStyle}>
            老师{fieldRequired("teacher") ? "*" : ""} / Teacher{fieldRequired("teacher") ? "*" : ""}
            <input type="hidden" name="teacherId" value={teacherIdValue} />
            <input
              name="teacher"
              required={fieldRequired("teacher")}
              value={teacherName}
              onChange={(e) => {
                setTeacherName(e.target.value);
                setTeacherIdValue("");
                setSelectedTeacherCandidate(null);
                setAutoFilledFields((prev) => ({ ...prev, teacher: false }));
              }}
              placeholder={fieldSuggested("teacher") || fieldRequired("teacher") ? "填写当前老师、目标老师或主要老师" : ""}
              style={{
                ...fieldStyle,
                borderColor: autoFilledFields.teacher ? "#93c5fd" : fieldStyle.border?.toString(),
                background: autoFilledFields.teacher ? "#f8fbff" : "#fff",
              }}
            />
            {autoFilledFields.teacher ? (
              <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 500 }}>系统建议值 / Suggested from student match</div>
            ) : null}
            {teacherLookupState === "loading" ? (
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>正在校验老师姓名... / Checking teacher name...</div>
            ) : null}
            {teacherLookupState === "error" ? (
              <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>老师校验失败，请稍后重试 / Teacher check failed</div>
            ) : null}
            {teacherLookupState === "done" && exactTeacherCandidate ? (
              <button
                type="button"
                onClick={() => {
                  setTeacherName(exactTeacherCandidate.name);
                  setSelectedTeacherCandidate(exactTeacherCandidate);
                  setTeacherIdValue(exactTeacherCandidate.teacherId);
                }}
                style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8, padding: 8, fontSize: 12, color: "#166534", textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 700 }}>已匹配老师 / Teacher found</div>
                <div>{exactTeacherCandidate.name}</div>
                <div>相关课程 / Courses: {exactTeacherCandidate.courses.length > 0 ? exactTeacherCandidate.courses.join("、") : "暂无 / None"}</div>
                <div style={{ marginTop: 4, fontWeight: 500 }}>点击确认使用该老师 / Click to confirm</div>
              </button>
            ) : null}
            {teacherLookupState === "done" && teacherLookupResult.matchType === "multiple-exact" ? (
              <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 8, padding: 8, fontSize: 12, color: "#92400e" }}>
                <div style={{ fontWeight: 700 }}>找到多个同名老师，请确认 / Multiple exact teacher matches</div>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {teacherLookupResult.candidates.map((candidate) => (
                    <button
                      key={candidate.teacherId}
                      type="button"
                      onClick={() => {
                        setTeacherName(candidate.name);
                        setSelectedTeacherCandidate(candidate);
                        setTeacherIdValue(candidate.teacherId);
                      }}
                      style={{ border: "1px solid #fcd34d", background: "#fff", borderRadius: 6, padding: "6px 8px", textAlign: "left", cursor: "pointer", color: "#92400e" }}
                    >
                      {candidate.name} | 相关课程：{candidate.courses.length > 0 ? candidate.courses.join("、") : "暂无"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {teacherLookupState === "done" && teacherLookupResult.matchType === "fuzzy" ? (
              <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, padding: 8, fontSize: 12, color: "#1d4ed8" }}>
                <div style={{ fontWeight: 700 }}>未找到完全匹配，以下是候选老师 / Closest teacher matches</div>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {teacherLookupResult.candidates.map((candidate) => (
                    <button
                      key={candidate.teacherId}
                      type="button"
                      onClick={() => {
                        setTeacherName(candidate.name);
                        setSelectedTeacherCandidate(candidate);
                        setTeacherIdValue(candidate.teacherId);
                      }}
                      style={{ border: "1px solid #bfdbfe", background: "#fff", borderRadius: 6, padding: "6px 8px", textAlign: "left", cursor: "pointer", color: "#1d4ed8" }}
                    >
                      {candidate.name} | 相关课程：{candidate.courses.length > 0 ? candidate.courses.join("、") : "暂无"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {teacherLookupState === "done" && teacherLookupResult.matchType === "none" ? (
              <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>
                数据库中未找到该老师，请确认姓名是否填写正确 / Teacher not found in database
              </div>
            ) : null}
            {selectedTeacherCandidate ? (
              <div style={{ border: "1px solid #bbf7d0", background: "#f8fff8", borderRadius: 8, padding: 8, fontSize: 12, color: "#166534" }}>
                <div style={{ fontWeight: 700 }}>已确认老师 / Confirmed teacher</div>
                <div>{selectedTeacherCandidate.name}</div>
                <div>相关课程 / Courses: {selectedTeacherCandidate.courses.length > 0 ? selectedTeacherCandidate.courses.join("、") : "暂无 / None"}</div>
              </div>
            ) : null}
          </label>
          <label style={labelStyle}>
            对接人 / POC
            <input name="poc" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            当前微信群名称{fieldRequired("wechat") ? "*" : ""} / Current WeChat Group Name{fieldRequired("wechat") ? "*" : ""}
            <input
              name="wechat"
              required={fieldRequired("wechat")}
              placeholder={fieldSuggested("wechat") || fieldRequired("wechat") ? "如：欧阳梓恩家长群" : ""}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            时长{fieldRequired("durationMin") ? "*" : ""}(分钟) / Duration(min){fieldRequired("durationMin") ? "*" : ""}
            <input
              name="durationMin"
              type="number"
              min={1}
              required={fieldRequired("durationMin")}
              placeholder={fieldSuggested("durationMin") || fieldRequired("durationMin") ? "如：60 / 120" : ""}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            授课形式{fieldRequired("mode") ? "*" : ""} / Mode{fieldRequired("mode") ? "*" : ""}
            <select name="mode" required={fieldRequired("mode")} style={fieldStyle}>
              <OptionList options={TICKET_MODE_OPTIONS} placeholder="可选 / Optional" />
            </select>
          </label>
          <label style={labelStyle}>
            版本 / Version
            <select name="version" style={fieldStyle}>
              <OptionList options={TICKET_VERSION_OPTIONS} placeholder="可选 / Optional" />
            </select>
          </label>
          <label style={labelStyle}>
            系统已更新 / System Updated
            <select name="systemUpdated" style={fieldStyle}>
              <OptionList options={TICKET_SYSTEM_UPDATED_OPTIONS} placeholder="可选 / Optional" />
            </select>
          </label>
          <label style={labelStyle}>
            SLA截止 / SLA Due
            <DateTimeSplitInput name="slaDue" wrapperStyle={{ width: "100%" }} dateStyle={fieldStyle} />
          </label>
          <label style={labelStyle}>
            下步截止 / Next Action Due
            <DateTimeSplitInput name="nextActionDue" wrapperStyle={{ width: "100%" }} dateStyle={fieldStyle} />
          </label>
          <label style={labelStyle}>
            录入人 / Intake Agent
            <input
              name="createdByName"
              defaultValue={createdByNameDefault ?? ""}
              readOnly={lockCreatedByName}
              style={{
                ...fieldStyle,
                background: lockCreatedByName ? "#f8fafc" : "#fff",
                color: lockCreatedByName ? "#334155" : undefined,
              }}
            />
          </label>
        </div>

        <label style={labelStyle}>
          地址或链接 / Address or Meeting Link
          <textarea name="addressOrLink" rows={2} style={fieldStyle} />
        </label>
        <label style={labelStyle}>
          S – Situation（情况）*
          <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
            必须写清楚：当前正在发生什么问题、需要怎么做、最晚截止时间
          </div>
          {selectedType ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>
                当前草稿基于：{selectedTemplate.title}
              </span>
              <button
                type="button"
                onClick={() => applySituationDraft(selectedType, true)}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                套用当前类型草稿 / Apply Draft
              </button>
            </div>
          ) : null}
        </label>
        <label style={labelStyle}>
          当前正在发生什么问题* / Current Problem*
          <textarea
            name="situationCurrent"
            required
            rows={3}
            value={situationCurrent}
            onChange={(e) => setSituationCurrent(e.target.value)}
            placeholder={selectedTemplate.currentPlaceholder}
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          需要怎么做* / Required Action*
          <textarea
            name="situationAction"
            required
            rows={3}
            value={situationAction}
            onChange={(e) => setSituationAction(e.target.value)}
            placeholder={selectedTemplate.actionPlaceholder}
            style={fieldStyle}
          />
        </label>
        <label style={labelStyle}>
          最晚截止时间* / Latest Deadline*
          <DateTimeSplitInput name="situationDeadline" required wrapperStyle={{ width: "100%" }} dateStyle={fieldStyle} />
        </label>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            证据上传（支持多文件）/ Evidence Upload (multiple files)
          </div>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={async (e) => {
              const files = e.currentTarget.files;
              if (!files || files.length === 0) return;
              setErr("");
              setUploading(true);
              try {
                const uploadFd = new FormData();
                Array.from(files).forEach((f) => uploadFd.append("files", f));
                const res = await fetch(uploadPath, { method: "POST", body: uploadFd });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.ok || !Array.isArray(data?.urls)) {
                  setErr(String(data?.message ?? "上传失败 / Upload failed"));
                  return;
                }
                setProofUrls((prev) => [...prev, ...data.urls.map((x: unknown) => String(x).trim()).filter(Boolean)]);
              } catch (e2: any) {
                setErr(String(e2?.message ?? "上传失败 / Upload failed"));
              } finally {
                setUploading(false);
                e.currentTarget.value = "";
              }
            }}
          />
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
            单文件上限 10MB / Max 10MB per file
          </div>
        </div>
        {proofFiles.length > 0 ? (
          <div style={{ fontSize: 12, color: "#334155", display: "grid", gap: 4 }}>
            <div>已上传 / Uploaded: {proofFiles.length}</div>
            {proofFiles.map((file) => (
              <div key={file.url}>{file.label}: {file.name}</div>
            ))}
          </div>
        ) : null}

        <button type="submit" disabled={submitting || uploading || (dupes.length > 0 && !forceDuplicate)} style={{ width: "100%", minHeight: 44 }}>
          {submitting ? "提交中... / Submitting..." : "提交工单 / Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
