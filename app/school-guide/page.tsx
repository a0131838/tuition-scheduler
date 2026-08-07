import Link from "next/link";
import { schoolGuideSchoolGroups } from "@/lib/school-guide-directory";

const popularCompareSlugs = [
  "singapore-american-school",
  "dulwich-college-singapore-8",
  "united-world-college-of-south-east-asia-38",
  "tanglin-trust-school-36",
  "north-london-collegiate-school-singapore-21",
  "acs-international-singapore-1",
  "hwa-chong-international-school-16",
  "st-joseph-s-institution-international-ltd-34",
];

export default function SchoolGuideHomePage() {
  const popularSchools = popularCompareSlugs
    .map((slug) => schoolGuideSchoolGroups.find((school) => school.slug === slug || school.memberSlugs.includes(slug)))
    .filter((school): school is (typeof schoolGuideSchoolGroups)[number] => Boolean(school));

  return (
    <main>
      <section className="sg-hero">
        <div className="sg-shell sg-hero-inner">
          <div>
            <div className="sg-eyebrow">新加坡学校指南</div>
            <h1>选学校、查考试、测孩子现在的水平。</h1>
            <p>从学前到大学，先把关键信息看清楚。</p>
          </div>
        </div>
      </section>

      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-task-list">
            {[
              ["01", "找学校", "按教育阶段、课程和学校类型查找", "/school-guide/schools"],
              ["02", "查入学考试", "查看AEIS与国际学校申请和例题", "/school-guide/pathways/aeis-primary"],
              ["03", "测学习水平", "无需评估码，在小程序直接完成30–45分钟测评", "/school-guide/assessment"],
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
            <div className="sg-eyebrow">学校对比</div>
            <div>
              <h2>常被比较的8所学校</h2>
              <p>家长常比较的IB、美式与英式国际学校。</p>
            </div>
          </div>
          <div className="sg-popular-grid sg-popular-compact">
            {popularSchools.map((school) => (
              <Link className="sg-popular-card" href={`/school-guide/schools/${school.slug}`} key={school.slug}>
                <strong>{school.nameZh}</strong>
                <small>{school.name}</small>
                <b>查看学校 →</b>
              </Link>
            ))}
          </div>
          <div className="sg-actions">
            <Link className="sg-primary" href="/school-guide/compare">选择2–4所开始比较</Link>
            <Link className="sg-secondary" href="/school-guide/assessment">2分钟智能选校</Link>
          </div>
        </div>
      </section>

      <section className="sg-section">
        <div className="sg-shell sg-section-head">
          <div className="sg-eyebrow">需要进一步判断</div>
          <div><h2>保存学校后，再申请人工评估。</h2><p>先看资料，遇到具体问题再联系顾问。</p></div>
          <Link className="sg-secondary" href="/school-guide/plan">查看我的方案</Link>
        </div>
      </section>
    </main>
  );
}
