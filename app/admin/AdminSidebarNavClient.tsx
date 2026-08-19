"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  tone?: NavTone;
};

export type AdminNavGroup = {
  title: string;
  summary?: string;
  items: AdminNavItem[];
};

const OPEN_GROUP_KEY = "sgt-admin-nav-open-group-v1";
const FAVORITES_KEY = "sgt-admin-nav-favorites-v1";
const FAVORITES_LIMIT = 4;

function navPath(href: string) {
  return href.split("?")[0] || href;
}

function isNavItemActive(pathname: string, href: string) {
  const target = navPath(href);
  if (target === "/admin") return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
}

function groupStyles(title: string, isActiveGroup: boolean) {
  if (title.includes("Today") || title.includes("今日")) {
    return { background: "#f7fbff", borderColor: isActiveGroup ? "#93c5fd" : "#dbeafe", accent: "#1d4ed8" };
  }
  if (title.includes("Teaching") || title.includes("教学")) {
    return { background: "#f3fdf8", borderColor: isActiveGroup ? "#6ee7b7" : "#d1fae5", accent: "#0f766e" };
  }
  if (title.includes("Parent") || title.includes("家长")) {
    return { background: "#fffaf2", borderColor: isActiveGroup ? "#fdba74" : "#ffedd5", accent: "#9a3412" };
  }
  if (title.includes("People") || title.includes("人员")) {
    return { background: "#f8f7ff", borderColor: isActiveGroup ? "#c4b5fd" : "#ede9fe", accent: "#6d28d9" };
  }
  if (title.includes("Finance") || title.includes("财务")) {
    return { background: "#fff8f1", borderColor: isActiveGroup ? "#fb923c" : "#fed7aa", accent: "#9a3412" };
  }
  return { background: "#f8fafc", borderColor: isActiveGroup ? "#94a3b8" : "#e2e8f0", accent: "#475569" };
}

function toneStyles(tone: NavTone, isActive: boolean) {
  if (tone === "danger") return { background: isActive ? "#fff1f2" : "#ffffff", borderColor: "#fecdd3", color: "#9f1239" };
  if (tone === "warning") return { background: isActive ? "#fff7ed" : "#ffffff", borderColor: "#fed7aa", color: "#9a3412" };
  if (tone === "success") return { background: isActive ? "#ecfdf5" : "#ffffff", borderColor: "#bbf7d0", color: "#166534" };
  if (tone === "accent") return { background: isActive ? "#eef2ff" : "#ffffff", borderColor: "#c7d2fe", color: "#3730a3" };
  return { background: isActive ? "#eff6ff" : "#ffffff", borderColor: isActive ? "#93c5fd" : "#e2e8f0", color: isActive ? "#1d4ed8" : "#0f172a" };
}

