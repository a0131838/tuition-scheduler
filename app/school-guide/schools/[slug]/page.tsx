import { notFound } from "next/navigation";
import Link from "next/link";
import { getSchoolGuideSchoolGroup } from "@/lib/school-guide-directory";
import { getSchoolGuideDetailedPathway, getSchoolGuideSamplePack } from "@/lib/school-guide-pathways";

export default async function SchoolGuideSchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = getSchoolGuideSchoolGroup(slug);
  if (!school) notFound();
  const pathway = getSchoolGuideDetailedPathway("international-school-direct");
  const packs = ["international-primary-sample", "international-secondary-sample"].map(getSchoolGuideSamplePack).filter(Boolean);
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">国际学校{school.editorialTier === 1 ? " · 第一梯队" : ""}</div>
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
            <div><small>申请难度</small><strong>{school.admissionProfile?.difficultyLabel || "需个案确认"}</strong></div>
            <div><small>主要入学节点</small><strong>{school.admissionProfile?.mainEntryPoints.join("、") || "按年级确认"}</strong></div>
            <div><small>校区</small><strong>{school.comparison?.campuses || "学校未公开"}</strong></div>
            <div><small>首年固定费用</small><strong>{school.costProfile ? `S$${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S$${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}` : "学校未公开"}</strong></div>
          </div>
          {school.campusProfiles.length ? <section className="sg-school-campuses"><h2>校区与学段</h2>{school.campusProfiles.map((campus) => <div key={campus.slug}><strong>{campus.nameZh}</strong><small>{campus.name}</small><p>{campus.note}</p></div>)}</section> : null}
          <article className="sg-copy">
            <h2>学校概览</h2>
            <ul>{school.verifiedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>

            <h2>在校规模</h2>
            {school.communityMetrics?.length ? (
              <div className="sg-school-metrics">{school.communityMetrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.asOf}</small></div>)}</div>
            ) : <div className="sg-school-unpublished">暂无公开数据</div>}

            <h2>招生、课程与费用</h2>
            {school.admissionProfile ? <section className="sg-cost-box"><span>选校判断</span><strong>{school.admissionProfile.difficultyLabel}</strong><p>课程：{school.admissionProfile.curriculumFamilies.join("、") || school.comparison?.curriculum}</p><p>主要节点：{school.admissionProfile.mainEntryPoints.join("、") || "按目标年级确认"}</p><small>{school.admissionProfile.entryAdvice}“相对容易申请”不代表保证录取。</small></section> : null}
            {school.detailSections?.length ? school.detailSections.map((section, index) => (
              <details className="sg-school-detail-section" key={section.title} open={index === 0}>
                <summary>{section.title}</summary>
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
            )) : <div className="sg-school-unpublished">暂无详细资料</div>}

            <h2>历年学术成绩</h2>
            {school.academicResults ? <>
              <p>{school.academicResults.programme} · {school.academicResults.note}</p>
              {school.academicResults.records.length ? <div className="sg-result-scroll"><div className="sg-result-row">{school.academicResults.records.map((record) => <div className="sg-result-item" key={record.year}><small>{record.year}</small><strong>{record.average || record.passRate || "已公布"}</strong><span>{record.scoreLabel || (record.average ? "平均分" : record.passRate ? "通过率" : "成绩摘要")}</span>{record.average && record.passRate ? <p>通过率 {record.passRate}</p> : null}{record.cohort ? <p>考生 {record.cohort}</p> : null}{record.highlight ? <em>{record.highlight}</em> : null}</div>)}</div></div> : null}
              {school.academicResults.sourceLabel ? <div className="sg-school-update">资料：{school.academicResults.sourceLabel} · 核对于 {school.academicResults.checkedAt}</div> : null}
            </> : <div className="sg-school-unpublished">尚未完成成绩核对</div>}

            <h2>大学录取与去向</h2>
            {school.universityOutcomes?.length ? <div className="sg-school-outcomes">{school.universityOutcomes.map((outcome) => <div key={outcome.year}><strong>{outcome.year}</strong><p>{outcome.summary}</p></div>)}</div> : <div className="sg-school-unpublished">{school.universityOutcomeNote || "暂无按届公开数据"}</div>}

            {school.costProfile ? (
              <section className="sg-cost-box">
                <span>{school.costProfile.academicYear}首年固定费用</span>
                <strong>S${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}</strong>
                <p>已计：{school.costProfile.includes.join("、")}</p>
                <p>未计：{school.costProfile.optionalItems.join("、")}</p>
                <small>{school.costProfile.note}</small>
              </section>
            ) : null}

            <div className="sg-school-update">更新于 {school.publicUpdatedAt} · 下次复核 {school.nextPublicReviewAt}</div>
            {pathway ? <section className="sg-linked-block"><h2>申请路径</h2><Link href={`/school-guide/pathways/${pathway.slug}`}><strong>{pathway.title}</strong><span>{pathway.audience}</span><b>→</b></Link></section> : null}
            <section className="sg-linked-block"><h2>入学准备例题</h2>{packs.map((pack) => pack ? <a href={pack.downloadUrl} download key={pack.slug}><strong>{pack.title}</strong><span>博思原创练习 · {pack.duration}</span><b>PDF</b></a> : null)}<p>不是学校真题，也不预测正式考试。</p></section>
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
