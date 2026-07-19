"use client";

import { useEffect, useRef, useState } from "react";

type Task = {
  id: string; kind: string; status: string; priority: string; title: string; messageText: string;
  studentId: string | null; teacherId: string | null; feedbackId: string | null;
  ownerUserId: string | null; ownerName: string | null; wechatGroupName: string | null;
  dueAt: string | null; createdAt: string; copiedAt: string | null; manualSentAt: string | null;
  note: string | null; evidenceUrl: string | null; correctionOfTaskId: string | null;
  dateLabel: string | null; shortDateLabel: string | null;
  student: { name: string; school: string | null; grade: string | null } | null;
  teacher: { name: string } | null;
  feedback: { content: string; parentContent: string | null; homework: string | null; previousHomeworkDone: boolean | null; reviewStatus: string; reviewNote: string | null; publishedAt: string | null; sections: Record<string, string>; completeness: { complete: boolean; completed: number; total: number; missing: string[] } } | null;
  history: Array<{ action: string; actorName: string | null; actorEmail: string; actorRole: string | null; createdAt: string }>;
  automaticNotification: { status: string; total: number; counts: Record<string, number> };
};

const statusLabels: Record<string, string> = {
  OPEN: "全部待处理", PENDING_REVIEW: "待审核反馈", READY_TO_SEND: "待发微信群", CLAIMED: "处理中",
  RETURNED: "已退回老师", ATTENTION: "需更正", COMPLETED: "已人工发送", WAIVED: "无需发送", ALL: "全部记录",
};
const kindLabels: Record<string, string> = {
  ALL: "全部类型", FEEDBACK: "课后反馈", COURSE_REMINDER_PARENT: "家长课程提醒",
  COURSE_REMINDER_TEACHER: "老师课程提醒", COURSE_CHANGE: "课程更正通知",
};
const statuses = ["OPEN", "PENDING_REVIEW", "READY_TO_SEND", "ATTENTION", "RETURNED", "COMPLETED", "ALL"];
const kinds = ["FEEDBACK", "COURSE_REMINDER_PARENT", "COURSE_REMINDER_TEACHER", "COURSE_CHANGE"];
const feedbackSectionLabels = [["lessonFocus", "本节课重点"], ["currentFinding", "当前发现"], ["classPerformance", "课堂表现"], ["nextPlan", "下一步计划"], ["parentNote", "家长需要知道"]] as const;

const button: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", padding: "8px 11px", fontWeight: 750, cursor: "pointer" };
const primary: React.CSSProperties = { ...button, background: "#ea580c", color: "#fff", borderColor: "#ea580c" };

