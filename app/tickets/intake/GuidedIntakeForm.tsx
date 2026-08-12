"use client";

import { useEffect, useMemo, useState } from "react";
import type { IntakeFormProps } from "./IntakeForm";

type StudentCandidate = {
  studentId: string;
  name: string;
  grade: string | null;
  teachers: string[];
  courses: string[];
  sourceChannelName: string | null;
  ticketSource: string | null;
};

type SessionOption = {
  id: string;
  startText: string;
  courseLabel: string;
  teacherName: string;
  locationText?: string;
};

type GuidedAction = {
  key: string;
  actionType: string;
  sourceSessionId: string;
  requestedDate: string;
  requestedTime: string;
  courseLabel: string;
  durationMin: string;
  replacementRequired: boolean;
  notes: string;
};

const ACTIONS = [
  { actionType: "RESCHEDULE_SESSION", label: "修改课程时间", ticketType: "改课程时间", needsSource: true, needsTime: true },
  { actionType: "CANCEL_SESSION", label: "取消 / 请假", ticketType: "临时取消&请假课程", needsSource: true, needsTime: false },
  { actionType: "CREATE_SESSION", label: "新增课程 / 补课", ticketType: "补课加课", needsSource: false, needsTime: true },
  { actionType: "REPLACE_TEACHER", label: "更换老师", ticketType: "改上课老师", needsSource: true, needsTime: false },
  { actionType: "COORDINATE_ONLY", label: "时间未定，先协调", ticketType: "排课协调", needsSource: false, needsTime: true },
] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  boxSizing: "border-box",
  border: "1px solid #d6d3d1",
  borderRadius: 10,
  background: "#fff",
  color: "#1c1917",
  padding: "10px 12px",
  fontSize: 15,
};

const quietButton: React.CSSProperties = {
  minHeight: 40,
  border: "1px solid #d6d3d1",
  borderRadius: 9,
  background: "#fff",
  color: "#44403c",
  padding: "8px 12px",
  cursor: "pointer",
};

function tomorrowDate() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultDeadline() {
  return `${tomorrowDate()}T18:00`;
}

function actionDefinition(actionType: string) {
  return ACTIONS.find((item) => item.actionType === actionType) ?? ACTIONS[0];
}

function newAction(actionType: string = ACTIONS[0].actionType): GuidedAction {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    actionType,
    sourceSessionId: "",
    requestedDate: tomorrowDate(),
    requestedTime: "",
    courseLabel: "",
    durationMin: "60",
    replacementRequired: false,
    notes: "",
  };
}

function StepTitle({ number, title, hint }: { number: string; title: string; hint: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <div style={{ width: 34, height: 34, flex: "0 0 auto", borderRadius: 999, display: "grid", placeItems: "center", background: "#292524", color: "#fff", fontWeight: 800 }}>
        {number}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 850, color: "#1c1917" }}>{title}</div>
        <div style={{ marginTop: 3, color: "#78716c", fontSize: 13 }}>{hint}</div>
      </div>
    </div>
  );
}