function NavRow({
  item,
  pathname,
  isFavorite,
  onToggleFavorite,
  pinLabel,
  unpinLabel,
}: {
  item: AdminNavItem;
  pathname: string;
  isFavorite: boolean;
  onToggleFavorite: (href: string) => void;
  pinLabel: string;
  unpinLabel: string;
}) {
  const isActive = isNavItemActive(pathname, item.href);
  const tone = toneStyles(item.tone ?? "neutral", isActive);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 30px", gap: 5, minHeight: 36 }}>
      <Link
        scroll={false}
        href={item.href}
        title={item.description || item.label}
        style={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          padding: "8px 9px",
          borderRadius: 7,
          textDecoration: "none",
          border: `1px solid ${tone.borderColor}`,
          background: tone.background,
          color: tone.color,
          fontWeight: isActive ? 800 : 650,
          lineHeight: 1.25,
          boxShadow: isActive ? "inset 3px 0 0 currentColor" : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
      </Link>
      <button
        type="button"
        title={isFavorite ? unpinLabel : pinLabel}
        aria-label={isFavorite ? unpinLabel : pinLabel}
        onClick={() => onToggleFavorite(item.href)}
        style={{
          width: 30,
          height: 36,
          padding: 0,
          borderRadius: 7,
          border: `1px solid ${isFavorite ? "#fbbf24" : "#e2e8f0"}`,
          background: isFavorite ? "#fffbeb" : "#ffffff",
          color: isFavorite ? "#a16207" : "#64748b",
          cursor: "pointer",
          fontSize: 17,
          lineHeight: 1,
        }}
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}

export default function AdminSidebarNavClient({
  groups,
  searchPlaceholder = "Search menu / 搜索菜单",
  favoritesTitle = "Favorites / 常用入口",
  pinLabel = "Pin to favorites / 固定到常用",
  unpinLabel = "Remove from favorites / 从常用移除",
  favoriteLimitLabel = "Up to 4 favorites / 最多固定 4 个入口",
  noResultsLabel = "No matching menu items / 没有匹配的菜单",
}: {
  groups: AdminNavGroup[];
  searchPlaceholder?: string;
  favoritesTitle?: string;
  pinLabel?: string;
  unpinLabel?: string;
  favoriteLimitLabel?: string;
  noResultsLabel?: string;
}) {
  const pathname = usePathname();
  const activeGroup = groups.find((group) => group.items.some((item) => isNavItemActive(pathname, item.href)))?.title;
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState(activeGroup || groups[0]?.title || "");
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);

  const itemByHref = useMemo(() => {
    const map = new Map<string, AdminNavItem>();
    groups.forEach((group) => group.items.forEach((item) => {
      if (!map.has(item.href)) map.set(item.href, item);
    }));
    return map;
  }, [groups]);

  useEffect(() => {
    const validTitles = new Set(groups.map((group) => group.title));
    const remembered = window.localStorage.getItem(OPEN_GROUP_KEY);
    const validRemembered = remembered && validTitles.has(remembered) ? remembered : "";
    setOpenGroup(pathname === "/admin" ? validRemembered || activeGroup || groups[0]?.title || "" : activeGroup || validRemembered || groups[0]?.title || "");

    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]");
      if (Array.isArray(stored)) {
        setFavoriteHrefs(stored.filter((href): href is string => typeof href === "string" && itemByHref.has(href)).slice(0, FAVORITES_LIMIT));
      }
    } catch {
      setFavoriteHrefs([]);
    }
  }, [activeGroup, groups, itemByHref, pathname]);

  const favoriteItems = favoriteHrefs.map((href) => itemByHref.get(href)).filter((item): item is AdminNavItem => Boolean(item));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleGroups = normalizedQuery
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => `${item.label} ${item.description || ""} ${item.href}`.toLocaleLowerCase().includes(normalizedQuery)),
        }))
        .filter((group) => group.items.length > 0)
    : groups;

  function toggleFavorite(href: string) {
    setFavoriteHrefs((current) => {
      const next = current.includes(href)
        ? current.filter((item) => item !== href)
        : current.length < FAVORITES_LIMIT
          ? [...current, href]
          : current;
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleGroup(title: string) {
    const next = openGroup === title ? "" : title;
    setOpenGroup(next);
    if (next) window.localStorage.setItem(OPEN_GROUP_KEY, next);
  }

  return (
    <nav aria-label="Admin navigation" style={{ display: "grid", gap: 9 }}>
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
          color: "#0f172a",
        }}
      />

      {!normalizedQuery && favoriteItems.length > 0 ? (
        <section style={{ padding: 9, borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb" }}>
          <div style={{ marginBottom: 7, fontWeight: 800, color: "#92400e" }}>{favoritesTitle}</div>
          <div style={{ display: "grid", gap: 5 }}>
            {favoriteItems.map((item) => (
              <NavRow
                key={`favorite-${item.href}`}
                item={item}
                pathname={pathname}
                isFavorite
                onToggleFavorite={toggleFavorite}
                pinLabel={pinLabel}
                unpinLabel={unpinLabel}
              />
            ))}
          </div>
          <div style={{ marginTop: 6, color: "#78716c", fontSize: 10.5 }}>{favoriteLimitLabel}</div>
        </section>
      ) : null}

      {visibleGroups.length === 0 ? (
        <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", color: "#64748b", background: "#ffffff" }}>
          {noResultsLabel}
        </div>
      ) : null}

      {visibleGroups.map((group) => {
        const isActiveGroup = group.items.some((item) => isNavItemActive(pathname, item.href));
        const isOpen = Boolean(normalizedQuery) || openGroup === group.title;
        const groupTone = groupStyles(group.title, isActiveGroup);

        return (
          <section
            key={group.title}
            style={{
              borderRadius: 8,
              background: groupTone.background,
              border: `1px solid ${groupTone.borderColor}`,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={isOpen}
              title={group.summary || group.title}
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
                color: groupTone.accent,
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 800,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 13 }}>{isOpen ? "▾" : "▸"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{group.title}</span>
              <span style={{ minWidth: 24, textAlign: "right", fontSize: 11, color: "#64748b" }}>{group.items.length}</span>
            </button>
            {isOpen ? (
              <div style={{ display: "grid", gap: 5, padding: "0 8px 8px" }}>
                {group.items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    isFavorite={favoriteHrefs.includes(item.href)}
                    onToggleFavorite={toggleFavorite}
                    pinLabel={pinLabel}
                    unpinLabel={unpinLabel}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
