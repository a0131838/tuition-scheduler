import SchoolExplorer from "./SchoolExplorer";
import { schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideSchoolsPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">International schools</div>
          <h1>新加坡国际学校目录</h1>
          <p>按已确认的业务梯队浏览学校；梯队不是官方排名。招生事实仍只采用IB和学校官方来源，未核实内容不会补写。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <SchoolExplorer schools={schoolGuideSchools} />
        </div>
      </section>
    </main>
  );
}
