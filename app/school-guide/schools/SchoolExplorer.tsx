"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SchoolGuideSchool } from "@/lib/school-guide-data";

const FAVORITES_KEY = "school-guide-favorites";

export default function SchoolExplorer({ schools }: { schools: SchoolGuideSchool[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState("all");
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
      if (page !== "all" && String(school.sourcePage) !== page) return false;
      if (tier === "first" && school.editorialTier !== 1) return false;
      if (tier === "unassigned" && school.editorialTier !== null) return false;
      return !q || school.name.toLowerCase().includes(q);
    }).sort((a, b) => (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1));
  }, [page, query, schools, tier]);

  return (
    <>
      <div className="sg-filter-grid">
        <label className="sg-field">
          搜索学校英文名
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如 Canadian、Stamford、UWCSEA" />
        </label>
        <label className="sg-field">
          IB官方目录页
          <select value={page} onChange={(event) => setPage(event.target.value)}>
            <option value="all">全部目录记录</option>
            <option value="1">第1页</option>
            <option value="2">第2页</option>
            <option value="3">第3页</option>
          </select>
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
      <div className="sg-notice">
        第一梯队由业务负责人确认，包括SAS、德威、UWCSEA、东陵信托和北伦敦；属于择校工作分类，不是官方排名或录取承诺。
      </div>
      <div className="sg-school-list">
        {rows.map((school) => (
          <div className="sg-school-row" key={school.slug}>
            <div>
              <h3>{school.name}</h3>
              {school.editorialTier === 1 ? <span className="sg-tier-badge">第一梯队</span> : <span className="sg-tier-muted">待分梯队</span>}
              <p>{school.verifiedFacts[0]}</p>
            </div>
            <span className="sg-badge">{school.sourcePage ? `IB官方目录 · 第${school.sourcePage}页` : "学校官网"}</span>
            <button
              className="sg-favorite"
              type="button"
              aria-label={`${favorites.includes(school.slug) ? "取消收藏" : "收藏"}${school.name}`}
              aria-pressed={favorites.includes(school.slug)}
              onClick={() => toggleFavorite(school.slug)}
            >
              {favorites.includes(school.slug) ? "已收藏" : "收藏"}
            </button>
            <Link href={`/school-guide/schools/${school.slug}`} aria-label={`查看${school.name}`}>→</Link>
          </div>
        ))}
      </div>
      {rows.length === 0 ? <div className="sg-notice">没有匹配记录，请调整学校名称或目录页。</div> : null}
    </>
  );
}
