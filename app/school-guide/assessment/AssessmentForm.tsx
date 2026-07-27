"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { assessSchoolGuidePath } from "@/lib/school-guide-assessment";
import type { SchoolGuidePathway } from "@/lib/school-guide-data";

export default function AssessmentForm({ pathways }: { pathways: SchoolGuidePathway[] }) {
  const [birthDate, setBirthDate] = useState("");
  const [targetEntryYear, setTargetEntryYear] = useState(new Date().getFullYear() + 1);
  const [residency, setResidency] = useState<"SC" | "PR" | "IS">("IS");
  const [preferredSystem, setPreferredSystem] = useState<"MOE" | "INTERNATIONAL" | "UNSURE">("UNSURE");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(
    () => assessSchoolGuidePath({ birthDate, targetEntryYear, residency, preferredSystem }),
    [birthDate, targetEntryYear, residency, preferredSystem],
  );
  const matched = pathways.filter((pathway) => result.pathwaySlugs.includes(pathway.slug));

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
