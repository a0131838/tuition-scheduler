"use client";

import { useEffect, useState } from "react";

type Invite = {
  id: string;
  token: string;
  miniappPath: string;
  isActive: boolean;
  usedAt: string | null;
  createdAt: string;
};

type ParentLink = {
  id: string;
  relationship: string | null;
  isPrimary: boolean;
  permissions: {
    canViewSchedule: boolean;
    canViewFeedback: boolean;
    canViewFinance: boolean;
    canViewReports: boolean;
    canCreateRequests: boolean;
  };
  parent: {
    name: string | null;
    phone: string | null;
    phoneCountry: string | null;
    wechatOpenId: string | null;
    status: string;
  };
};

const permissionLabels: Array<[keyof ParentLink["permissions"], string]> = [
  ["canViewSchedule", "课表"],
  ["canViewFeedback", "反馈"],
  ["canViewFinance", "财务"],
  ["canViewReports", "报告"],
  ["canCreateRequests", "请求"],
];

const buttonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  borderRadius: 8,
  padding: "7px 10px",
  fontWeight: 800,
  cursor: "pointer",
};

export default function ParentPortalCardClient({ studentId }: { studentId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [inviteRes, linkRes] = await Promise.all([
        fetch(`/api/admin/students/${studentId}/parent-portal/invites`, { cache: "no-store" }),
        fetch(`/api/admin/students/${studentId}/parent-portal/links`, { cache: "no-store" }),
      ]);
      const inviteData = await inviteRes.json();
      const linkData = await linkRes.json();
      if (!inviteRes.ok || inviteData.ok === false) throw new Error(inviteData.message || "加载邀请码失败");
      if (!linkRes.ok || linkData.ok === false) throw new Error(linkData.message || "加载绑定家长失败");
      setInvites(inviteData.invites || []);
      setLinks(linkData.links || []);
    } catch (error: any) {
      setMessage(error?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [studentId]);

  async function createInvite() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parent-portal/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deactivateOld: true }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "生成邀请码失败");
      setInvites([data.invite, ...invites]);
      setMessage("已生成新的家长绑定邀请码。");
    } catch (error: any) {
      setMessage(error?.message || "生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("已复制。");
    } catch {
      setMessage("复制失败，请手动复制。");
    }
  }

  async function patchLink(link: ParentLink, payload: Record<string, unknown>) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parent-portal/links/${link.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.message || "保存失败");
      await load();
      setMessage("权限已更新。");
    } catch (error: any) {
      setMessage(error?.message || "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function removeLink(link: ParentLink) {
    if (!window.confirm("确认解除这个家长绑定？")) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/students/${studentId}/parent-portal/links/${link.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || "解除绑定失败");
      setLinks(links.filter((item) => item.id !== link.id));
      setMessage("已解除绑定。");
    } catch (error: any) {
      setMessage(error?.message || "解除绑定失败");
    } finally {
      setLoading(false);
    }
  }

  const activeInvite = invites.find((item) => item.isActive && !item.usedAt) || null;

  return (
    <section
      id="parent-portal"
      style={{
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>家长端开通</div>
          <div style={{ color: "#475569", fontSize: 12 }}>
            生成小程序绑定邀请码，查看家长绑定，并控制课表、反馈、财务、报告和请求权限。
          </div>
        </div>
        <button type="button" onClick={createInvite} disabled={loading} style={{ ...buttonStyle, background: "#123524", color: "#fff", borderColor: "#123524" }}>
          生成邀请码
        </button>
      </div>

      {message ? <div style={{ color: message.includes("失败") ? "#b91c1c" : "#166534", fontSize: 13 }}>{message}</div> : null}

      <div style={{ border: "1px solid #dcfce7", background: "#fff", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>当前邀请码</div>
        {activeInvite ? (
          <div style={{ display: "grid", gap: 8 }}>
            <code style={{ wordBreak: "break-all", background: "#f8fafc", padding: 8, borderRadius: 8 }}>{activeInvite.token}</code>
            <div style={{ color: "#64748b", fontSize: 12, wordBreak: "break-all" }}>小程序路径：{activeInvite.miniappPath}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => copy(activeInvite.token)} style={buttonStyle}>复制邀请码</button>
              <button type="button" onClick={() => copy(activeInvite.miniappPath)} style={buttonStyle}>复制小程序路径</button>
            </div>
          </div>
        ) : (
          <div style={{ color: "#64748b" }}>暂无可用邀请码。</div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>已绑定家长 ({links.length})</div>
        {links.length === 0 ? <div style={{ color: "#64748b" }}>还没有家长绑定。</div> : null}
        {links.map((link) => (
          <div key={link.id} style={{ border: "1px solid #dcfce7", background: "#fff", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 850 }}>{link.parent.name || link.parent.phone || "未填写姓名"}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  {link.relationship || "关系未填"} · {link.parent.phoneCountry || ""} {link.parent.phone || "电话未填"} · {link.parent.status}
                </div>
              </div>
              <button type="button" onClick={() => removeLink(link)} style={{ ...buttonStyle, color: "#b91c1c" }}>解除绑定</button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {permissionLabels.map(([key, label]) => (
                <label key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={link.permissions[key]}
                    onChange={(event) => patchLink(link, { [key]: event.currentTarget.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
