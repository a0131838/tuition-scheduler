"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SchoolGuideSchool } from "@/lib/school-guide-data";

const FAVORITES_KEY = "school-guide-favorites";

export default function SchoolExplorer({ schools }: { schools: SchoolGuideSchool[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]");
      if (Array.isArray(stored)) setFavorites(stored.filter((item): item is string => typeof item === "string"));
    } catch {
      setFavorites([]);
    }
  }, []);

  function toggleFavorite(slug: string) {
    setFavorites((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((school) => {
      if (tier === "first" && school.editorialTier !== 1) return false;
      if (tier === "unassigned" && school.editorialTier !== null) return false;
      return !q || school.name.toLowerCase().includes(q) || school.nameZh.toLowerCase().includes(q);
    }).sort((a, b) => (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1));
  }, [query, schools, tier]);

  return (
    <>
      <div className="sg-filter-grid is-compact">
        <label className="sg-field">
          搜索学校中文名或英文名
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如 德威、Canadian、UWCSEA" />
        </label>
        <label className="sg-field">
          学校梯队
          <select value={tier} onChange={(event) => setTier(event.target.value)}>
            <option value="all">全部学校</option>
            <option value="first">第一梯队</option>
            <option value="unassigned">待分梯队</option>
          </select>
        </label>
      </div>
      <div className="sg-school-list">
        {rows.map((school) => (
          <div className="sg-school-row" key={school.slug}>
            <div>
              <h3>{school.nameZh}</h3>
              <small className="sg-school-name-en">{school.name}</small>
              {school.editorialTier === 1 ? <span className="sg-tier-badge">第一梯队</span> : null}
              <p>{school.verifiedFacts[0]}</p>
            </div>
            <span className="sg-badge">{school.category}</span>
            <button
              className="sg-favorite"
              type="button"
              aria-label={`${favorites.includes(school.slug) ? "移出方案" : "加入方案"}${school.nameZh}`}
              aria-pressed={favorites.includes(school.slug)}
              onClick={() => toggleFavorite(school.slug)}
            >
              {favorites.includes(school.slug) ? "已加入" : "加入方案"}
            </button>
            <Link href={`/school-guide/schools/${school.slug}`} aria-label={`查看${school.nameZh}`}>→</Link>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <div className="sg-notice">没有匹配学校。</div> : null}
    </>
  );
}
