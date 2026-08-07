import { notFound } from "next/navigation";
import { getSchoolGuideSchoolGroup } from "@/lib/school-guide-directory";
import { getSchoolGuideDetailedPathway, getSchoolGuideSamplePack } from "@/lib/school-guide-pathways";
import SchoolDetailTabs from "./SchoolDetailTabs";

export default async function SchoolGuideSchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = getSchoolGuideSchoolGroup(slug);
  if (!school) notFound();
  const pathway = getSchoolGuideDetailedPathway("international-school-direct");
  const secondary = /grade 6|year 7|secondary|中学|18岁/i.test(school.comparison?.ageAndGrades || "");
  const pack = getSchoolGuideSamplePack(secondary ? "international-secondary-sample" : "international-primary-sample");
  return <main>
    <section className="sg-page-head"><div className="sg-shell"><div className="sg-eyebrow">国际学校 · {school.browseLabel}</div><h1>{school.nameZh}</h1><p>{school.name}</p></div></section>
    <section className="sg-section"><div className="sg-shell sg-school-profile">
      <div className="sg-school-snapshot">
        <div><small>年龄与年级</small><strong>{school.comparison?.ageAndGrades || "学校未公开"}</strong></div>
        <div><small>课程体系</small><strong>{school.comparison?.curriculum || school.category}</strong></div>
        <div><small>学生准证</small><strong>{school.studentPass?.label || "需向学校书面确认"}</strong></div>
        <div><small>首年固定费用</small><strong>{school.costProfile ? `S$${school.costProfile.fixedFirstYearLow.toLocaleString("en-SG")}–S$${school.costProfile.fixedFirstYearHigh.toLocaleString("en-SG")}` : "学校未公开"}</strong></div>
      </div>
      <SchoolDetailTabs school={school} pathway={pathway} pack={pack} />
      <div className="sg-school-update">更新于 {school.publicUpdatedAt} · 下次复核 {school.nextPublicReviewAt}</div>
    </div></section>
  </main>;
}
