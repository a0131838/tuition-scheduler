"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { assessSchoolGuidePath } from "@/lib/school-guide-assessment";
import { matchSchoolGuideSchools, selectBalancedSchoolGuideMatches, type SchoolGuideMatchInput } from "@/lib/school-guide-match";
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
  const [currentSchoolType, setCurrentSchoolType] = useState<NonNullable<SchoolGuideMatchInput["currentSchoolType"]>>("NOT_ENROLLED");
  const [currentGrade, setCurrentGrade] = useState("");
  const [currentCurriculum, setCurrentCurriculum] = useState<NonNullable<SchoolGuideMatchInput["currentCurriculum"]>>("ANY");
  const [academicLevel, setAcademicLevel] = useState<NonNullable<SchoolGuideMatchInput["academicLevel"]>>("ON_LEVEL");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(
    () => assessSchoolGuidePath({ birthDate, targetEntryYear, residency, preferredSystem }),
    [birthDate, targetEntryYear, residency, preferredSystem],
  );
  const matched = pathways.filter((pathway) => result.pathwaySlugs.includes(pathway.slug));
  const schoolMatches = useMemo(
    () => selectBalancedSchoolGuideMatches(matchSchoolGuideSchools(schools, { budgetMax, curriculum, englishSupportNeeded, boardingNeeded, currentSchoolType, currentCurriculum, academicLevel, birthDate, targetEntryYear, currentGrade })),
    [schools, budgetMax, curriculum, englishSupportNeeded, boardingNeeded, currentSchoolType, currentCurriculum, academicLevel, birthDate, targetEntryYear, currentGrade],
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
              <option value="A_LEVEL">A Level</option>
              <option value="IGCSE">IGCSE</option>
              <option value="AMERICAN">美式</option>
              <option value="AP">AP</option>
              <option value="CBSE">印度CBSE</option>
              <option value="FRENCH">法式</option>
              <option value="AUSTRALIAN">澳洲体系</option>
            </select>
          </label>
          <label className="sg-check"><input type="checkbox" checked={englishSupportNeeded} onChange={(event) => setEnglishSupportNeeded(event.target.checked)} />孩子需要英语支持</label>
          <label className="sg-check"><input type="checkbox" checked={boardingNeeded} onChange={(event) => setBoardingNeeded(event.target.checked)} />家庭必须考虑寄宿</label>
          <label className="sg-field">
            当前学校类型
            <select value={currentSchoolType} onChange={(event) => setCurrentSchoolType(event.target.value as typeof currentSchoolType)}>
              <option value="INTERNATIONAL">国际学校</option><option value="MOE">新加坡政府学校</option><option value="PRIVATE">私立或教会学校</option><option value="OVERSEAS_LOCAL">中国或其他国家本地学校</option><option value="PRESCHOOL">幼儿园或学前</option><option value="NOT_ENROLLED">暂未入学</option>
            </select>
          </label>
          <label className="sg-field">
            当前课程体系
            <select value={currentCurriculum} onChange={(event) => setCurrentCurriculum(event.target.value as typeof currentCurriculum)}>
              <option value="ANY">不确定</option><option value="IB">IB</option><option value="BRITISH">英式</option><option value="A_LEVEL">A Level</option><option value="IGCSE">IGCSE</option><option value="AMERICAN">美式</option><option value="AP">AP</option><option value="CBSE">印度CBSE</option><option value="AUSTRALIAN">澳洲/HSC</option><option value="MOE">新加坡MOE</option><option value="CHINA">中国课程</option><option value="OTHER">其他</option>
            </select>
          </label>
          <label className="sg-field">
            当前年级
            <input value={currentGrade} placeholder="如 P5 / Grade 5 / Year 6" onChange={(event) => setCurrentGrade(event.target.value)} />
          </label>
          <label className="sg-field">
            当前学习情况
            <select value={academicLevel} onChange={(event) => setAcademicLevel(event.target.value as typeof academicLevel)}>
              <option value="NEEDS_SUPPORT">需要较多支持</option><option value="DEVELOPING">正在接近年级要求</option><option value="ON_LEVEL">基本达到年级要求</option><option value="STRONG">目前表现较强</option>
            </select>
          </label>
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
          <button className="sg-primary" type="submit">查看结果</button>
        </div>
      </form>

      {submitted ? (
        <div className="sg-result" aria-live="polite">
          <div className="sg-result-item">
            <div className="sg-eyebrow">年龄参考</div>
            <h3>入学年份1月1日：{result.ageOnEntryYearStart === null ? "无法计算" : `${result.ageOnEntryYearStart}岁`}</h3>
            <p>年龄仅供初步筛选。</p>
          </div>
          {matched.map((pathway) => (
            <div className="sg-result-item" key={pathway.slug}>
              <h3>{pathway.title}</h3>
              <p>{pathway.summary}</p>
              <Link className="sg-secondary" href={`/school-guide/pathways/${pathway.slug}`}>查看路径</Link>
            </div>
          ))}
          <div className="sg-result-item">
            <div className="sg-eyebrow">学校候选清单</div>
            <h3>建议先比较这8所</h3>
            <p>按冲刺、匹配、相对稳妥和过渡分层；“相对稳妥”不代表保证录取。</p>
          </div>
          {schoolMatches.slice(0, 6).map((item) => (
            <div className="sg-match-card" key={item.school.slug}>
              <div className={`sg-match-band is-${item.band.toLowerCase()}`}>
                {item.bandLabel}
              </div>
              <h3>{item.school.nameZh}</h3>
              <p>{item.school.name}</p>
              <p>{item.difficultyLabel} · {item.placement.suggestedGrade} · {item.placement.entryPointLabel}</p>
              <p>课程：{item.school.comparison?.curriculum}</p>
              {item.reasons.map((reason) => <p className="sg-match-reason" key={reason}>✓ {reason}</p>)}
              {item.cautions.map((caution) => <p className="sg-match-caution" key={caution}>! {caution}</p>)}
              <div className="sg-actions">
                <Link className="sg-secondary" href={`/school-guide/schools/${item.school.slug}`}>查看学校</Link>
                <button type="button" onClick={() => addToPlan(item.school.slug)}>加入我的方案</button>
              </div>
            </div>
          ))}
          <div className="sg-result-item">
            <h3>提醒</h3>
            <ul>{result.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>
            <div className="sg-actions">
              <Link
                className="sg-primary"
                href={`/school-guide/consult?birthDate=${encodeURIComponent(birthDate)}&targetEntryYear=${targetEntryYear}&residency=${residency}&preferredSystem=${preferredSystem}`}
              >
                联系顾问获取专业分析
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
