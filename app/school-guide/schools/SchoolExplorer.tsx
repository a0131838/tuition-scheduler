"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SchoolGuideDirectoryCategoryView, SchoolGuideSchoolGroup } from "@/lib/school-guide-directory";

type InstitutionSummary = {
  slug: string;
  categoryId: string;
  subcategory: string;
  name: string;
  nameZh: string;
  summary: string;
  badges: string[];
  directoryGroup: string;
};

const FAVORITES_KEY = "school-guide-favorites";

export default function SchoolExplorer({ schools, categories, institutions }: { schools: SchoolGuideSchoolGroup[]; categories: SchoolGuideDirectoryCategoryView[]; institutions: InstitutionSummary[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("international");
  const [focus, setFocus] = useState("ALL");
  const [institutionGroup, setInstitutionGroup] = useState("ALL");
  const [showAll, setShowAll] = useState(false);
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
      if (focus !== "ALL" && !school.directoryTags.includes(focus as SchoolGuideSchoolGroup["directoryTags"][number])) return false;
      return !q || [school.name, school.nameZh, ...school.campusProfiles.flatMap((campus) => [campus.name, campus.nameZh])]
        .some((value) => value.toLowerCase().includes(q));
    }).sort((a, b) => (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1));
  }, [focus, query, schools]);

  const active = categories.find((category) => category.id === activeCategory) || categories[0];
  const visibleRows = showAll || query.trim() ? rows : rows.slice(0, 12);
  const institutionRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return institutions.filter((item) => item.categoryId === activeCategory
      && (institutionGroup === "ALL" || item.directoryGroup === institutionGroup)
      && (!q || [item.name, item.nameZh, item.subcategory, item.summary, ...item.badges].join(" ").toLowerCase().includes(q)));
  }, [activeCategory, institutionGroup, institutions, query]);
  const visibleInstitutions = showAll || query.trim() ? institutionRows : institutionRows.slice(0, 40);

  return (
    <>
      <label className="sg-directory-search">
        <input value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="搜索学校中文名或英文名" />
      </label>
      <nav className="sg-directory-categories" aria-label="学校大类">
        {categories.map((category) => <button className={activeCategory === category.id ? "active" : ""} type="button" key={category.id} onClick={() => { setActiveCategory(category.id); setInstitutionGroup("ALL"); setShowAll(false); }}><strong>{category.title}</strong><small>{category.subtitle}</small></button>)}
      </nav>
      {activeCategory === "international" ? <>
        <div className="sg-directory-focus" aria-label="国际学校筛选">
          {[["ALL", "全部"], ["FIRST", "第一梯队"], ["IB", "IB"], ["BRITISH", "英式"], ["AMERICAN", "美式"], ["HERITAGE", "国家/侨民课程"], ["NEW", "近期开校"], ["VISA_LIMITED", "需长期准证"], ["SPECIAL_SUPPORT", "专项支持"], ["PRESCHOOL", "学前"]].map(([value, label]) => <button className={focus === value ? "active" : ""} type="button" key={value} onClick={() => { setFocus(value); setShowAll(false); }}>{label}</button>)}
        </div>
        <p className="sg-directory-count">{rows.length}所学校</p>
        <div className="sg-school-list">
        {visibleRows.map((school) => (
          <div className="sg-school-row" key={school.slug}>
            <div>
              <h3>{school.nameZh}</h3>
              <small className="sg-school-name-en">{school.name}</small>
              {school.editorialTier === 1 ? <span className="sg-tier-badge">第一梯队</span> : null}
              {school.campusProfiles.length > 1 ? <span className="sg-tier-badge is-neutral">{school.campusProfiles.length}个收录校区</span> : null}
              {school.comparison?.curriculum ? <p>{school.comparison.curriculum}</p> : null}
              {school.studentPass ? <p>{school.studentPass.label}</p> : null}
            </div>
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
      {rows.length > 12 && !showAll && !query.trim() ? <button className="sg-directory-show-all" type="button" onClick={() => setShowAll(true)}>查看全部{rows.length}所</button> : null}
      {rows.length === 0 ? <div className="sg-notice">没有匹配学校。</div> : null}
      </> : <>
        {active.groups?.length ? <div className="sg-directory-focus" aria-label={`${active.title}分类`}>
          {active.groups.map((group) => <button className={institutionGroup === group.id ? "active" : ""} type="button" key={group.id} onClick={() => { setInstitutionGroup(group.id); setShowAll(false); }}>{group.title}</button>)}
        </div> : null}
        <p className="sg-directory-count">{institutionRows.length}所学校或院校档案</p>
        <div className="sg-institution-list">
          {visibleInstitutions.map((item) => <Link className="sg-institution-row" href={`/school-guide/institutions/${item.slug}`} key={item.slug}>
            <div><small>{item.subcategory}</small><h3>{item.nameZh}</h3>{item.name !== item.nameZh ? <span>{item.name}</span> : null}<p>{item.summary}</p><div>{item.badges.map((badge) => <em key={badge}>{badge}</em>)}</div></div><b aria-hidden="true">→</b>
          </Link>)}
        </div>
        {institutionRows.length > 40 && !showAll && !query.trim() ? <button className="sg-directory-show-all" type="button" onClick={() => setShowAll(true)}>查看全部{institutionRows.length}项</button> : null}
        {institutionRows.length === 0 ? <div className="sg-notice">没有匹配档案。</div> : null}
      </>}
      <p className="sg-directory-source">资料按政府与学校公开信息整理并定期更新。</p>
    </>
  );
}
