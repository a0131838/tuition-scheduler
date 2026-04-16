import type { CSSProperties, ReactNode } from "react";

type WorkbenchStatusTone = "neutral" | "info" | "success" | "warn" | "error" | "accent";

const toneStyles: Record<
  WorkbenchStatusTone,
  { border: string; background: string; text: string }
> = {
  neutral: { border: "#cbd5e1", background: "#f8fafc", text: "#334155" },
  info: { border: "#93c5fd", background: "#eff6ff", text: "#1d4ed8" },
  success: { border: "#86efac", background: "#f0fdf4", text: "#166534" },
  warn: { border: "#fcd34d", background: "#fffbeb", text: "#92400e" },
  error: { border: "#fca5a5", background: "#fef2f2", text: "#b91c1c" },
  accent: { border: "#c4b5fd", background: "#f5f3ff", text: "#6d28d9" },
};

export default function WorkbenchStatusChip({
  label,
  tone = "neutral",
  detail,
  strong = false,
  style,
}: {
  label: ReactNode;
  tone?: WorkbenchStatusTone;
  detail?: ReactNode;
  strong?: boolean;
  style?: CSSProperties;
}) {
  const colors = toneStyles[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 26,
        width: "fit-content",
        maxWidth: "100%",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.text,
        fontSize: 12,
        fontWeight: strong ? 800 : 700,
        lineHeight: 1.25,
        ...style,
      }}
    >
      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</span>
      {detail ? (
        <span style={{ fontWeight: 600, opacity: 0.85, whiteSpace: "nowrap" }}>
          {detail}
        </span>
      ) : null}
    </span>
  );
}
