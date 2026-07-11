"use client";

import { useEffect, useMemo, useState } from "react";

type NotificationRow = {
  id: string;
  templateKey: string;
  eventType: string;
  targetType: string | null;
  targetId: string | null;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  error: string | null;
  parent: { name: string | null; phone: string | null; wechatOpenId: string | null; status: string };
  student: { name: string; school: string | null; grade: string | null } | null;
  payloadJson: unknown;
};

type NotificationConfiguration = {
  appIdConfigured: boolean;
  secretConfigured: boolean;
  configuredCount: number;
  requiredCount: number;
  templates: Array<{ key: string; envKey: string; configured: boolean }>;
};

const statuses = ["PENDING", "SENT", "FAILED", "SKIPPED", "ALL"];

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#fff",
  padding: "7px 10px",
  fontWeight: 800,
  cursor: "pointer",
};

export default function MiniappNotificationsClient() {
  const [status, setStatus] = useState("PENDING");
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [configuration, setConfiguration] = useState<NotificationConfiguration | null>(null);

  const total = useMemo(() => Object.values(summary).reduce((sum, n) => sum + n, 0), [summary]);

  async function load(nextStatus = status) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/miniapp-notifications?status=${encodeURIComponent(nextStatus)}&limit=200`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "加载失败");
      setRows(data.notifications || []);
      setSummary(data.summary || {});
      setConfiguration(data.configuration || null);
    } catch (error: any) {
      setMessage(error?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(status);
  }, [status]);

  async function patch(id: string, action: "skip" | "reset") {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/miniapp-notifications/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "操作失败");
      await load(status);
      setMessage(action === "skip" ? "已跳过。" : "已重置为待发送。");
    } catch (error: any) {
      setMessage(error?.message || "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          border: "1px solid #c7d2fe",
          borderRadius: 16,
          background: "#f8faff",
          padding: 18,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#3730a3", fontSize: 12, fontWeight: 900 }}>MINIAPP NOTIFICATIONS</div>
            <h1 style={{ margin: "4px 0", fontSize: 24 }}>小程序通知队列</h1>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              先记录课程提醒、请求状态变化、财务提醒。模板 ID 配好后，发送任务会从这里取数。
            </div>
          </div>
          <button type="button" disabled={loading} onClick={() => load(status)} style={buttonStyle}>
            刷新
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {statuses.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              style={{
                ...buttonStyle,
                background: status === item ? "#3730a3" : "#fff",
                color: status === item ? "#fff" : "#0f172a",
                borderColor: status === item ? "#3730a3" : "#cbd5e1",
              }}
            >
              {item} ({item === "ALL" ? total : summary[item] || 0})
            </button>
          ))}
        </div>
        {configuration ? (
          <div style={{ borderTop: "1px solid #c7d2fe", paddingTop: 12, display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>微信订阅消息配置体检</div>
            <div style={{ color: "#475569", fontSize: 13 }}>
              AppID {configuration.appIdConfigured ? "已配置" : "未配置"} · Secret {configuration.secretConfigured ? "已配置" : "未配置"} · 模板 {configuration.configuredCount}/{configuration.requiredCount}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {configuration.templates.map((item) => (
                <span key={item.key} style={{ border: `1px solid ${item.configured ? "#86efac" : "#fca5a5"}`, background: item.configured ? "#f0fdf4" : "#fef2f2", color: item.configured ? "#166534" : "#b91c1c", borderRadius: 6, padding: "5px 8px", fontSize: 12 }}>
                  {item.envKey}: {item.configured ? "已配置" : "缺少"}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {message ? <div style={{ color: message.includes("失败") ? "#b91c1c" : "#166534" }}>{message}</div> : null}
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 24, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", color: "#64748b" }}>
            当前没有通知记录。
          </div>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{row.templateKey}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  {row.eventType} · {row.status} · {row.scheduledAt}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {row.status !== "SKIPPED" ? (
                  <button type="button" onClick={() => patch(row.id, "skip")} style={buttonStyle}>跳过</button>
                ) : null}
                {row.status !== "PENDING" ? (
                  <button type="button" onClick={() => patch(row.id, "reset")} style={buttonStyle}>重置待发送</button>
                ) : null}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, fontSize: 13 }}>
              <div>
                <div style={{ color: "#64748b" }}>家长</div>
                <div style={{ fontWeight: 800 }}>{row.parent.name || row.parent.phone || row.parent.wechatOpenId || "-"}</div>
              </div>
              <div>
                <div style={{ color: "#64748b" }}>学生</div>
                <div style={{ fontWeight: 800 }}>{row.student ? `${row.student.name} · ${row.student.grade || "-"}` : "-"}</div>
              </div>
              <div>
                <div style={{ color: "#64748b" }}>目标</div>
                <div style={{ fontWeight: 800 }}>{row.targetType || "-"} / {row.targetId || "-"}</div>
              </div>
            </div>
            {row.error ? <div style={{ color: "#b91c1c", fontSize: 13 }}>错误/备注：{row.error}</div> : null}
          </div>
        ))}
      </section>
    </div>
  );
}
