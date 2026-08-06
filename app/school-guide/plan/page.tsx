import { schoolGuideSchoolGroups } from "@/lib/school-guide-directory";
import SchoolPlan from "./SchoolPlan";

export default function SchoolGuidePlanPage() {
  return <main>
    <section className="sg-page-head"><div className="sg-shell"><div className="sg-eyebrow">我的方案</div><h1>已选学校</h1><p>保存学校和下一步。</p></div></section>
    <section className="sg-section"><div className="sg-shell"><SchoolPlan schools={schoolGuideSchoolGroups} /></div></section>
  </main>;
}
