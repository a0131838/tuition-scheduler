import { notFound } from "next/navigation";
import Link from "next/link";
import { getSchoolGuideSchool } from "@/lib/school-guide-data";

export default async function SchoolGuideSchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = getSchoolGuideSchool(slug);
  if (!school) notFound();
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">{school.category}{school.editorialTier === 1 ? " · 第一梯队" : ""}</div>
          <h1>{school.nameZh}</h1>
          <p>{school.name}</p>
          <div className="sg-data-meta"><span>资料更新于 {school.publicUpdatedAt}</span><span>{school.updateCadence}</span></div>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell sg-school-profile">
          <div className="sg-school-snapshot">
            <div><small>年龄与年级</small><strong>{school.comparison?.ageAndGrades || "学校未公开"}</strong></div>
            <div><small>课程体系</small><strong>{school.comparison?.curriculum || school.category}</strong></div>
            <div><small>校区</small><strong>{school.comparison?.campuses || "学校未公开"}</strong></div>
            <div><small>首年固定费用</small><strong>{school.costProfile ? `S$${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S$${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}` : "学校未公开"}</strong></div>
          </div>
          <article className="sg-copy">
            <h2>学校概览</h2>
            <ul>{school.verifiedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>

            <h2>在校规模</h2>
            {school.communityMetrics?.length ? (
              <div className="sg-school-metrics">{school.communityMetrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.asOf}</small></div>)}</div>
            ) : <div className="sg-school-unpublished">学校暂未公开可核实的在校人数或师生比例，GT不会使用估算数字。</div>}

            <h2>招生、课程与费用</h2>
            {school.detailSections?.length ? school.detailSections.map((section, index) => (
              <details className="sg-school-detail-section" key={section.title} open={index === 0}>
                <summary>{section.title}</summary>
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
            )) : <div className="sg-school-unpublished">当前只完成基础学校档案。招生、考试与费用资料将在下一次资料复核后补充。</div>}

            <h2>历年学术成绩</h2>
            {school.academicResults?.records.length ? <>
              <p>{school.academicResults.programme} · {school.academicResults.note}</p>
              <div className="sg-result-scroll"><div className="sg-result-row">{school.academicResults.records.map((record) => <div className="sg-result-item" key={record.year}><small>{record.year}</small><strong>{record.average || "—"}</strong><span>平均分</span>{record.passRate ? <p>通过率 {record.passRate}</p> : null}{record.cohort ? <p>考生 {record.cohort}</p> : null}{record.highlight ? <em>{record.highlight}</em> : null}</div>)}</div></div>
            </> : <div className="sg-school-unpublished">学校暂未连续公开可核实的历年成绩。</div>}

            <h2>大学录取与去向</h2>
            {school.universityOutcomes?.length ? <div className="sg-school-outcomes">{school.universityOutcomes.map((outcome) => <div key={outcome.year}><strong>{outcome.year}</strong><p>{outcome.summary}</p></div>)}</div> : <div className="sg-school-unpublished">学校暂未公开可按毕业年份核实的大学录取或最终入读数据。</div>}

            {school.costProfile ? (
              <section className="sg-cost-box">
                <span>{school.costProfile.academicYear}首年固定费用估算</span>
                <strong>S${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}</strong>
                <p>已计：{school.costProfile.includes.join("、")}</p>
                <p>未计：{school.costProfile.optionalItems.join("、")}</p>
                <small>{school.costProfile.note}</small>
              </section>
            ) : null}

            <div className="sg-school-update">下次计划复核：{school.nextPublicReviewAt}。学校未公开的数据会保持空缺，不使用网络推测值。</div>
            <div className="sg-actions">
              <Link className="sg-secondary" href="/school-guide/assessment">先做测评</Link>
              <Link className="sg-primary" href={`/school-guide/consult?summary=${encodeURIComponent(`希望了解${school.nameZh}的申请与准备方案`)}`}>咨询这所学校</Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
