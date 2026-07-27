import { schoolGuideSchools } from "@/lib/school-guide-data";
import SchoolPlan from "./SchoolPlan";

export default function SchoolGuidePlanPage() {
  return <main>
    <section className="sg-page-head"><div className="sg-shell"><div className="sg-eyebrow">我的方案</div><h1>把“感兴趣”变成下一步行动。</h1><p>集中保存学校、费用依据、当前状态和待确认问题。数据仅保存在当前浏览器。</p></div></section>
    <section className="sg-section"><div className="sg-shell"><SchoolPlan schools={schoolGuideSchools} /></div></section>
  </main>;
}
