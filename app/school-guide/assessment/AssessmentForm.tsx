"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { assessSchoolGuidePath } from "@/lib/school-guide-assessment";
import { matchSchoolGuideSchools, type SchoolGuideMatchInput } from "@/lib/school-guide-match";
import type { SchoolGuidePathway, SchoolGuideSchool } from "@/lib/school-guide-data";

export default function AssessmentForm({ pathways, schools }: { pathways: SchoolGuidePathway[]; schools: SchoolGuideSchool[] }) {
  const [birthDate, setBirthDate] = useState("");
  const [targetEntryYear, setTargetEntryYear] = useState(new Date().getFullYear() + 1);
  const [residency, setResidency] = useState<"SC" | "PR" | "IS">("IS");
  const [preferredSystem, setPreferredSystem] = useState<"MOE" | "INTERNATIONAL" | "UNSURE">("UNSURE");
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [curriculum, setCurriculum] = useState<SchoolGuideMatchInput["curriculum"]>("ANY");
  const [englishSupportNeeded, setEnglishSupportNeeded] = useState(false);
  const [boardingNeeded, setBoardingNeeded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(
    () => assessSchoolGuidePath({ birthDate, targetEntryYear, residency, preferredSystem }),
    [birthDate, targetEntryYear, residency, preferredSystem],
  );
  const matched = pathways.filter((pathway) => result.pathwaySlugs.includes(pathway.slug));
  const schoolMatches = useMemo(
    () => matchSchoolGuideSchools(schools, { budgetMax, curriculum, englishSupportNeeded, boardingNeeded }),
    [schools, budgetMax, curriculum, englishSupportNeeded, boardingNeeded],
  );

  function addToPlan(slug: string) {
    const key = "school-guide-favorites";
    const current = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    localStorage.setItem(key, JSON.stringify(Array.from(new Set([...current, slug]))));
    window.dispatchEvent(new Event("school-guide-plan-updated"));
  }

  return (
    <div className="sg-assessment">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="sg-form-grid">
          <label className="sg-field">
            孩子出生日期
            <input type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </label>
          <label className="sg-field">
            每年预算上限（新币）
            <select value={budgetMax ?? ""} onChange={(event) => setBudgetMax(event.target.value ? Number(event.target.value) : null)}>
              <option value="">暂不限制</option>
              {[30000, 40000, 50000, 60000, 70000].map((amount) => <option value={amount} key={amount}>S${amount.toLocaleString("en-SG")}</option>)}
            </select>
          </label>
          <label className="sg-field">
            课程偏好
            <select value={curriculum} onChange={(event) => setCurriculum(event.target.value as SchoolGuideMatchInput["curriculum"])}>
              <option value="ANY">保持开放</option>
              <option value="IB">IB</option>
              <option value="BRITISH">英式</option>
              <option value="AMERICAN">美式</option>
              <option value="FRENCH">法式</option>
              <option value="AUSTRALIAN">澳洲体系</option>
            </select>
          </label>
          <label className="sg-check"><input type="checkbox" checked={englishSupportNeeded} onChange={(event) => setEnglishSupportNeeded(event.target.checked)} />孩子需要英语支持</label>
          <label className="sg-check"><input type="checkbox" checked={boardingNeeded} onChange={(event) => setBoardingNeeded(event.target.checked)} />家庭必须考虑寄宿</label>
          <label className="sg-field">
            目标入学年份
            <input
              type="number"
              required
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 6}
              value={targetEntryYear}
              onChange={(event) => setTargetEntryYear(Number(event.target.value))}
            />
          </label>
          <label className="sg-field">
            孩子身份
            <select value={residency} onChange={(event) => setResidency(event.target.value as typeof residency)}>
              <option value="IS">国际学生</option>
              <option value="PR">新加坡PR</option>
              <option value="SC">新加坡公民</option>
            </select>
          </label>
          <label className="sg-field">
            目前偏好的体系
            <select
              value={preferredSystem}
              onChange={(event) => setPreferredSystem(event.target.value as typeof preferredSystem)}
            >
              <option value="UNSURE">还不确定</option>
              <option value="MOE">政府学校</option>
              <option value="INTERNATIONAL">国际学校</option>
            </select>
          </label>
        </div>
        <div className="sg-actions">
          <button className="sg-primary" type="submit">查看可能路径</button>
        </div>
      </form>

      {submitted ? (
        <div className="sg-result" aria-live="polite">
          <div className="sg-result-item">
            <div className="sg-eyebrow">年龄参考</div>
            <h3>入学年份1月1日：{result.ageOnEntryYearStart === null ? "无法计算" : `${result.ageOnEntryYearStart}岁`}</h3>
            <p>这是日期计算结果，不等于MOE或学校已经确认报考年级。</p>
          </div>
          {matched.map((pathway) => (
            <div className="sg-result-item" key={pathway.slug}>
              <h3>{pathway.title}</h3>
              <p>{pathway.summary}</p>
              <Link className="sg-secondary" href={`/school-guide/pathways/${pathway.slug}`}>查看官方依据</Link>
            </div>
          ))}
          <div className="sg-result-item">
            <div className="sg-eyebrow">学校候选清单</div>
            <h3>先比较前6所，再决定是否咨询。</h3>
            <p>分层表示与当前条件的匹配程度，不代表录取概率或学校排名。</p>
          </div>
          {schoolMatches.slice(0, 6).map((item) => (
            <div className="sg-match-card" key={item.school.slug}>
              <div className={`sg-match-band is-${item.band.toLowerCase()}`}>
                {item.band === "PRIORITY" ? "优先了解" : item.band === "COMPARE" ? "可以比较" : "需要谨慎"}
              </div>
              <h3>{item.school.name}</h3>
              {item.reasons.map((reason) => <p className="sg-match-reason" key={reason}>✓ {reason}</p>)}
              {item.cautions.map((caution) => <p className="sg-match-caution" key={caution}>! {caution}</p>)}
              <div className="sg-actions">
                <Link className="sg-secondary" href={`/school-guide/schools/${item.school.slug}`}>查看学校</Link>
                <button type="button" onClick={() => addToPlan(item.school.slug)}>加入我的方案</button>
              </div>
            </div>
          ))}
          <div className="sg-result-item">
            <h3>需要注意</h3>
            <ul>{result.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>
            <div className="sg-actions">
              <Link
                className="sg-primary"
                href={`/school-guide/consult?birthDate=${encodeURIComponent(birthDate)}&targetEntryYear=${targetEntryYear}&residency=${residency}&preferredSystem=${preferredSystem}`}
              >
                提交人工评估
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
