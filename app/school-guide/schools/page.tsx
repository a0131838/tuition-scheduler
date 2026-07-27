import SchoolExplorer from "./SchoolExplorer";
import { schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideSchoolsPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">找学校</div>
          <h1>新加坡国际学校</h1>
          <p>搜索或按梯队筛选。</p>
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
