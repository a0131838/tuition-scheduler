import Link from "next/link";

const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 16,
  borderRadius: 12,
  border: "1px solid #dbe4f0",
  background: "#ffffff",
  textDecoration: "none",
  color: "#0f172a",
};

export default function AdminMobilePage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 14 }}>
      <section
        style={{
          border: "1px solid #bfdbfe",
          background: "#eff6ff",
          borderRadius: 16,
          padding: 18,
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 900 }}>MOBILE WORKBENCH</div>
        <h1 style={{ margin: 0, fontSize: 24 }}>员工移动端</h1>
        <div style={{ color: "#475569", fontSize: 13 }}>
          第一版先聚焦高频动作：家长请求、今日待办、通知队列。
        </div>
      </section>

      <Link href="/admin/mobile/parent-requests" style={cardStyle}>
        <strong>家长请求</strong>
        <span style={{ color: "#64748b", fontSize: 13 }}>查看投诉、反馈、给老师的话、排课、请假和财务问题。</span>
      </Link>
      <Link href="/admin/todos" style={cardStyle}>
        <strong>今日待办</strong>
        <span style={{ color: "#64748b", fontSize: 13 }}>点名、跟进、续费和修复队列。</span>
      </Link>
      <Link href="/admin/miniapp-notifications" style={cardStyle}>
        <strong>小程序通知</strong>
        <span style={{ color: "#64748b", fontSize: 13 }}>查看待发送提醒和失败记录。</span>
      </Link>
      <Link href="/admin/students" style={cardStyle}>
        <strong>学生搜索</strong>
        <span style={{ color: "#64748b", fontSize: 13 }}>进入学生详情并开通家长端。</span>
      </Link>
    </main>
  );
}
