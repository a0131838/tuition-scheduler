import AssessmentForm from "./AssessmentForm";
import { schoolGuidePathways } from "@/lib/school-guide-data";

export default function SchoolGuideAssessmentPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">2-minute assessment</div>
          <h1>先判断可能路径。</h1>
          <p>第一步只使用出生日期、目标年份、身份和学校体系。结果不会替代MOE或学校的正式资格确认。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <AssessmentForm pathways={schoolGuidePathways} />
        </div>
      </section>
    </main>
  );
}
