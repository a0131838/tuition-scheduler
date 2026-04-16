import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

type WorkbenchActionBannerTone = "info" | "success" | "warn" | "error";

export type WorkbenchActionLink = {
  href: string;
  label: string;
  emphasis?: "primary" | "secondary";
};

const toneStyles: Record<
  WorkbenchActionBannerTone,
  { border: string; background: string; title: string; body: string; primary: string; primaryBorder: string }
> = {
  info: {
    border: "#bfdbfe",
    background: "#eff6ff",
    title: "#1d4ed8",
    body: "#334155",
    primary: "#2563eb",
    primaryBorder: "#1d4ed8",
  },
  success: {
    border: "#86efac",
    background: "#f0fdf4",
    title: "#166534",
    body: "#166534",
    primary: "#15803d",
    primaryBorder: "#166534",
  },
  warn: {
    border: "#fcd34d",
    background: "#fffbeb",
    title: "#92400e",
    body: "#92400e",
    primary: "#b45309",
    primaryBorder: "#92400e",
  },
  error: {
    border: "#fca5a5",
    background: "#fef2f2",
    title: "#b91c1c",
    body: "#991b1b",
    primary: "#dc2626",
    primaryBorder: "#b91c1c",
  },
};

function renderAction(link: WorkbenchActionLink, colors: (typeof toneStyles)[WorkbenchActionBannerTone]) {
  const isPrimary = link.emphasis === "primary";
  const style: CSSProperties = isPrimary
    ? {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: 999,
        fontWeight: 700,
        border: `1px solid ${colors.primaryBorder}`,
        background: colors.primary,
        color: "#ffffff",
      }
    : {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: 999,
        fontWeight: 700,
        border: `1px solid ${colors.border}`,
        background: "#ffffff",
        color: colors.title,
      };

  if (link.href.startsWith("/")) {
    return (
      <Link key={`${link.href}:${link.label}`} href={link.href} scroll={false} style={style}>
        {link.label}
      </Link>
    );
  }

  return (
    <a key={`${link.href}:${link.label}`} href={link.href} style={style}>
      {link.label}
    </a>
  );
}

export default function WorkbenchActionBanner({
  title,
  description,
  tone = "info",
  actions,
  meta,
  style,
}: {
  title: string;
  description?: ReactNode;
  tone?: WorkbenchActionBannerTone;
  actions?: Array<WorkbenchActionLink | null | false | undefined>;
  meta?: ReactNode;
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
        display: "flex",
        gap: 12,
        justifyContent: "space-between",
        flexWrap: "wrap",
        alignItems: "center",
        ...style,
      }}
    >
      <div style={{ display: "grid", gap: 4, minWidth: 240, flex: "1 1 320px" }}>
        <div style={{ fontWeight: 800, color: colors.title }}>{title}</div>
        {description ? <div style={{ fontSize: 13, lineHeight: 1.5, color: colors.body }}>{description}</div> : null}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
        {meta}
        {actions?.filter((link): link is WorkbenchActionLink => Boolean(link)).map((link) => renderAction(link, colors))}
      </div>
    </div>
  );
}
