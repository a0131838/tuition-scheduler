import AssessmentForm from "./AssessmentForm";
import { schoolGuidePathways, schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideAssessmentPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">智能选校</div>
          <h1>生成你的候选学校</h1>
          <p>填写基本条件，查看匹配学校。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <AssessmentForm pathways={schoolGuidePathways} schools={schoolGuideSchools} />
        </div>
      </section>
    </main>
  );
}
