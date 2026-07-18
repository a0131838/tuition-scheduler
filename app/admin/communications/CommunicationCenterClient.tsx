"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = {
  id: string; kind: string; status: string; priority: string; title: string; messageText: string;
  studentId: string | null; teacherId: string | null; feedbackId: string | null;
  ownerUserId: string | null; ownerName: string | null; wechatGroupName: string | null;
  dueAt: string | null; createdAt: string; copiedAt: string | null; manualSentAt: string | null;
  note: string | null; evidenceUrl: string | null; correctionOfTaskId: string | null;
  student: { name: string; school: string | null; grade: string | null } | null;
  teacher: { name: string } | null;
  feedback: { content: string; parentContent: string | null; reviewStatus: string; reviewNote: string | null; publishedAt: string | null } | null;
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
const kinds = ["ALL", "FEEDBACK", "COURSE_REMINDER_PARENT", "COURSE_REMINDER_TEACHER", "COURSE_CHANGE"];

const button: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", padding: "8px 11px", fontWeight: 750, cursor: "pointer" };
const primary: React.CSSProperties = { ...button, background: "#ea580c", color: "#fff", borderColor: "#ea580c" };

export default function CommunicationCenterClient({ currentUser }: { currentUser: { id: string; name: string; role: string } }) {
  const [rows, setRows] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [status, setStatus] = useState("OPEN");
  const [kind, setKind] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { parentContent: string; group: string; note: string }>>({});
  const initialized = useRef(false);

  const openCount = useMemo(() => ["PENDING_REVIEW", "READY_TO_SEND", "CLAIMED", "RETURNED", "ATTENTION"].reduce((sum, key) => sum + (summary[key] || 0), 0), [summary]);

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
      setRows(data.tasks || []); setSummary(data.summary || {}); setStaff(data.staff || []);
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
          <h1 style={{ margin: "5px 0", fontSize: 28 }}>家长沟通与通知中心</h1>
          <div style={{ color: "#64748b", fontSize: 13 }}>Emily 与 Eva 共用：先审核、再发布小程序、再人工转发微信群；自动通知和人工发送分别留痕。</div>
        </div>
        <button style={primary} disabled={loading} onClick={() => load(true)}>{loading ? "同步中…" : "同步反馈与明日提醒"}</button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 1, background: "#e2e8f0", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        {[
          ["待处理", openCount], ["待审核", summary.PENDING_REVIEW || 0], ["待发微信群", summary.READY_TO_SEND || 0],
          ["需更正", summary.ATTENTION || 0], ["已人工发送", summary.COMPLETED || 0],
        ].map(([label, value]) => <div key={String(label)} style={{ background: "#fff", padding: 14 }}><div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 850, marginTop: 4 }}>{value}</div></div>)}
      </section>

      <section style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {statuses.map((item) => <button key={item} style={{ ...button, background: status === item ? "#0f172a" : "#fff", color: status === item ? "#fff" : "#0f172a" }} onClick={() => setStatus(item)}>{statusLabels[item]}</button>)}
        <select value={kind} onChange={(event) => setKind(event.target.value)} style={{ ...button, marginLeft: "auto" }}>{kinds.map((item) => <option key={item} value={item}>{kindLabels[item]}</option>)}</select>
      </section>
      {message ? <div style={{ color: message.includes("失败") ? "#b91c1c" : "#166534", fontWeight: 700 }}>{message}</div> : null}

      <section style={{ display: "grid", gap: 12 }}>
        {rows.length === 0 ? <div style={{ padding: 28, borderTop: "1px solid #e2e8f0", color: "#64748b" }}>当前筛选下没有任务。</div> : null}
        {rows.map((row) => {
          const draft = drafts[row.id] || { parentContent: "", group: "", note: "" };
          const isFeedback = row.kind === "FEEDBACK";
          return <article key={row.id} style={{ padding: "16px 0", borderTop: `3px solid ${row.status === "ATTENTION" ? "#dc2626" : row.status === "PENDING_REVIEW" ? "#f59e0b" : "#cbd5e1"}`, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div><div style={{ fontWeight: 850, fontSize: 17 }}>{row.title}</div><div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{kindLabels[row.kind] || row.kind} · {statusLabels[row.status] || row.status} · 负责人：{row.ownerName || "未领取"}</div><div style={{ color: row.automaticNotification.status === "FAILED" ? "#b91c1c" : "#475569", fontSize: 12, marginTop: 4 }}>自动提醒：{({ SENT: "已发送", PENDING: "待发送/待授权", PROCESSING: "发送中", FAILED: "发送失败", SKIPPED: "已失效", NOT_QUEUED: "未入队" } as Record<string,string>)[row.automaticNotification.status] || row.automaticNotification.status} · 人工微信群：{row.manualSentAt ? "已发送" : "待处理"}</div></div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {row.ownerUserId !== currentUser.id && !row.manualSentAt ? <button style={button} onClick={() => act(row, "claim")}>领取任务</button> : null}
                {!row.manualSentAt ? <select value={row.ownerUserId || ""} onChange={(event) => event.target.value && act(row, "transfer", { ownerUserId: event.target.value })} style={button}><option value="">转交给…</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select> : null}
              </div>
            </div>

            {isFeedback && row.feedback ? <details open={row.status === "PENDING_REVIEW" || row.status === "RETURNED"}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>审核老师原文与家长展示版 / Review feedback</summary>
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
