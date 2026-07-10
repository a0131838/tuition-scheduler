"use client";

import { useEffect, useState } from "react";

type ParentRequest = {
  id: string;
  ticketNo: string;
  studentName: string;
  type: string;
  status: string;
  statusLabel: string;
  owner: string | null;
  title: string;
  content: string;
  requestedAction: string;
  completionResult?: string | null;
  updatedAt: string;
};

const statuses = ["", "Need Info", "Waiting Teacher", "Waiting Parent", "Confirmed", "Completed", "Cancelled", "Exception"];
const owners = ["", "Jasmine", "Eva", "Emily"];

const btn: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 800,
};

export default function ParentRequestsMobileClient() {
  const [rows, setRows] = useState<ParentRequest[]>([]);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const qs = new URLSearchParams();
      if (owner) qs.set("owner", owner);
      if (status) qs.set("status", status);
      qs.set("includeDone", "true");
      const res = await fetch(`/api/admin/ops/parent-requests?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "加载失败");
      setRows(data.requests || []);
    } catch (error: any) {
      setMessage(error?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [owner, status]);

  async function updateStatus(row: ParentRequest, nextStatus: string) {
    let finalSchedule = "";
    if (nextStatus === "Completed") {
      finalSchedule = window.prompt("请填写给家长看的处理结果，再标记完成。", row.completionResult || "")?.trim() || "";
      if (!finalSchedule) {
        setMessage("标记完成前必须填写对外处理结果。");
        return;
      }
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/ops/parent-requests/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextStatus === "Completed" ? { status: nextStatus, finalSchedule } : { status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "更新失败");
      await load();
      setMessage("已更新，请求状态变化会进入家长提醒队列。");
    } catch (error: any) {
      setMessage(error?.message || "更新失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", display: "grid", gap: 12 }}>
      <section style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
        <div style={{ color: "#9a3412", fontSize: 12, fontWeight: 900 }}>PARENT REQUESTS</div>
        <h1 style={{ margin: 0, fontSize: 24 }}>家长请求</h1>
        <div style={{ color: "#64748b", fontSize: 13 }}>Jasmine 和 Eva 可看同一批请求；状态变化会进入小程序通知队列。</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <select value={owner} onChange={(e) => setOwner(e.currentTarget.value)} style={{ ...btn, width: "100%" }}>
            {owners.map((item) => <option key={item} value={item}>{item || "全部负责人"}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.currentTarget.value)} style={{ ...btn, width: "100%" }}>
            {statuses.map((item) => <option key={item} value={item}>{item || "全部状态"}</option>)}
          </select>
        </div>
        <button type="button" disabled={loading} onClick={load} style={btn}>刷新</button>
        {message ? <div style={{ color: message.includes("失败") ? "#b91c1c" : "#166534", fontSize: 13 }}>{message}</div> : null}
      </section>

      {rows.length === 0 ? (
        <div style={{ padding: 24, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", color: "#64748b" }}>暂无请求。</div>
      ) : null}
      {rows.map((row) => (
        <section key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 14, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{row.studentName} · {row.type}</strong>
            <span style={{ border: "1px solid #dbe4f0", borderRadius: 999, padding: "3px 8px", fontSize: 12 }}>{row.statusLabel}</span>
          </div>
          <div style={{ fontWeight: 800 }}>{row.title || row.ticketNo}</div>
          <div style={{ color: "#64748b", fontSize: 13, whiteSpace: "pre-wrap" }}>{row.content || row.requestedAction || "-"}</div>
          {row.completionResult ? (
            <div style={{ color: "#166534", fontSize: 13, whiteSpace: "pre-wrap" }}>处理结果：{row.completionResult}</div>
          ) : null}
          <div style={{ color: "#64748b", fontSize: 12 }}>负责人：{row.owner || "-"} · {row.updatedAt}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={loading || row.status === "Waiting Parent"} onClick={() => updateStatus(row, "Waiting Parent")} style={btn}>等家长</button>
            <button type="button" disabled={loading || row.status === "Confirmed"} onClick={() => updateStatus(row, "Confirmed")} style={btn}>已确认</button>
            <button type="button" disabled={loading || row.status === "Completed"} onClick={() => updateStatus(row, "Completed")} style={{ ...btn, background: "#123524", color: "#fff", borderColor: "#123524" }}>完成</button>
          </div>
        </section>
      ))}
    </main>
  );
}
