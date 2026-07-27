import AssessmentForm from "./AssessmentForm";
import { schoolGuidePathways, schoolGuideSchools } from "@/lib/school-guide-data";

export default function SchoolGuideAssessmentPage() {
  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">智能选校</div>
          <h1>先看路径，再形成学校候选清单。</h1>
          <p>结果按官方可核实信息解释“为什么适合”和“还要确认什么”，不预测录取率，也不代替学校审核。</p>
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
