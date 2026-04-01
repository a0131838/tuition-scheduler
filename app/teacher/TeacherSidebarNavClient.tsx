"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

export default function TeacherSidebarNavClient({
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
              padding: 10,
              borderRadius: 14,
              background: "#ffffff",
              border: `1px solid ${isActiveGroup ? "#bfdbfe" : "#e2e8f0"}`,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 800,
                color: isActiveGroup ? "#1d4ed8" : "#475569",
                letterSpacing: 0.2,
                listStyle: "none",
              }}
            >
              {group.title}
            </summary>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    scroll={false}
                    href={item.href}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: isActive ? "#eff6ff" : "#f8fafc",
                      border: `1px solid ${isActive ? "#93c5fd" : "#dbeafe"}`,
                      color: isActive ? "#1d4ed8" : "#0f172a",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
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
