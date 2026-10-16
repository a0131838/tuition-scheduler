import type { Metadata } from "next";
import AcademicAssessment from "./AcademicAssessment";

export const metadata: Metadata = {
  title: "英语优先学习测评｜新加坡学校指南",
  description: "完成博思内部英语学习诊断；AEIS 数学可另开独立卷。",
};

export default async function AcademicAssessmentPage({ searchParams }: { searchParams: Promise<{ partner?: string }> }) {
  const { partner } = await searchParams;
  return <main>
    <section className="sg-page-head"><div className="sg-shell">
      <div className="sg-eyebrow">博思内部学习诊断</div>
      <h1>先看英语，再决定下一步</h1>
      <p>按孩子的年龄和目标选择试卷。AEIS 英语与数学分开完成，结果分别解读。</p>
    </div></section>
    <section className="sg-section"><div className="sg-shell">
      <AcademicAssessment partnerCode={typeof partner === "string" ? partner : ""} />
    </div></section>
  </main>;
}
