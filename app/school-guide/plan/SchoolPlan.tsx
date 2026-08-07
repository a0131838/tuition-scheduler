"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SchoolGuideSchool } from "@/lib/school-guide-data";

const favoritesKey = "school-guide-favorites";
const metaKey = "school-guide-plan-meta";
type PlanMeta = Record<string, { status: string; note: string }>;

export default function SchoolPlan({ schools }: { schools: SchoolGuideSchool[] }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [meta, setMeta] = useState<PlanMeta>({});

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem(favoritesKey) || "[]"));
    setMeta(JSON.parse(localStorage.getItem(metaKey) || "{}"));
  }, []);

  function saveMeta(slug: string, next: { status: string; note: string }) {
    const value = { ...meta, [slug]: next };
    setMeta(value);
    localStorage.setItem(metaKey, JSON.stringify(value));
  }

  function remove(slug: string) {
    const next = favorites.filter((item) => item !== slug);
    setFavorites(next);
    localStorage.setItem(favoritesKey, JSON.stringify(next));
  }

  const selected = favorites.map((slug) => schools.find((school) => school.slug === slug)).filter(Boolean) as SchoolGuideSchool[];
  return selected.length ? <div className="sg-plan-list">
    {selected.map((school, index) => {
      const itemMeta = meta[school.slug] || { status: "关注中", note: "" };
      return <article className="sg-plan-card" key={school.slug}>
        <div className="sg-plan-number">{String(index + 1).padStart(2, "0")}</div>
        <div>
          <span className="sg-badge">已加入方案</span>
          <h2>{school.name}</h2>
          <p>{school.comparison?.curriculum || school.category}</p>
          {school.costProfile ? <strong>S${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")} · {school.costProfile.academicYear}</strong> : null}
          <div className="sg-plan-controls">
            <select value={itemMeta.status} onChange={(event) => saveMeta(school.slug, { ...itemMeta, status: event.target.value })}>
              <option>关注中</option><option>准备咨询</option><option>准备申请</option>
            </select>
            <input placeholder="记录要确认的问题" value={itemMeta.note} onChange={(event) => saveMeta(school.slug, { ...itemMeta, note: event.target.value })} />
          </div>
          <div className="sg-actions"><Link className="sg-secondary" href={`/school-guide/schools/${school.slug}`}>查看详情</Link><button type="button" onClick={() => remove(school.slug)}>移出方案</button></div>
        </div>
      </article>;
    })}
    <div className="sg-actions"><Link className="sg-primary" href="/school-guide/compare">比较已选学校</Link><Link className="sg-secondary" href="/school-guide/consult">提交人工评估</Link></div>
  </div> : <div className="sg-empty"><h2>你的选校方案还是空的。</h2><p>在学校目录或智能选校结果中点击“加入方案”，这里会持续保留学校和下一步记录。</p><Link className="sg-primary" href="/school-guide/assessment">开始智能选校</Link></div>;
}
