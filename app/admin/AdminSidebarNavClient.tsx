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
        return (
          <details
            key={group.title}
            open={isActiveGroup}
            style={{
              padding: 12,
              borderRadius: 16,
              background: isActiveGroup ? "#ffffff" : "#f8fafc",
              border: `1px solid ${isActiveGroup ? "#bfdbfe" : "#e2e8f0"}`,
              boxShadow: isActiveGroup ? "0 8px 20px rgba(37, 99, 235, 0.08)" : "none",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                listStyle: "none",
                display: "grid",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: isActiveGroup ? "#1d4ed8" : "#334155",
                  letterSpacing: 0.2,
                }}
              >
                {group.title}
              </span>
              {group.summary ? (
                <span style={{ fontSize: 11, color: "#64748b", lineHeight: 1.35 }}>{group.summary}</span>
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
                      boxShadow: isActive ? "0 4px 12px rgba(15, 23, 42, 0.08)" : "none",
                    }}
                  >
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
