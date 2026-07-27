import { notFound } from "next/navigation";
import { getOfficialSource, getSchoolGuideSchool } from "@/lib/school-guide-data";

export default async function SchoolGuideSchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = getSchoolGuideSchool(slug);
  if (!school) notFound();
  const sources = school.sourceIds.map(getOfficialSource).filter(Boolean);

  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">{school.category} · {school.editorialTier === 1 ? "第一梯队" : "待分梯队"}</div>
          <h1>{school.name}</h1>
          <p>本页只展示已经从官方来源核实的事实。空白字段不会用第三方文章或推测补齐。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell sg-detail-grid">
          <article className="sg-copy">
            {school.verifiedAt ? (
              <div className="sg-data-meta">
                <span>{school.dataStatus === "VERIFIED" ? "官网已核实" : "部分核实"}</span>
                <span>适用：{school.applicableYear ?? "以官网当前页面为准"}</span>
                <span>核实：{school.verifiedAt}</span>
                <span>下次复核：{school.nextReviewAt ?? "待安排"}</span>
              </div>
            ) : null}
            <h2>学校概览</h2>
            <ul>{school.verifiedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            {school.detailSections?.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
            {!school.detailSections?.length ? (
              <>
                <h2>尚待逐项核实</h2>
                <p>入学年龄、年级、学费、申请费、校车、EAL、SEN、考试和面试要求，需要继续核对学校当期官方招生与费用页面。</p>
              </>
            ) : null}
            {school.costProfile ? (
              <section className="sg-cost-box">
                <span>{school.costProfile.academicYear}首年固定费用估算</span>
                <strong>S${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}</strong>
                <p>已计：{school.costProfile.includes.join("、")}</p>
                <p>未计：{school.costProfile.optionalItems.join("、")}</p>
                <small>{school.costProfile.note}</small>
              </section>
            ) : null}
            <div className="sg-actions">
              {school.officialWebsiteUrl ? (
                <a className="sg-primary" href={school.officialWebsiteUrl} target="_blank" rel="noreferrer">学校官网 ↗</a>
              ) : null}
              {school.officialProfileUrl ? (
                <a className="sg-secondary" href={school.officialProfileUrl} target="_blank" rel="noreferrer">IB官方详情 ↗</a>
              ) : (
                <a className="sg-secondary" href={sources[0]?.url} target="_blank" rel="noreferrer">官方来源 ↗</a>
              )}
            </div>
          </article>
          <aside className="sg-source-list">
            <div className="sg-eyebrow">资料来源</div>
            {sources.map((source) => source ? (
              <div className="sg-source" key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
                <small>{source.authority}<br />核实于 {source.checkedAt}</small>
              </div>
            ) : null)}
          </aside>
        </div>
      </section>
    </main>
  );
}
