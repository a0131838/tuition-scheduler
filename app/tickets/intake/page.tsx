export default function IntakeGuardPage() {
  return (
    <div style={{ maxWidth: 760, margin: "24px auto", padding: "0 12px" }}>
      <h2>工单录入链接无效 / Intake Link Invalid</h2>
      <div style={{ color: "#334155", lineHeight: 1.6 }}>
        当前页面不接受直接录入。请使用带 token 的专用链接。
      </div>
      <div style={{ color: "#334155", lineHeight: 1.6 }}>
        This page does not accept direct intake. Please use the tokenized intake link.
      </div>
    </div>
  );
}

