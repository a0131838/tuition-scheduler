"use client";

import { useMemo, useState } from "react";
import type { SchoolGuideSchool } from "@/lib/school-guide-data";

const popularCompareSlugs = [
  "singapore-american-school", "dulwich-college-singapore-8", "united-world-college-of-south-east-asia-38", "tanglin-trust-school-36",
  "north-london-collegiate-school-singapore-21", "acs-international-singapore-1", "hwa-chong-international-school-16", "st-joseph-s-institution-international-ltd-34",
];

export default function CompareSchools({ schools }: { schools: SchoolGuideSchool[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const uniqueSchools = useMemo(
    () => schools.filter((school, index, all) => all.findIndex((item) => item.name === school.name) === index),
    [schools],
  );
  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return uniqueSchools
      .filter((school) => !q || school.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aPopular = popularCompareSlugs.indexOf(a.slug);
        const bPopular = popularCompareSlugs.indexOf(b.slug);
        if (aPopular !== -1 || bPopular !== -1) return (aPopular === -1 ? 99 : aPopular) - (bPopular === -1 ? 99 : bPopular);
        return (a.editorialTier === 1 ? 0 : 1) - (b.editorialTier === 1 ? 0 : 1);
      })
      .slice(0, 18);
  }, [query, uniqueSchools]);
  const compared = uniqueSchools.filter((school) => selected.includes(school.slug));
  const money = (value: number) => `S$${value.toLocaleString("en-SG")}`;

  function toggle(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= 4) return current;
      return [...current, slug];
    });
  }

  return (
    <>
      <label className="sg-field">
        搜索并选择2至4所学校
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入学校英文名" />
      </label>
      <div className="sg-school-list">
        {available.map((school) => {
          const active = selected.includes(school.slug);
          return (
            <div className="sg-school-row" key={school.slug}>
              <div>
                <h3>{school.name}</h3>
                <p>{school.verifiedFacts[0]}</p>
              </div>
              <span className="sg-badge">{active ? "已加入比较" : school.editorialTier === 1 ? "第一梯队" : "待分梯队"}</span>
              <button type="button" onClick={() => toggle(school.slug)} disabled={!active && selected.length >= 4}>
                {active ? "移除" : "加入"}
              </button>
            </div>
          );
        })}
      </div>
      {compared.length ? (
        <div className="sg-result">
          <div className="sg-result-item">
            <div className="sg-eyebrow">当前比较</div>
            <h3>{compared.length}所学校</h3>
          </div>
          <div className="sg-compare-grid">
            {compared.map((school) => (
              <article className="sg-compare-card" key={school.slug}>
                <div className="sg-compare-card-head">
                  <div>
                    <h3>{school.name}</h3>
                  </div>
                  <small>{school.applicableYear ?? "年份待核实"}</small>
                </div>
                {school.comparison ? (
                  <dl>
                    <div><dt>年龄年级</dt><dd>{school.comparison.ageAndGrades}</dd></div>
                    <div><dt>课程</dt><dd>{school.comparison.curriculum}</dd></div>
                    <div><dt>校区</dt><dd>{school.comparison.campuses}</dd></div>
                    <div><dt>招生评估</dt><dd>{school.comparison.admissions}</dd></div>
                    <div><dt>英语支持</dt><dd>{school.comparison.englishSupport}</dd></div>
                    <div><dt>寄宿</dt><dd>{school.comparison.boarding}</dd></div>
                  </dl>
                ) : <p>该校尚未完成统一维度的官网核实。</p>}
                {school.costProfile ? (
                  <div className="sg-cost-box">
                    <span>{school.costProfile.academicYear}首年固定费用估算</span>
                    <strong>{money(school.costProfile.fixedFirstYearLow)}–{money(school.costProfile.fixedFirstYearHigh)}</strong>
                    <p>已计：{school.costProfile.includes.join("、")}</p>
                    <p>未计：{school.costProfile.optionalItems.join("、")}</p>
                    <small>{school.costProfile.note}</small>
                  </div>
                ) : null}
                <a href={`/school-guide/schools/${school.slug}`}>查看学校 →</a>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
