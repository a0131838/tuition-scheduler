import Link from "next/link";
import SchoolExplorer from "./SchoolExplorer";
import { schoolGuideSchools, schoolGuideSectors } from "@/lib/school-guide-data";

const stages = ["学前", "小学", "中学", "高中与专上", "特殊与其他"] as const;

export default function SchoolGuideSchoolsPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">找学校</div>
          <h1>新加坡学校与教育机构</h1>
          <p>先按教育阶段和学校类型选择，再进入官方目录或详细学校资料。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div>
              <div className="sg-eyebrow">完整教育体系</div>
              <h2>从学前到大学</h2>
            </div>
            <p className="sg-section-intro">政府学校以MOE为准，学前教育以ECDA为准，私立教育机构以SSG为准。</p>
          </div>
          {stages.map((stage) => (
            <div className="sg-sector-group" key={stage}>
              <h3>{stage}</h3>
              <div className="sg-sector-grid">
                {schoolGuideSectors.filter((item) => item.stage === stage).map((item) => {
                  const content = (
                    <>
                      <span>{item.authority}</span>
                      <strong>{item.title}</strong>
                      <p>{item.summary}</p>
                      <small>{item.includes.join(" · ")}</small>
                      <b>查看 →</b>
                    </>
                  );
                  return item.internalHref ? (
                    <Link className="sg-sector-card" href={item.internalHref} key={item.id}>{content}</Link>
                  ) : (
                    <a className="sg-sector-card" href={item.officialUrl} target="_blank" rel="noreferrer" key={item.id}>{content}</a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="sg-section" id="international-directory">
        <div className="sg-shell">
          <div className="sg-section-head">
            <div>
              <div className="sg-eyebrow">国际学校详细目录</div>
              <h2>搜索与比较</h2>
            </div>
            <p className="sg-section-intro">已逐校核实的资料显示年龄、课程、申请和费用；其余记录只保留官方目录事实。</p>
          </div>
          <SchoolExplorer schools={schoolGuideSchools} />
        </div>
      </section>
    </main>
  );
}
