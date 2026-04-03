import React from "react";

export default function TeacherWorkspaceHero({
  title,
  subtitle,
  actions = [],
  collapseGuide = true,
}: {
  title: string;
  subtitle: string;
  actions?: Array<{ href: string; label: string }>;
  collapseGuide?: boolean;
}) {
  return (
    <section
      className="teacher-workspace-hero"
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
      <div className="teacher-workspace-hero__header">
        <div className="teacher-workspace-hero__content">
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, color: "#0f172a" }}>{title}</h1>
          {collapseGuide ? (
            <details style={{ marginTop: 8, maxWidth: 720 }}>
              <summary style={{ cursor: "pointer", color: "#475569", fontWeight: 700 }}>
                Quick guide / 快速说明
              </summary>
              <div style={{ color: "#475569", marginTop: 8 }}>{subtitle}</div>
            </details>
          ) : (
            <div style={{ color: "#475569", marginTop: 6, maxWidth: 720 }}>{subtitle}</div>
          )}
        </div>
        {actions.length ? (
          <div className="teacher-workspace-hero__actions">
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
