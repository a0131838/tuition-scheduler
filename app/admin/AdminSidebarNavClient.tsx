"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { activeAdminNavHref, type AdminNavGroup, type AdminNavItem } from "@/lib/admin-navigation";
import styles from "./sidebar-navigation.module.css";
export type { AdminNavGroup, AdminNavItem } from "@/lib/admin-navigation";

const OPEN_GROUP_KEY = "sgt-admin-nav-open-group-v1";
const FAVORITES_KEY = "sgt-admin-nav-favorites-v1";
const FAVORITES_LIMIT = 4;

function NavRow({
  item,
  activeHref,
  isFavorite,
  onToggleFavorite,
  pinLabel,
  unpinLabel,
}: {
  item: AdminNavItem;
  activeHref?: string;
  isFavorite: boolean;
  onToggleFavorite: (href: string) => void;
  pinLabel: string;
  unpinLabel: string;
}) {
  const isActive = activeHref === item.href;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 30px", gap: 5, minHeight: 36 }}>
      <Link
        scroll={false}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        title={item.description || item.label}
        className={styles.link}
      >
        <span className={styles.label}>{item.label}</span>
        {isActive ? <span className={styles.currentMark} aria-hidden="true">✓</span> : null}
      </Link>
      <button
        type="button"
        title={isFavorite ? unpinLabel : pinLabel}
        aria-label={isFavorite ? unpinLabel : pinLabel}
        className={styles.favorite}
        onClick={() => onToggleFavorite(item.href)}
        style={{
          width: 30,
          height: 36,
          padding: 0,
          borderRadius: 7,
          border: "1px solid transparent",
          background: isFavorite ? "#fff7df" : "transparent",
          color: isFavorite ? "#8a5800" : "#68786e",
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
  moreLabel = "More tools & records / 更多工具与记录",
  navigationLabel = "Workspace navigation / 工作区导航",
}: {
  groups: AdminNavGroup[];
  searchPlaceholder?: string;
  favoritesTitle?: string;
  pinLabel?: string;
  unpinLabel?: string;
  favoriteLimitLabel?: string;
  noResultsLabel?: string;
  moreLabel?: string;
  navigationLabel?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHref = activeAdminNavHref(groups, pathname, searchParams.toString());
  const activeGroup = groups.find((group) => group.items.some((item) => item.href === activeHref))?.title;
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
    setOpenGroup(activeGroup || validRemembered || groups[0]?.title || "");

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
    <nav aria-label={navigationLabel} style={{ display: "grid", gap: 9 }}>
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
        <section style={{ padding: "4px 0 12px", borderBottom: "1px solid #e2e8e3" }}>
          <div style={{ marginBottom: 7, fontWeight: 800, color: "#53635a" }}>{favoritesTitle}</div>
          <div style={{ display: "grid", gap: 5 }}>
            {favoriteItems.map((item) => (
              <NavRow
                key={`favorite-${item.href}`}
                item={item}
                activeHref={activeHref}
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
        const isActiveGroup = group.items.some((item) => item.href === activeHref);
        const primaryItems = group.items.filter((item) => normalizedQuery || !item.secondary);
        const secondaryItems = normalizedQuery ? [] : group.items.filter((item) => item.secondary);
        const isOpen = Boolean(normalizedQuery) || openGroup === group.title;

        return (
          <section
            key={group.title}
            className={styles.group}
            data-active={isActiveGroup || undefined}
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              aria-expanded={isOpen}
              title={group.summary || group.title}
              className={styles.groupToggle}
            >
              <span aria-hidden="true" style={{ fontSize: 13 }}>{isOpen ? "▾" : "▸"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{group.title}</span>
              <span className={styles.count}>{group.items.length}</span>
            </button>
            {isOpen ? (
              <div className={styles.items}>
                {primaryItems.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    activeHref={activeHref}
                    isFavorite={favoriteHrefs.includes(item.href)}
                    onToggleFavorite={toggleFavorite}
                    pinLabel={pinLabel}
                    unpinLabel={unpinLabel}
                  />
                ))}
                {secondaryItems.length > 0 ? (
                  <details key={`${group.title}-${activeHref ?? ""}`} open={secondaryItems.some((item) => item.href === activeHref)}>
                    <summary className={styles.more}>{moreLabel} ({secondaryItems.length})</summary>
                    <div style={{ display: "grid", gap: 5 }}>
                      {secondaryItems.map((item) => (
                        <NavRow key={item.href} item={item} activeHref={activeHref} isFavorite={favoriteHrefs.includes(item.href)} onToggleFavorite={toggleFavorite} pinLabel={pinLabel} unpinLabel={unpinLabel} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}
