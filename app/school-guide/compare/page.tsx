import CompareSchools from "./CompareSchools";
import { schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideComparePage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">Compare schools</div>
          <h1>只比较已经核实的事实。</h1>
          <p>最多选择4所，比较年龄、课程、校区、招生评估、英语支持、寄宿和首年固定费用范围。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <CompareSchools schools={schoolGuideSchools} />
        </div>
      </section>
    </main>
  );
}