export default function GuidedIntakeForm({
  apiPath,
  uploadPath,
  studentLookupPath,
  sessionLookupPath,
  createdByNameDefault,
  onOpenLegacy,
}: IntakeFormProps & { onOpenLegacy: () => void }) {
  const [studentQuery, setStudentQuery] = useState("");
  const [studentState, setStudentState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [studentCandidates, setStudentCandidates] = useState<StudentCandidate[]>([]);
  const [student, setStudent] = useState<StudentCandidate | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [actions, setActions] = useState<GuidedAction[]>([newAction()]);
  const [originalContent, setOriginalContent] = useState("");
  const [requiredAction, setRequiredAction] = useState("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [priority, setPriority] = useState("普通");
  const defaultOwner = ["Eva", "Emily", "Jasmine"].find((name) => createdByNameDefault?.toLowerCase().includes(name.toLowerCase())) ?? "Eva";
  const [owner, setOwner] = useState(defaultOwner);
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [proofUrls, setProofUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ ticketNo: string; status: string }>>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = studentQuery.trim();
    if (student && query !== student.name) {
      setStudent(null);
      setSessions([]);
      setActions((rows) => rows.map((row) => ({ ...row, sourceSessionId: "" })));
    }
    if (student && query === student.name) {
      setStudentState("done");
      setStudentCandidates([]);
      return;
    }
    if (query.length < 2) {
      setStudentState("idle");
      setStudentCandidates([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setStudentState("loading");
      try {
        const res = await fetch(`${studentLookupPath}?name=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "学生查询失败"));
        setStudentCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        setStudentState("done");
      } catch {
        setStudentState("error");
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [student, studentLookupPath, studentQuery]);

  const progress = [Boolean(student), actions.length > 0 && actions.every((row) => !actionDefinition(row.actionType).needsSource || row.sourceSessionId), Boolean(originalContent.trim())];
  const actionSummary = useMemo(
    () => actions.map((row) => actionDefinition(row.actionType).label).join("、"),
    [actions]
  );

  const selectStudent = async (candidate: StudentCandidate) => {
    setStudent(candidate);
    setStudentQuery(candidate.name);
    setStudentCandidates([]);
    setSessionsLoading(true);
    setSessions([]);
    setActions((rows) => rows.map((row) => ({ ...row, sourceSessionId: "", courseLabel: row.courseLabel || candidate.courses[0] || "" })));
    try {
      const res = await fetch(`${sessionLookupPath}?studentId=${encodeURIComponent(candidate.studentId)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(String(data?.message ?? "课程读取失败"));
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程读取失败");
    } finally {
      setSessionsLoading(false);
    }
  };

  const updateAction = (key: string, patch: Partial<GuidedAction>) => {
    setActions((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    setError("");
    setMessage("");
    if (!student) return setError("请先搜索并确认学生。"), undefined;
    if (!student.ticketSource) return setError("该学生尚未设置学生来源。请先到学生档案补充来源，再创建工单。"), undefined;
    if (!actions.length) return setError("请至少添加一个排课动作。"), undefined;
    const missingSource = actions.find((row) => actionDefinition(row.actionType).needsSource && !row.sourceSessionId);
    if (missingSource) return setError(`“${actionDefinition(missingSource.actionType).label}”必须选择具体原课程。`), undefined;
    if (!originalContent.trim()) return setError("请粘贴或概括家长原话。"), undefined;

    const firstDefinition = actionDefinition(actions[0].actionType);
    const firstSource = sessions.find((session) => session.id === actions[0].sourceSessionId);
    const payload = {
      guidedScheduling: true,
      studentId: student.studentId,
      studentName: student.name,
      source: student.ticketSource,
      type: actions.length > 1 ? "排课协调" : firstDefinition.ticketType,
      priority,
      status: "Need Info",
      owner,
      grade: student.grade || "",
      course: actions.find((row) => row.courseLabel.trim())?.courseLabel || firstSource?.courseLabel || student.courses[0] || "待教务确认",
      teacher: firstSource?.teacherName || student.teachers[0] || "",
      version: "V1",
      systemUpdated: "N",
      wechat: sourceDetail,
      situationCurrent: originalContent.trim(),
      situationAction: requiredAction.trim() || `请按工单内的${actions.length}个排课动作处理：${actionSummary}。`,
      situationDeadline: deadline,
      nextActionDue: deadline,
      createdByName: createdByNameDefault || "",
      proof: proofUrls.join("\n"),
      forceDuplicate: forceDuplicate ? "1" : "",
      schedulingActions: actions.map((row) => ({
        actionType: row.actionType,
        sourceSessionId: row.sourceSessionId || null,
        requestedStartAt: row.requestedTime ? `${row.requestedDate}T${row.requestedTime}:00+08:00` : null,
        courseLabel: row.courseLabel.trim() || null,
        durationMin: row.durationMin ? Number(row.durationMin) : null,
        replacementRequired: row.replacementRequired,
        notes: row.notes.trim() || null,
      })),
    };

    setSubmitting(true);
    try {
      const res = await fetch(apiPath, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (data?.code === "DUPLICATE" && Array.isArray(data.duplicates)) {
          setDuplicates(data.duplicates);
          setError("发现近期同类工单。确认不是重复后，可勾选继续提交。");
          return;
        }
        throw new Error(String(data?.message ?? "提交失败"));
      }
      setMessage(`工单 ${data.ticketNo} 已创建，包含 ${data.schedulingActionCount ?? actions.length} 个排课动作。`);
      setDuplicates([]);
      setForceDuplicate(false);
      setOriginalContent("");
      setRequiredAction("");
      setSourceDetail("");
      setProofUrls([]);
      setActions([newAction()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "20px 14px 44px", color: "#1c1917" }}>
      <header style={{ padding: "10px 0 22px", borderBottom: "1px solid #e7e5e4" }}>
        <div style={{ color: "#c2410c", fontWeight: 850, fontSize: 13, letterSpacing: 1 }}>教务录入</div>
        <h1 style={{ margin: "7px 0 5px", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.1 }}>把家长消息变成可执行工单</h1>
        <p style={{ margin: 0, color: "#78716c", lineHeight: 1.6 }}>选学生、拆动作、加原话。排课信息不确定也可以先保存，由教务继续补齐。</p>
        {createdByNameDefault ? <div style={{ marginTop: 10, fontSize: 13, color: "#57534e" }}>当前录入人：<b>{createdByNameDefault}</b></div> : null}
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, padding: "16px 0 4px" }}>
        {["选学生", "拆动作", "写原话"].map((label, index) => (
          <div key={label} style={{ padding: "9px 4px", textAlign: "center", borderBottom: `3px solid ${progress[index] ? "#ea580c" : "#d6d3d1"}`, color: progress[index] ? "#9a3412" : "#78716c", fontSize: 13, fontWeight: 800 }}>
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {message ? <div style={{ marginTop: 16, padding: 12, borderLeft: "4px solid #16a34a", background: "#f0fdf4", color: "#166534", fontWeight: 750 }}>{message}</div> : null}
      {error ? <div style={{ marginTop: 16, padding: 12, borderLeft: "4px solid #dc2626", background: "#fef2f2", color: "#991b1b", fontWeight: 700 }}>{error}</div> : null}

      <section style={{ padding: "30px 0", borderBottom: "1px solid #e7e5e4" }}>
        <StepTitle number="1" title="这是哪位学生的事？" hint="输入至少两个字，再点选正确学生。" />
        <input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="输入学生姓名" style={inputStyle} />
        {studentState === "loading" ? <div style={{ marginTop: 8, color: "#78716c", fontSize: 13 }}>正在查询学生…</div> : null}
        {studentState === "error" ? <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>查询失败，请稍后再试。</div> : null}
        {studentState === "done" && studentCandidates.length === 0 && !student ? <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 13 }}>没有找到学生，请检查姓名。</div> : null}
        {studentCandidates.length ? (
          <div style={{ marginTop: 8, borderTop: "1px solid #e7e5e4" }}>
            {studentCandidates.map((candidate) => (
              <button key={candidate.studentId} type="button" onClick={() => selectStudent(candidate)} style={{ width: "100%", display: "grid", gap: 3, padding: "13px 2px", border: 0, borderBottom: "1px solid #e7e5e4", background: "transparent", textAlign: "left", cursor: "pointer" }}>
                <b style={{ fontSize: 15 }}>{candidate.name}{candidate.grade ? ` · ${candidate.grade}` : ""}</b>
                <span style={{ color: "#78716c", fontSize: 12 }}>最近课程：{candidate.courses.join("、") || "暂无"} · 最近老师：{candidate.teachers.join("、") || "暂无"}</span>
                <span style={{ color: candidate.sourceChannelName ? "#166534" : "#b91c1c", fontSize: 12, fontWeight: 750 }}>学生来源：{candidate.sourceChannelName || "未设置，请先补充"}</span>
              </button>
            ))}
          </div>
        ) : null}
        {student ? (
          <div style={{ marginTop: 12, padding: "12px 0 2px", color: "#7c2d12" }}>
            <b>✓ 已选：{student.name}{student.grade ? ` · ${student.grade}` : ""}</b>
            <div style={{ marginTop: 4, fontSize: 13 }}>系统将读取该学生未来课程，避免改错课。</div>
            <div style={{ marginTop: 4, fontSize: 13, color: student.sourceChannelName ? "#166534" : "#b91c1c", fontWeight: 750 }}>学生来源：{student.sourceChannelName || "未设置，暂不能创建工单"}</div>
            {!student.sourceChannelName ? <a href={`/admin/students/${encodeURIComponent(student.studentId)}#edit-student`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 6, fontSize: 13, fontWeight: 800 }}>打开学生档案补充来源</a> : null}
          </div>
        ) : null}
      </section>

      <section style={{ padding: "30px 0", borderBottom: "1px solid #e7e5e4" }}>
        <StepTitle number="2" title="家长希望教务做什么？" hint="一条消息有多个要求时，继续添加动作，不要重复建工单。" />
        {sessionsLoading ? <div style={{ marginBottom: 12, color: "#9a3412", fontSize: 13 }}>正在读取未来课程…</div> : null}
        <div style={{ display: "grid", gap: 20 }}>
          {actions.map((action, index) => {
            const definition = actionDefinition(action.actionType);
            return (
              <div key={action.key} style={{ paddingTop: 16, borderTop: "3px solid #292524", display: "grid", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 850 }}>动作 {index + 1}</div><div style={{ marginTop: 2, fontSize: 19, fontWeight: 850 }}>{definition.label}</div></div>
                  {actions.length > 1 ? <button type="button" onClick={() => setActions((rows) => rows.filter((row) => row.key !== action.key))} style={quietButton}>删除</button> : null}
                </div>
                <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>
                  动作类型
                  <select value={action.actionType} onChange={(event) => updateAction(action.key, { actionType: event.target.value, sourceSessionId: "", replacementRequired: false })} style={inputStyle}>
                    {ACTIONS.map((item) => <option key={item.actionType} value={item.actionType}>{item.label}</option>)}
                  </select>
                </label>
                {definition.needsSource ? (
                  <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>
                    选择要处理的原课程 <span style={{ color: "#b91c1c" }}>必选</span>
                    <select value={action.sourceSessionId} onChange={(event) => { const source = sessions.find((row) => row.id === event.target.value); updateAction(action.key, { sourceSessionId: event.target.value, courseLabel: source?.courseLabel || action.courseLabel }); }} style={inputStyle}>
                      <option value="">请选择具体课程</option>
                      {sessions.map((session) => <option key={session.id} value={session.id}>{session.startText} · {session.courseLabel} · {session.teacherName}</option>)}
                    </select>
                    {!sessionsLoading && student && sessions.length === 0 ? <span style={{ color: "#b91c1c", fontWeight: 500 }}>没有找到未来课程。请改选“时间未定，先协调”，由教务补充。</span> : null}
                  </label>
                ) : (
                  <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>
                    课程
                    <input value={action.courseLabel} onChange={(event) => updateAction(action.key, { courseLabel: event.target.value })} placeholder="例如：G9 数学" style={inputStyle} />
                  </label>
                )}
                {definition.needsTime ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>希望日期<input type="date" value={action.requestedDate} onChange={(event) => updateAction(action.key, { requestedDate: event.target.value })} style={inputStyle} /></label>
                    <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>希望时间<input type="time" value={action.requestedTime} onChange={(event) => updateAction(action.key, { requestedTime: event.target.value })} style={inputStyle} /></label>
                    <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>分钟<input type="number" min={15} max={360} step={15} value={action.durationMin} onChange={(event) => updateAction(action.key, { durationMin: event.target.value })} style={inputStyle} /></label>
                  </div>
                ) : null}
                {action.actionType === "CANCEL_SESSION" ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14 }}>
                    <input type="checkbox" checked={action.replacementRequired} onChange={(event) => updateAction(action.key, { replacementRequired: event.target.checked })} />
                    取消后还需要安排补课
                  </label>
                ) : null}
                <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>补充说明<textarea value={action.notes} onChange={(event) => updateAction(action.key, { notes: event.target.value })} placeholder={action.actionType === "REPLACE_TEACHER" ? "请写目标老师或老师要求；不确定可以写“待匹配”" : "例如：家长只能周六；老师已确认"} rows={2} style={inputStyle} /></label>
              </div>
            );
          })}
        </div>
        <button type="button" disabled={actions.length >= 10} onClick={() => setActions((rows) => [...rows, newAction("CREATE_SESSION")])} style={{ ...quietButton, marginTop: 16, borderColor: "#ea580c", color: "#9a3412", fontWeight: 800 }}>
          ＋ 添加另一个动作
        </button>
      </section>

      <section style={{ padding: "30px 0", borderBottom: "1px solid #e7e5e4" }}>
        <StepTitle number="3" title="家长说了什么？" hint="粘贴聊天原话，内部人员据此处理。" />
        <textarea value={originalContent} onChange={(event) => setOriginalContent(event.target.value)} rows={5} placeholder="粘贴微信群原话，或用自己的话完整概括" style={inputStyle} />
        <label style={{ display: "grid", gap: 6, marginTop: 14, fontWeight: 750, fontSize: 13 }}>下一步说明（可选）<textarea value={requiredAction} onChange={(event) => setRequiredAction(event.target.value)} rows={2} placeholder="例如：Eva 今天确认老师并回复家长" style={inputStyle} /></label>
      </section>

      <section style={{ padding: "30px 0", borderBottom: "1px solid #e7e5e4" }}>
        <StepTitle number="4" title="上传截图或文件" hint="网页可从相册、桌面或文件夹选择；没有附件也能提交。" />
        <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt" disabled={uploading} onChange={async (event) => {
          const files = event.currentTarget.files;
          if (!files?.length) return;
          setUploading(true);
          setError("");
          try {
            const formData = new FormData();
            Array.from(files).forEach((file) => formData.append("files", file));
            const res = await fetch(uploadPath, { method: "POST", body: formData });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok || !Array.isArray(data.urls)) throw new Error(String(data?.message ?? "上传失败"));
            setProofUrls((rows) => [...rows, ...data.urls.map(String)].slice(0, 10));
          } catch (err) {
            setError(err instanceof Error ? err.message : "上传失败");
          } finally {
            setUploading(false);
            event.currentTarget.value = "";
          }
        }} />
        <div style={{ marginTop: 8, color: "#78716c", fontSize: 13 }}>{uploading ? "正在上传…" : proofUrls.length ? `已上传 ${proofUrls.length} 个附件` : "单文件上限 10MB，最多 10 个"}</div>
      </section>

      <details style={{ padding: "22px 0", borderBottom: "1px solid #e7e5e4" }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>更多设置（通常不用改）</summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>负责人<select value={owner} onChange={(event) => setOwner(event.target.value)} style={inputStyle}><option>Eva</option><option>Emily</option><option>Jasmine</option></select></label>
          <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>紧急程度<select value={priority} onChange={(event) => setPriority(event.target.value)} style={inputStyle}><option>普通</option><option>1小时紧急</option><option>6小时紧急</option><option>24小时紧急</option></select></label>
          <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>下一步截止<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} style={inputStyle} /></label>
          <label style={{ display: "grid", gap: 6, fontWeight: 750, fontSize: 13 }}>微信群/来源说明<input value={sourceDetail} onChange={(event) => setSourceDetail(event.target.value)} placeholder="例如：G9 数学家长群" style={inputStyle} /></label>
        </div>
      </details>

      {duplicates.length ? (
        <div style={{ marginTop: 18, padding: 12, background: "#fffbeb", borderLeft: "4px solid #f59e0b", color: "#92400e" }}>
          <b>可能重复：</b> {duplicates.map((row) => `${row.ticketNo}（${row.status}）`).join("、")}
          <label style={{ display: "flex", gap: 8, marginTop: 10 }}><input type="checkbox" checked={forceDuplicate} onChange={(event) => setForceDuplicate(event.target.checked)} />确认不是重复工单，继续创建</label>
        </div>
      ) : null}

      <div style={{ paddingTop: 26 }}>
        <div style={{ marginBottom: 10, color: student && originalContent.trim() ? "#166534" : "#9a3412", fontSize: 13, fontWeight: 750 }}>
          {!student ? "还差：选择学生" : !student.ticketSource ? "还差：在学生档案设置学生来源" : !originalContent.trim() ? "还差：填写家长原话" : "信息已齐，可以创建"}
        </div>
        <button type="button" disabled={submitting || uploading || !student?.ticketSource || (duplicates.length > 0 && !forceDuplicate)} onClick={submit} style={{ width: "100%", minHeight: 52, border: 0, borderRadius: 11, background: submitting || !student?.ticketSource ? "#a8a29e" : "#ea580c", color: "#fff", fontSize: 17, fontWeight: 850, cursor: submitting ? "wait" : "pointer" }}>
          {submitting ? "正在创建…" : `确认创建工单（${actions.length} 个动作）`}
        </button>
        <button type="button" onClick={onOpenLegacy} style={{ ...quietButton, width: "100%", marginTop: 10 }}>录入其他非排课工单 / 打开旧版完整字段</button>
      </div>
    </main>
  );
}
