import Link from "next/link";
import { SCHOOL_GUIDE_DATA_VERSION, schoolGuidePathways, schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideHomePage() {
  return (
    <main>
      <section className="sg-hero">
        <div className="sg-shell sg-hero-inner">
          <div>
            <div className="sg-eyebrow">Singapore School Guide</div>
            <h1>先看清路径，再选择学校。</h1>
            <p>用MOE、IB和学校官方资料，判断孩子适合政府学校、AEIS还是国际学校申请。</p>
            <div className="sg-actions">
              <Link className="sg-primary" href="/school-guide/assessment">开始家庭测评</Link>
              <Link className="sg-secondary" href="/school-guide/schools">查看官方学校目录</Link>
            </div>
          </div>
          <div className="sg-compass" aria-label="择校方向图形">
            <div className="sg-compass-mark" />
            <div className="sg-compass-label">官方资料核实版本 {SCHOOL_GUIDE_DATA_VERSION}</div>
          </div>
        </div>
      </section>

      <section className="sg-section" id="pathways">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">先选路径</div>
            <div>
              <h2>学校不同，申请规则完全不同。</h2>
              <p className="sg-section-intro">
                政府学校由MOE规则决定，国际学校由各校招生办公室决定。我们先根据身份、年龄和入学年份找到可行路径。
              </p>
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

      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">官方学校入口</div>
            <div>
              <h2>政府学校直达MOE，国际学校按梯队和官方资料查看。</h2>
              <p className="sg-section-intro">
                当前收录{schoolGuideSchools.length}条学校记录，其中IB状态来自IB官方目录；其他学校使用学校官网。没有完成逐校核实的费用、年龄和考试要求，不会用第三方资料补齐。
              </p>
            </div>
          </div>
          <div className="sg-actions">
            <Link className="sg-primary" href="/school-guide/schools">浏览国际学校梯队</Link>
            <a className="sg-secondary" href="https://www.moe.gov.sg/schoolfinder" target="_blank" rel="noreferrer">
              打开MOE SchoolFinder ↗
            </a>
          </div>
        </div>
      </section>

      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div className="sg-eyebrow">资料原则</div>
            <div>
              <h2>知道就是知道，不确定就明确标出。</h2>
            </div>
          </div>
          <div className="sg-trust">
            <div>
              <strong>官方来源</strong>
              <p>招生资格、年龄、考试、费用和日期优先使用MOE、IB、SSG及学校官方网站。</p>
            </div>
            <div>
              <strong>核实日期</strong>
              <p>每条来源记录核实时间和适用范围，过期内容进入复核，不继续当作当前事实。</p>
            </div>
            <div>
              <strong>不保证录取</strong>
              <p>测评只整理可能路径，最终资格、学额、考试和录取结果由官方机构或学校决定。</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
