import React from "react";

export default function TeacherWorkspaceHero({
  title,
  subtitle,
  actions = [],
}: {
  title: string;
  subtitle: string;
  actions?: Array<{ href: string; label: string }>;
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        padding: 18,
        borderRadius: 18,
        background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
        border: "1px solid #bfdbfe",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, color: "#0f172a" }}>{title}</h1>
          <div style={{ color: "#475569", marginTop: 6, maxWidth: 720 }}>{subtitle}</div>
        </div>
        {actions.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {actions.map((action) => (
              <a
                key={action.href}
                href={action.href}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  textDecoration: "none",
                  background: "#ffffff",
                  border: "1px solid #dbeafe",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
