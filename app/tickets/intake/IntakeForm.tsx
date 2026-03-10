"use client";

import {
  getTicketFieldLabel,
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
}: {
  apiPath: string;
  uploadPath: string;
  studentLookupPath: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [dupes, setDupes] = useState<Array<{ ticketNo: string; status: string; createdAt: string; summary: string }>>([]);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [situationCurrent, setSituationCurrent] = useState("");
  const [situationAction, setSituationAction] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [studentLookupState, setStudentLookupState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [studentLookupResult, setStudentLookupResult] = useState<{
    matchType: string;
    candidates: Array<{ studentId: string; name: string; grade: string | null; teachers: string[] }>;
  }>({ matchType: "empty", candidates: [] });
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

  const exactCandidate =
    studentLookupResult.matchType === "exact" && studentLookupResult.candidates.length === 1
      ? studentLookupResult.candidates[0]
      : null;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 12px 24px" }}>
      <h2 style={{ margin: "8px 0 4px" }}>工单录入 / Ticket Intake</h2>
      <div style={{ color: "#475569", marginBottom: 12 }}>
        客服快速录入（免登录）/ Quick no-login intake for customer service
      </div>
      {msg ? <div style={{ color: "#166534", marginBottom: 10 }}>{msg}</div> : null}
      {err ? <div style={{ color: "#b91c1c", marginBottom: 10 }}>{err}</div> : null}
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
              {d.ticketNo} | {d.status} | {new Date(d.createdAt).toLocaleString()} | {parseTicketSituationSummary(d.summary).currentIssue || d.summary || "-"}
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
          const form = e.currentTarget;
          const fd = new FormData(form);
          setSubmitting(true);
          setMsg("");
          setErr("");
          const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
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
            setMsg(`提交成功 / Submitted: ${data.ticketNo}`);
            setDupes([]);
            setForceDuplicate(false);
            setStudentName("");
            setSelectedType("");
            setSituationCurrent("");
            setSituationAction("");
            setProofUrls([]);
            setStudentLookupState("idle");
            setStudentLookupResult({ matchType: "empty", candidates: [] });
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
              <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8, padding: 8, fontSize: 12, color: "#166534" }}>
                <div style={{ fontWeight: 700 }}>已匹配学生 / Student found</div>
                <div>{exactCandidate.name}{exactCandidate.grade ? ` | ${exactCandidate.grade}` : ""}</div>
                <div>最近老师 / Recent teacher: {exactCandidate.teachers.length > 0 ? exactCandidate.teachers.join("、") : "暂无 / None"}</div>
              </div>
            ) : null}
            {studentLookupState === "done" && studentLookupResult.matchType === "multiple-exact" ? (
              <div style={{ border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: 8, padding: 8, fontSize: 12, color: "#92400e" }}>
                <div style={{ fontWeight: 700 }}>找到多个同名学生，请确认 / Multiple exact matches</div>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {studentLookupResult.candidates.map((candidate) => (
                    <div key={candidate.studentId}>
                      {candidate.name}{candidate.grade ? ` | ${candidate.grade}` : ""} | 最近老师：{candidate.teachers.length > 0 ? candidate.teachers.join("、") : "暂无"}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {studentLookupState === "done" && studentLookupResult.matchType === "fuzzy" ? (
              <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, padding: 8, fontSize: 12, color: "#1d4ed8" }}>
                <div style={{ fontWeight: 700 }}>未找到完全匹配，以下是候选学生 / Closest student matches</div>
                <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                  {studentLookupResult.candidates.map((candidate) => (
                    <div key={candidate.studentId}>
                      {candidate.name}{candidate.grade ? ` | ${candidate.grade}` : ""} | 最近老师：{candidate.teachers.length > 0 ? candidate.teachers.join("、") : "暂无"}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {studentLookupState === "done" && studentLookupResult.matchType === "none" ? (
              <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>
                数据库中未找到该学生，请确认姓名是否填写正确 / Student not found in database
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
              placeholder={fieldSuggested("grade") || fieldRequired("grade") ? "如：P3 / G6" : ""}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            课程{fieldRequired("course") ? "*" : ""} / Course{fieldRequired("course") ? "*" : ""}
            <input
              name="course"
              required={fieldRequired("course")}
              placeholder={fieldSuggested("course") || fieldRequired("course") ? "如：英语口语 / Math" : ""}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            老师{fieldRequired("teacher") ? "*" : ""} / Teacher{fieldRequired("teacher") ? "*" : ""}
            <input
              name="teacher"
              required={fieldRequired("teacher")}
              placeholder={fieldSuggested("teacher") || fieldRequired("teacher") ? "填写当前老师或目标老师" : ""}
              style={fieldStyle}
            />
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
            <input name="createdByName" style={fieldStyle} />
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
