"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const OPEN_GROUP_KEY = "sgt-teacher-nav-open-group-v1";

function isActive(pathname: string, href: string) {
  if (href === "/teacher") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TeacherSidebarNavClient({
  groups,
  searchPlaceholder = "Search menu / 搜索菜单",
  noResultsLabel = "No matching menu items / 没有匹配的菜单",
}: {
  groups: NavGroup[];
  searchPlaceholder?: string;
  noResultsLabel?: string;
}) {
  const pathname = usePathname();
  const activeGroup = groups.find((group) => group.items.some((item) => isActive(pathname, item.href)))?.title;
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState(activeGroup || groups[0]?.title || "");

  useEffect(() => {
    const validTitles = new Set(groups.map((group) => group.title));
    const remembered = window.localStorage.getItem(OPEN_GROUP_KEY);
    const validRemembered = remembered && validTitles.has(remembered) ? remembered : "";
    setOpenGroup(pathname === "/teacher" ? validRemembered || activeGroup || groups[0]?.title || "" : activeGroup || validRemembered || groups[0]?.title || "");
  }, [activeGroup, groups, pathname]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleGroups = normalizedQuery
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => `${item.label} ${item.href}`.toLocaleLowerCase().includes(normalizedQuery)),
        }))
        .filter((group) => group.items.length > 0)
    : groups;

  function toggleGroup(title: string) {
    const next = openGroup === title ? "" : title;
    setOpenGroup(next);
    if (next) window.localStorage.setItem(OPEN_GROUP_KEY, next);
  }

  return (
    <nav aria-label="Teacher navigation" style={{ display: "grid", gap: 9 }}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        style={{
          width: "100%",
          minWidth: 0,
          height: 38,
          padding: "8px 10px",
          borderRadius: 7,
          border: "1px solid #cbd5e1",
          background: "#ffffff",
        }}
      />

      {visibleGroups.length === 0 ? (
        <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", color: "#64748b", background: "#ffffff" }}>
          {noResultsLabel}
        </div>
      ) : null}

      {visibleGroups.map((group) => {
        const isActiveGroup = group.items.some((item) => isActive(pathname, item.href));
        const isOpen = Boolean(normalizedQuery) || openGroup === group.title;
        return (
          <section
            key={group.title}
            style={{
              borderRadius: 8,
              background: isActiveGroup ? "#f7fbff" : "#f8fafc",
              border: `1px solid ${isActiveGroup ? "#93c5fd" : "#e2e8f0"}`,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                minHeight: 38,
                display: "grid",
                gridTemplateColumns: "18px minmax(0, 1fr) auto",
                alignItems: "center",
                gap: 6,
                padding: "8px 9px",
                border: 0,
                background: "transparent",
                color: isActiveGroup ? "#1d4ed8" : "#475569",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 800,
              }}
            >
              <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{group.title}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{group.items.length}</span>
            </button>
            {isOpen ? (
              <div style={{ display: "grid", gap: 5, padding: "0 8px 8px" }}>
                {group.items.map((item) => {
                  const itemIsActive = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      scroll={false}
                      href={item.href}
                      style={{
                        minHeight: 36,
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 9px",
                        borderRadius: 7,
                        background: itemIsActive ? "#eff6ff" : "#ffffff",
                        border: `1px solid ${itemIsActive ? "#93c5fd" : "#e2e8f0"}`,
                        color: itemIsActive ? "#1d4ed8" : "#0f172a",
                        textDecoration: "none",
                        fontWeight: itemIsActive ? 800 : 650,
                        boxShadow: itemIsActive ? "inset 3px 0 0 currentColor" : "none",
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
