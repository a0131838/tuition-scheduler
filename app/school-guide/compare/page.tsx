import CompareSchools from "./CompareSchools";
import { schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideComparePage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">学校对比</div>
          <h1>把学校放在一起看</h1>
          <p>最多选择4所。</p>
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
