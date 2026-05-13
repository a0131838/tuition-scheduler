"use client";

export default function ManagerQualityPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        border: "1px solid #2563eb",
        background: "#2563eb",
        color: "#ffffff",
        borderRadius: 8,
        padding: "10px 14px",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      Print Lead Desk / 打印 Lead Desk
    </button>
  );
}
