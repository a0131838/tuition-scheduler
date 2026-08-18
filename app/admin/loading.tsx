export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: 320,
        display: "grid",
        alignContent: "start",
        gap: 16,
        padding: "28px 24px",
      }}
    >
      <div style={{ color: "#047857", fontSize: 13, fontWeight: 850 }}>正在读取最新数据</div>
      <div style={{ height: 28, width: "42%", maxWidth: 360, borderRadius: 10, background: "#e2e8f0" }} />
      <div style={{ height: 88, borderRadius: 18, background: "#f1f5f9", border: "1px solid #e2e8f0" }} />
      <div style={{ height: 160, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }} />
      <span style={{ color: "#64748b", fontSize: 13 }}>页面正在加载，请勿重复点击。</span>
    </div>
  );
}
