import Link from "next/link";
import { SCHOOL_GUIDE_DATA_VERSION, schoolGuideCases, schoolGuidePathways, schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideHomePage() {
  const verifiedSchools = schoolGuideSchools
    .filter((school) => school.dataStatus === "VERIFIED")
    .filter((school, index, all) => all.findIndex((item) => item.name === school.name) === index);
  const popularSchools = verifiedSchools.filter((school) => school.editorialTier === 1).slice(0, 5);
  const publishedCases = schoolGuideCases.filter((item) => item.published && item.consentRecorded && item.anonymized);

  return (
    <main>
      <section className="sg-hero">
        <div className="sg-shell sg-hero-inner">
          <div>
            <div className="sg-eyebrow">新加坡学校指南</div>
            <h1>从家庭条件出发，做一份能执行的选校方案。</h1>
            <p>查学校、看官方要求、比较费用与课程，再把关注的学校放进自己的申请计划。</p>
            <div className="sg-actions">
              <Link className="sg-primary" href="/school-guide/assessment">开始智能选校</Link>
              <Link className="sg-secondary" href="/school-guide/schools">直接找学校</Link>
            </div>
          </div>
          <div className="sg-compass" aria-label="择校方向图形">
            <div className="sg-compass-mark" />
            <div className="sg-compass-label">官方资料核实版本 {SCHOOL_GUIDE_DATA_VERSION}</div>
          </div>
        </div>
      </section>

      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">你现在要做什么</div>
            <div>
              <h2>从任务开始，不必先读完整本指南。</h2>
              <p className="sg-section-intro">
                每一个入口都对应一个实际决策；资料、比较和人工顾问会在需要时出现。
              </p>
            </div>
          </div>
          <div className="sg-task-list">
            {[
              ["01", "我想快速找学校", `${verifiedSchools.length}所已核实学校，按体系、梯队和预算查看`, "/school-guide/schools"],
              ["02", "我不知道该选哪些学校", "输入孩子情况，得到优先了解、可以比较和需要谨慎的学校", "/school-guide/assessment"],
              ["03", "我想看相似家庭怎么选", publishedCases.length ? `${publishedCases.length}个已获授权案例` : "案例只在获得授权、匿名并人工审核后发布", "/school-guide/cases"],
              ["04", "我想继续整理选校方案", "查看已加入学校、费用和下一步行动", "/school-guide/plan"],
              ["05", "情况复杂，需要人工判断", "提交家庭信息，由赵宏伟统一跟进", "/school-guide/consult"],
            ].map(([index, title, summary, href]) => (
              <Link className="sg-path-row" key={href} href={href}>
                <span className="sg-path-index">{index}</span>
                <span className="sg-path-title">{title}</span>
                <span className="sg-path-summary">{summary}</span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">热门学校</div>
            <div>
              <h2>先从常被比较的学校开始。</h2>
              <p className="sg-section-intro">
                第一梯队是本站编辑分类，不代表官方排名；招生、费用和课程仍以学校当期官网为准。
              </p>
            </div>
          </div>
          <div className="sg-popular-grid">
            {popularSchools.map((school) => (
              <Link className="sg-popular-card" href={`/school-guide/schools/${school.slug}`} key={school.slug}>
                <span>第一梯队 · 已核实</span>
                <strong>{school.name}</strong>
                <small>{school.comparison?.curriculum || school.category}</small>
                <b>查看决策信息 →</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sg-section" id="pathways">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">申请路径</div>
            <div>
              <h2>先判断制度路径，再谈具体学校。</h2>
            </div>
          </div>
          <div className="sg-path-list">
            {schoolGuidePathways.map((pathway, index) => (
              <Link className="sg-path-row" key={pathway.slug} href={`/school-guide/pathways/${pathway.slug}`}>
                <span className="sg-path-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="sg-path-title">{pathway.title}</span>
                <span className="sg-path-summary">{pathway.audience}</span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
