import type { CSSProperties, ReactNode } from "react";

type WorkbenchFormSectionTone = "default" | "info" | "warn" | "success";

const sectionToneStyles: Record<
  WorkbenchFormSectionTone,
  { border: string; background: string; title: string; body: string }
> = {
  default: { border: "#dbe4f0", background: "#ffffff", title: "#0f172a", body: "#475569" },
  info: { border: "#bfdbfe", background: "#f8fbff", title: "#1d4ed8", body: "#475569" },
  warn: { border: "#fcd34d", background: "#fffbeb", title: "#92400e", body: "#78350f" },
  success: { border: "#86efac", background: "#f0fdf4", title: "#166534", body: "#166534" },
};

export default function WorkbenchFormSection({
  title,
  description,
  helper,
  aside,
  tone = "default",
  style,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  helper?: ReactNode;
  aside?: ReactNode;
  tone?: WorkbenchFormSectionTone;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const colors = sectionToneStyles[tone];

  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        background: colors.background,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4, minWidth: 240, flex: "1 1 320px" }}>
          <div style={{ fontWeight: 800, color: colors.title }}>{title}</div>
          {description ? (
            <div style={{ color: colors.body, fontSize: 13, lineHeight: 1.5 }}>{description}</div>
          ) : null}
          {helper ? (
            <div
              style={{
                width: "fit-content",
                maxWidth: "100%",
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${colors.border}`,
                background: "#ffffff",
                color: colors.body,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {helper}
            </div>
          ) : null}
        </div>
        {aside ? <div style={{ flex: "0 0 auto" }}>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
