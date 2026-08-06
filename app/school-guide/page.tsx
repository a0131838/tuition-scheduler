import Link from "next/link";
import { schoolGuidePathways } from "@/lib/school-guide-data";
import { schoolGuideSchoolGroups } from "@/lib/school-guide-directory";

export default function SchoolGuideHomePage() {
  const verifiedSchools = schoolGuideSchoolGroups
    .filter((school) => school.dataStatus === "VERIFIED")
    .filter((school, index, all) => all.findIndex((item) => item.name === school.name) === index);
  const popularSchools = verifiedSchools.filter((school) => school.editorialTier === 1).slice(0, 5);
  return (
    <main>
      <section className="sg-hero">
        <div className="sg-shell sg-hero-inner">
          <div>
            <div className="sg-eyebrow">新加坡学校指南</div>
            <h1>找到适合孩子的新加坡学校。</h1>
            <p>从学前、政府学校到国际学校、专上院校和大学，按官方资料查找。</p>
            <div className="sg-actions">
              <Link className="sg-primary" href="/school-guide/assessment">开始智能选校</Link>
              <Link className="sg-secondary" href="/school-guide/schools">直接找学校</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">开始</div>
            <div>
              <h2>你想先做什么？</h2>
            </div>
          </div>
          <div className="sg-task-list">
            {[
              ["01", "找学校", "按教育阶段和学校类型查找", "/school-guide/schools"],
              ["02", "智能选校", "按家庭条件生成候选清单", "/school-guide/assessment"],
              ["03", "真实案例", "了解相似家庭的选择", "/school-guide/cases"],
              ["04", "我的方案", "继续整理已选学校", "/school-guide/plan"],
              ["05", "人工评估", "提交需要确认的问题", "/school-guide/consult"],
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
              <h2>常被比较的学校</h2>
            </div>
          </div>
          <div className="sg-popular-grid">
            {popularSchools.map((school) => (
              <Link className="sg-popular-card" href={`/school-guide/schools/${school.slug}`} key={school.slug}>
                <span>热门学校</span>
                <strong>{school.name}</strong>
                <small>{school.comparison?.curriculum || school.category}</small>
                <b>查看学校 →</b>
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
              <h2>政府学校、AEIS与国际学校</h2>
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
