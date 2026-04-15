import type { CSSProperties, ReactNode } from "react";

type WorkflowSourceBannerTone = "blue" | "indigo" | "amber" | "emerald";

const toneStyles: Record<WorkflowSourceBannerTone, { border: string; background: string; color: string; muted: string }> = {
  blue: { border: "#bfdbfe", background: "#eff6ff", color: "#1e3a8a", muted: "#1d4ed8" },
  indigo: { border: "#c7d2fe", background: "#eef2ff", color: "#3730a3", muted: "#4338ca" },
  amber: { border: "#fde68a", background: "#fffbeb", color: "#92400e", muted: "#a16207" },
  emerald: { border: "#86efac", background: "#f0fdf4", color: "#166534", muted: "#15803d" },
};

export default function WorkflowSourceBanner({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryActions,
  meta,
  tone = "blue",
  style,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryActions?: ReactNode;
  meta?: ReactNode;
  tone?: WorkflowSourceBannerTone;
  style?: CSSProperties;
}) {
  const colors = toneStyles[tone];

  return (
    <div
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.color,
        display: "flex",
        gap: 10,
        justifyContent: "space-between",
        flexWrap: "wrap",
        alignItems: "center",
        ...style,
      }}
    >
      <div style={{ display: "grid", gap: 4, minWidth: 240, flex: "1 1 360px" }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.45 }}>{description}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
        {meta}
        <a href={primaryHref} style={{ fontWeight: 700 }}>
          {primaryLabel}
        </a>
        {secondaryActions}
      </div>
    </div>
  );
}
