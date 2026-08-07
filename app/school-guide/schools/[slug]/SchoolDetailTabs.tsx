"use client";

import Link from "next/link";
import { useState } from "react";
import type { SchoolGuideSchoolGroup } from "@/lib/school-guide-directory";
import type { SchoolGuideDetailedPathway, SchoolGuideSamplePack } from "@/lib/school-guide-pathways";

type Tab = "overview" | "results" | "application";

export default function SchoolDetailTabs({ school, pathway, pack }: {
  school: SchoolGuideSchoolGroup;
  pathway?: SchoolGuideDetailedPathway;
  pack?: SchoolGuideSamplePack;
}) {
  const [tab, setTab] = useState<Tab>("results");
  return <>
    <nav className="sg-school-tabs" aria-label="学校资料分类">
      {[["results", "成绩升学"], ["overview", "概览"], ["application", "申请费用"]].map(([value, label]) => <button key={value} className={tab === value ? "active" : ""} type="button" onClick={() => setTab(value as Tab)}>{label}</button>)}
    </nav>
    <article className="sg-copy sg-school-tab-content">
      {tab === "overview" ? <>
        {school.campusProfiles.length ? <section className="sg-school-campuses"><h2>校区与学段</h2>{school.campusProfiles.map((campus) => <div key={campus.slug}><strong>{campus.nameZh}</strong><small>{campus.name}</small><p>{campus.note}</p></div>)}</section> : null}
        <h2>学校概览</h2>
        <ul>{school.verifiedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        <h2>在校规模</h2>
        {school.communityMetrics?.length ? <div className="sg-school-metrics">{school.communityMetrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.asOf}</small></div>)}</div> : <div className="sg-school-unpublished">暂无公开数据</div>}
      </> : null}

      {tab === "results" ? <>
        <h2>历年学术成绩</h2>
        {school.academicResults?.records.length ? <><p>{school.academicResults.programme} · {school.academicResults.note}</p><div className="sg-result-scroll"><div className="sg-result-row">{school.academicResults.records.map((record) => <div className="sg-result-item" key={`${record.year}-${record.scoreLabel || "result"}`}><small>{record.year}</small><strong>{record.average || record.passRate || "已公布"}</strong><span>{record.scoreLabel || (record.average ? "平均分" : record.passRate ? "通过率" : "成绩摘要")}</span>{record.average && record.passRate ? <p>通过率 {record.passRate}</p> : null}{record.cohort ? <p>考生 {record.cohort}</p> : null}{record.highlight ? <em>{record.highlight}</em> : null}</div>)}</div></div></> : <div className="sg-school-unpublished">{school.academicResults?.note || "学校未公开可核实的整届成绩"}</div>}
        {school.academicResults?.sourceLabel ? <div className="sg-school-update">资料：{school.academicResults.sourceLabel} · 核对于 {school.academicResults.checkedAt}</div> : null}
        <h2>大学录取与去向</h2>
        {school.universityOutcomes?.length ? <div className="sg-school-outcomes">{school.universityOutcomes.map((outcome) => <div key={outcome.year}><strong>{outcome.year}</strong><p>{outcome.summary}</p></div>)}</div> : <div className="sg-school-unpublished">{school.universityOutcomeNote || "学校未公开按届升学数据"}</div>}
      </> : null}

      {tab === "application" ? <>
        <h2>申请与课程</h2>
        {school.studentPass ? <section className="sg-cost-box"><span>Student’s Pass</span><strong>{school.studentPass.label}</strong><p>{school.studentPass.note}</p><small>最终签发由ICA决定；缴费前请取得学校书面确认。</small></section> : null}
        {school.admissionProfile ? <section className="sg-cost-box"><span>选校判断</span><strong>{school.admissionProfile.difficultyLabel}</strong><p>课程：{school.admissionProfile.curriculumFamilies.join("、") || school.comparison?.curriculum}</p><p>主要节点：{school.admissionProfile.mainEntryPoints.join("、") || "按目标年级确认"}</p><small>{school.admissionProfile.entryAdvice}</small></section> : null}
        {school.detailSections?.map((section, index) => <details className="sg-school-detail-section" key={section.title} open={index === 0}><summary>{section.title}</summary><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></details>)}
        {school.costProfile ? <section className="sg-cost-box"><span>{school.costProfile.academicYear}首年固定费用</span><strong>S${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}</strong><p>已计：{school.costProfile.includes.join("、")}</p><p>未计：{school.costProfile.optionalItems.join("、")}</p><small>{school.costProfile.note}</small></section> : null}
        {pathway ? <section className="sg-linked-block"><h2>申请路径</h2><Link href={`/school-guide/pathways/${pathway.slug}`}><strong>{pathway.title}</strong><span>{pathway.audience}</span><b>→</b></Link></section> : null}
        {pack ? <section className="sg-linked-block"><h2>入学准备例题</h2><a href={pack.downloadUrl} download><strong>{pack.title}</strong><span>博思原创练习 · {pack.duration}</span><b>查看练习</b></a><p>不是学校真题，也不预测正式考试。</p></section> : null}
      </> : null}

      <div className="sg-actions"><Link className="sg-secondary" href="/school-guide/assessment">先做测评</Link><Link className="sg-primary" href={`/school-guide/consult?summary=${encodeURIComponent(`希望了解${school.nameZh}的申请与准备方案`)}`}>咨询这所学校</Link></div>
    </article>
  </>;
}
