"use client";

import { useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  bindings: Array<{ id: string; status: string; boundAt: string; wechatOpenId: string }>;
};

export default function MiniappStaffClient({ users }: { users: UserRow[] }) {
  const [message, setMessage] = useState("");
  const [activeInvite, setActiveInvite] = useState<{ token: string; path: string; userName: string } | null>(null);
  const [loadingId, setLoadingId] = useState("");

  async function createInvite(user: UserRow) {
    setLoadingId(user.id);
    setMessage("");
    try {
      const res = await fetch("/api/admin/miniapp-staff/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "生成失败");
      setActiveInvite({ token: data.invite.token, path: data.miniappPath, userName: user.name });
      setMessage("已生成员工小程序绑定码。");
    } catch (error: any) {
      setMessage(error?.message || "生成失败");
    } finally {
      setLoadingId("");
    }
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text).catch(() => null);
    setMessage("已复制。");
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid #dbe4f0", borderRadius: 12, background: "#fff", padding: 16 }}>
        <h2 style={{ margin: 0 }}>员工小程序</h2>
        <div style={{ marginTop: 8, color: "#64748b" }}>
          第一版用于员工绑定微信，并在小程序里处理家长请求。绑定码永久有效直到使用；重新生成会停用旧的未使用绑定码。
        </div>
        {message ? <div style={{ marginTop: 10, color: message.includes("失败") ? "#b91c1c" : "#166534" }}>{message}</div> : null}
        {activeInvite ? (
          <div style={{ marginTop: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
            <b>{activeInvite.userName} 的绑定码</b>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>{activeInvite.token}</div>
            <div style={{ color: "#64748b", wordBreak: "break-all" }}>小程序路径：{activeInvite.path}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => copy(activeInvite.token)} style={buttonStyle}>复制绑定码</button>
              <button type="button" onClick={() => copy(activeInvite.path)} style={buttonStyle}>复制小程序路径</button>
            </div>
          </div>
        ) : null}
      </section>

      <section style={{ border: "1px solid #dbe4f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
        <table cellPadding={10} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th align="left">员工</th>
              <th align="left">角色</th>
              <th align="left">微信绑定</th>
              <th align="left">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const binding = user.bindings.find((x) => x.status === "ACTIVE") || user.bindings[0];
              return (
                <tr key={user.id} style={{ borderTop: "1px solid #edf2f7" }}>
                  <td>
                    <b>{user.name}</b>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{user.email}</div>
                  </td>
                  <td>{user.role}</td>
                  <td>{binding ? `已绑定 ${binding.boundAt.slice(0, 10)}` : "未绑定"}</td>
                  <td>
                    <button type="button" disabled={Boolean(loadingId)} onClick={() => createInvite(user)} style={buttonStyle}>
                      {loadingId === user.id ? "生成中" : "生成绑定码"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 800,
  cursor: "pointer",
};
