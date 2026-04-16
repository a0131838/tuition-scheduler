"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavTone = "neutral" | "accent" | "success" | "warning" | "danger";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  tone?: NavTone;
};

type NavGroup = {
  title: string;
  summary?: string;
  items: NavItem[];
};

function groupStyles(title: string, isActiveGroup: boolean) {
  if (title.includes("Today") || title.includes("今天")) {
    return isActiveGroup
      ? { background: "#eef5ff", borderColor: "#7fb3ff", accent: "#1d4ed8", summary: "#475569" }
      : { background: "#f7fbff", borderColor: "#cfe3ff", accent: "#2563eb", summary: "#64748b" };
  }
  if (title.includes("Core") || title.includes("核心")) {
    return isActiveGroup
      ? { background: "#ecfdf5", borderColor: "#34d399", accent: "#0f766e", summary: "#0f766e" }
      : { background: "#f3fdf8", borderColor: "#a7f3d0", accent: "#0f766e", summary: "#64748b" };
  }
  if (title.includes("Finance") || title.includes("财务")) {
    return isActiveGroup
      ? { background: "#fff7ed", borderColor: "#f7b267", accent: "#9a3412", summary: "#7c2d12" }
      : { background: "#fffaf4", borderColor: "#ffd6a3", accent: "#b45309", summary: "#9a3412" };
  }
  if (title.includes("Setup") || title.includes("配置")) {
    return isActiveGroup
      ? { background: "#faf5ff", borderColor: "#b8a2ff", accent: "#7c3aed", summary: "#6d28d9" }
      : { background: "#fdfbff", borderColor: "#ddd6fe", accent: "#8b5cf6", summary: "#6b7280" };
  }
  if (title.includes("Reports") || title.includes("报表")) {
    return isActiveGroup
      ? { background: "#f3f6fa", borderColor: "#b8c4d4", accent: "#475569", summary: "#64748b" }
      : { background: "#f9fbfd", borderColor: "#d5dee9", accent: "#64748b", summary: "#94a3b8" };
  }
  return isActiveGroup
    ? { background: "#ffffff", borderColor: "#bfdbfe", accent: "#1d4ed8", summary: "#475569" }
    : { background: "#f8fafc", borderColor: "#e2e8f0", accent: "#334155", summary: "#64748b" };
}

function toneStyles(tone: NavTone, isActive: boolean) {
  if (tone === "danger") {
    return isActive
      ? { background: "#fff1f2", borderColor: "#fda4af", color: "#9f1239" }
      : { background: "#fffafb", borderColor: "#fecdd3", color: "#9f1239" };
  }
  if (tone === "warning") {
    return isActive
      ? { background: "#fff7ed", borderColor: "#fdba74", color: "#9a3412" }
      : { background: "#fffbeb", borderColor: "#fed7aa", color: "#9a3412" };
  }
  if (tone === "success") {
    return isActive
      ? { background: "#ecfdf5", borderColor: "#86efac", color: "#166534" }
      : { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" };
  }
  if (tone === "accent") {
    return isActive
      ? { background: "#eef2ff", borderColor: "#a5b4fc", color: "#3730a3" }
      : { background: "#f8faff", borderColor: "#c7d2fe", color: "#3730a3" };
  }
  return isActive
    ? { background: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" }
    : { background: "#f8fafc", borderColor: "#dbeafe", color: "#0f172a" };
}

export default function AdminSidebarNavClient({
  groups,
}: {
  groups: NavGroup[];
}) {
  const pathname = usePathname();

  return (
    <nav style={{ display: "grid", gap: 12 }}>
      {groups.map((group) => {
        const isActiveGroup = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
        const groupTone = groupStyles(group.title, isActiveGroup);
        return (
          <details
            key={group.title}
            open={isActiveGroup}
            style={{
              padding: 12,
              borderRadius: 18,
              background: groupTone.background,
              border: `1px solid ${groupTone.borderColor}`,
              boxShadow: isActiveGroup ? "0 10px 24px rgba(15, 23, 42, 0.08)" : "0 2px 8px rgba(15, 23, 42, 0.03)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: isActiveGroup ? 6 : 4,
                background: isActiveGroup ? groupTone.accent : "transparent",
              }}
            />
            <summary
              style={{
                cursor: "pointer",
                listStyle: "none",
                display: "grid",
                gap: 5,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: groupTone.accent,
                  letterSpacing: 0.25,
                  textTransform: "uppercase",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: groupTone.accent,
                    boxShadow: isActiveGroup ? `0 0 0 4px ${groupTone.borderColor}` : "none",
                    flexShrink: 0,
                  }}
                />
                {group.title}
              </span>
              {group.summary ? (
                <span style={{ fontSize: 10.5, color: groupTone.summary, lineHeight: 1.35 }}>{group.summary}</span>
              ) : null}
            </summary>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const tone = toneStyles(item.tone ?? "neutral", isActive);
                return (
                  <Link
                    key={item.href}
                    scroll={false}
                    href={item.href}
                    style={{
                      display: "grid",
                      gap: item.description ? 4 : 0,
                      padding: "11px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      border: `1px solid ${tone.borderColor}`,
                      background: tone.background,
                      color: tone.color,
                      boxShadow: isActive ? "0 6px 14px rgba(15, 23, 42, 0.08)" : "none",
                      position: "relative",
                      paddingLeft: isActive ? 16 : 12,
                    }}
                  >
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 4,
                          borderRadius: 999,
                          background: tone.color,
                        }}
                      />
                    ) : null}
                    <span style={{ fontWeight: 700, lineHeight: 1.25 }}>{item.label}</span>
                    {item.description ? (
                      <span style={{ fontSize: 11, lineHeight: 1.35, color: isActive ? tone.color : "#64748b" }}>
                        {item.description}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