export default function CommunicationCenterClient({ currentUser }: { currentUser: { id: string; name: string; role: string } }) {
  const [rows, setRows] = useState<Task[]>([]);
  const [kindSummary, setKindSummary] = useState<Record<string, number>>({});
  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [status, setStatus] = useState("OPEN");
  const [kind, setKind] = useState("FEEDBACK");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { parentContent: string; group: string; note: string }>>({});
  const initialized = useRef(false);

  async function load(sync = false) {
    setLoading(true); setMessage("");
    try {
      if (sync) {
        const syncRes = await fetch("/api/admin/communications", { method: "POST" });
        const syncData = await syncRes.json();
        if (!syncRes.ok || syncData.ok === false) throw new Error(syncData.message || "同步失败");
      }
      const res = await fetch(`/api/admin/communications?status=${encodeURIComponent(status)}&kind=${encodeURIComponent(kind)}&limit=300`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "加载失败");
      setRows(data.tasks || []); setKindSummary(data.kindSummary || {}); setStaff(data.staff || []);
      setDrafts((previous) => {
        const next = { ...previous };
        for (const row of data.tasks || []) next[row.id] = next[row.id] || { parentContent: row.feedback?.parentContent || row.feedback?.content || "", group: row.wechatGroupName || "", note: row.note || "" };
        return next;
      });
    } catch (error: any) { setMessage(error?.message || "加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const first = !initialized.current;
    initialized.current = true;
    load(first);
  }, [status, kind]);

  async function act(row: Task, action: string, data: Record<string, unknown> = {}) {
    setLoading(true); setMessage("");
    try {
      const res = await fetch(`/api/admin/communications/${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, data }) });
      const result = await res.json();
      if (!res.ok || result.ok === false) throw new Error(result.message || "操作失败");
      await load(false);
      setMessage(action === "manual_sent" ? "已记录微信群/微信人工发送。" : "操作已保存并记录日志。");
    } catch (error: any) { setMessage(error?.message || "操作失败"); }
    finally { setLoading(false); }
  }

  async function copy(row: Task) {
    await navigator.clipboard.writeText(row.messageText);
    await act(row, "copy");
  }

  async function uploadEvidence(row: Task, file: File | null) {
    if (!file) return;
    setLoading(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file);
      const res = await fetch(`/api/admin/communications/${row.id}/evidence`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "上传失败");
      await load(false); setMessage("发送截图已上传并记录日志。");
    } catch (error: any) { setMessage(error?.message || "上传失败"); }
    finally { setLoading(false); }
  }

  function updateDraft(id: string, patch: Partial<{ parentContent: string; group: string; note: string }>) {
    setDrafts((previous) => ({ ...previous, [id]: { ...(previous[id] || { parentContent: "", group: "", note: "" }), ...patch } }));
  }

  return (
    <main style={{ display: "grid", gap: 18, maxWidth: 1280 }}>
      <header style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 16, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#c2410c", fontSize: 12, fontWeight: 900 }}>ACADEMIC COMMUNICATION DESK / 教务沟通台</div>
          <h1 style={{ margin: "5px 0", fontSize: 28 }}>沟通与提醒工作台</h1>
          <div style={{ color: "#64748b", fontSize: 13 }}>先选择审核反馈、发给家长、发给老师或更正通知，再处理对应任务。</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 5 }}>老师可从员工小程序或<a href="/teacher" target="_blank" rel="noreferrer" style={{ color: "#c2410c", fontWeight: 800, margin: "0 4px" }}>网页版老师端</a>查看课程；家长和学生从家长小程序查看。</div>
        </div>
        <button style={primary} disabled={loading} onClick={() => load(true)}>{loading ? "同步中…" : "同步反馈与明日提醒"}</button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 1, background: "#e2e8f0", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        {[
          ["审核反馈", kindSummary.FEEDBACK || 0], ["发给家长", kindSummary.COURSE_REMINDER_PARENT || 0],
          ["发给老师", kindSummary.COURSE_REMINDER_TEACHER || 0], ["更正通知", kindSummary.COURSE_CHANGE || 0],
        ].map(([label, value]) => <div key={String(label)} style={{ background: "#fff", padding: 14 }}><div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 850, marginTop: 4 }}>{value}</div></div>)}
      </section>

      <section style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {kinds.map((item) => <button key={item} style={{ ...button, background: kind === item ? "#ea580c" : "#fff", color: kind === item ? "#fff" : "#0f172a", borderColor: kind === item ? "#ea580c" : "#cbd5e1" }} onClick={() => setKind(item)}>{kindLabels[item]} ({kindSummary[item] || 0})</button>)}
      </section>
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {statuses.map((item) => <button key={item} style={{ ...button, background: status === item ? "#0f172a" : "#fff", color: status === item ? "#fff" : "#0f172a" }} onClick={() => setStatus(item)}>{statusLabels[item]}</button>)}
      </section>
      {message ? <div style={{ color: message.includes("失败") ? "#b91c1c" : "#166534", fontWeight: 700 }}>{message}</div> : null}

      <section style={{ display: "grid", gap: 12 }}>
        {rows.length === 0 ? <div style={{ padding: 28, borderTop: "1px solid #e2e8f0", color: "#64748b" }}>当前筛选下没有任务。</div> : null}
        {rows.map((row) => {
          const draft = drafts[row.id] || { parentContent: "", group: "", note: "" };
          const isFeedback = row.kind === "FEEDBACK";
          return <article key={row.id} style={{ padding: "16px 0", borderTop: `3px solid ${row.status === "ATTENTION" ? "#dc2626" : row.status === "PENDING_REVIEW" ? "#f59e0b" : "#cbd5e1"}`, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><div style={{ color: "#9a3412", fontSize: 12, fontWeight: 850 }}>{kindLabels[row.kind] || row.kind} · {statusLabels[row.status] || row.status}</div><div style={{ fontWeight: 850, fontSize: 17, marginTop: 4 }}>{row.title}</div><div style={{ color: "#334155", fontSize: 13, fontWeight: 750, marginTop: 4 }}>{row.dateLabel || "课程日期待确认"}</div><div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>负责人：{row.ownerName || "未领取"}</div><div style={{ color: row.automaticNotification.status === "FAILED" ? "#b91c1c" : "#475569", fontSize: 12, marginTop: 4 }}>自动提醒：{({ SENT: "已发送", PENDING: "待发送/待授权", PROCESSING: "发送中", FAILED: "发送失败", SKIPPED: "已失效", NOT_QUEUED: "未入队" } as Record<string,string>)[row.automaticNotification.status] || row.automaticNotification.status} · 人工微信：{row.manualSentAt ? "已发送" : "待处理"}</div></div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {row.ownerUserId !== currentUser.id && !row.manualSentAt ? <button style={button} onClick={() => act(row, "claim")}>领取任务</button> : null}
                {!row.manualSentAt ? <select value={row.ownerUserId || ""} onChange={(event) => event.target.value && act(row, "transfer", { ownerUserId: event.target.value })} style={button}><option value="">转交给…</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select> : null}
              </div>
            </div>

            {isFeedback && row.feedback ? <details open={row.status === "PENDING_REVIEW" || row.status === "RETURNED"}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>审核老师原文与家长展示版 / Review feedback</summary>
              <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: row.feedback.completeness.complete ? "#f0fdf4" : "#fef2f2", color: row.feedback.completeness.complete ? "#166534" : "#991b1b", fontWeight: 800 }}>反馈完整度 {row.feedback.completeness.completed}/{row.feedback.completeness.total}{row.feedback.completeness.missing.length ? ` · 缺少：${row.feedback.completeness.missing.join("、")}` : " · 内容完整，可以审核"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 1, marginTop: 10, background: "#e2e8f0", border: "1px solid #e2e8f0" }}>{feedbackSectionLabels.map(([key, label]) => <div key={key} style={{ padding: 12, background: "#fff" }}><div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</div><div style={{ marginTop: 5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{row.feedback?.sections?.[key] || "未填写"}</div></div>)}<div style={{ padding: 12, background: "#fff" }}><div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>本次作业</div><div style={{ marginTop: 5, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{row.feedback.homework || "未填写"}</div></div><div style={{ padding: 12, background: "#fff" }}><div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>上次作业完成情况</div><div style={{ marginTop: 5 }}>{row.feedback.previousHomeworkDone === true ? "已完成" : row.feedback.previousHomeworkDone === false ? "未完成" : "未填写"}</div></div></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, marginTop: 10 }}>
                <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#64748b" }}>老师原文（只读） / Teacher original<textarea readOnly value={row.feedback.content} rows={11} style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }} /></label>
                <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#64748b" }}>家长展示版 / Parent-facing version<textarea value={draft.parentContent} onChange={(event) => updateDraft(row.id, { parentContent: event.target.value })} rows={11} style={{ padding: 10, border: "1px solid #fdba74", borderRadius: 8 }} /></label>
              </div>
              {row.feedback.reviewNote ? <div style={{ color: "#b91c1c", marginTop: 8 }}>退回原因：{row.feedback.reviewNote}</div> : null}
              {row.feedback.reviewStatus !== "PUBLISHED" ? <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}><button style={primary} onClick={() => act(row, "publish_feedback", { parentContent: draft.parentContent })}>审核并发布到家长端</button><button style={button} onClick={() => { const note = window.prompt("请输入退回老师补充的原因 / Return reason"); if (note) act(row, "return_feedback", { note }); }}>退回老师补充</button></div> : <div style={{ color: "#166534", fontWeight: 750, marginTop: 8 }}>已发布到家长小程序 / Published to parent miniapp</div>}
            </details> : null}

            {(row.status === "READY_TO_SEND" || row.status === "CLAIMED" || row.status === "ATTENTION" || row.status === "COMPLETED") ? <div style={{ display: "grid", gap: 9 }}>
              <div style={{ fontWeight: 800 }}>微信群/微信人工转发 / Manual WeChat forwarding</div>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, padding: 12, background: "#f8fafc", borderLeft: "4px solid #ea580c", fontFamily: "inherit", lineHeight: 1.65 }}>{row.messageText}</pre>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(260px,2fr)", gap: 8 }}>
                <input value={draft.group} onChange={(event) => updateDraft(row.id, { group: event.target.value })} placeholder={row.kind === "COURSE_REMINDER_TEACHER" ? "老师微信 / Teacher WeChat" : "家长群名称 / Parent group name"} style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 }} />
                <input value={draft.note} onChange={(event) => updateDraft(row.id, { note: event.target.value })} placeholder="备注（可选）/ Note (optional)" style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={button} onClick={() => copy(row)}>复制微信群文案</button>
                <a href={`/api/admin/communications/${row.id}/share-image`} download style={{ ...button, textDecoration: "none", color: "#0f172a" }}>下载转发图片</a>
                <label style={{ ...button, display: "inline-flex", alignItems: "center" }}>上传发送截图<input type="file" accept="image/*" hidden onChange={(event) => uploadEvidence(row, event.target.files?.[0] || null)} /></label>
                {!row.manualSentAt ? <button style={primary} onClick={() => act(row, "manual_sent", { wechatGroupName: draft.group, note: draft.note, channel: row.kind === "COURSE_REMINDER_TEACHER" ? "WECHAT_DIRECT" : "WECHAT_GROUP" })}>确认已人工发送</button> : <span style={{ color: "#166534", fontWeight: 800, padding: 8 }}>已由 {row.ownerName || "教务"} 完成人工发送</span>}
                <button style={button} onClick={() => act(row, "retry_auto")}>重试自动提醒</button>
                {!row.manualSentAt ? <button style={button} onClick={() => { const note = window.prompt("请输入无需发送的原因 / Waive reason"); if (note) act(row, "waive", { note }); }}>无需发送</button> : null}
              </div>
              {row.evidenceUrl ? <div style={{ color: "#1d4ed8", fontSize: 12 }}>已上传发送截图 / Evidence attached</div> : null}
            </div> : null}
            {row.history?.length ? <details><summary style={{ cursor: "pointer", color: "#475569", fontWeight: 750 }}>查看操作记录 / View audit trail ({row.history.length})</summary><div style={{ display: "grid", gap: 5, marginTop: 8, fontSize: 12, color: "#475569" }}>{row.history.map((item, index) => <div key={`${item.createdAt}-${index}`}>{new Date(item.createdAt).toLocaleString("zh-SG")} · {item.actorName || item.actorEmail} · {item.action}</div>)}</div></details> : null}
          </article>;
        })}
      </section>
    </main>
  );
}
