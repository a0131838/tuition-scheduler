import Link from "next/link";
import { schoolGuideCases } from "@/lib/school-guide-data";

export default function SchoolGuideCasesPage() {
  const cases = schoolGuideCases.filter((item) => item.published && item.consentRecorded && item.anonymized);
  return (
    <main>
      <section className="sg-page-head"><div className="sg-shell">
        <div className="sg-eyebrow">真实案例</div>
        <h1>看看相似家庭怎么选</h1>
      </div></section>
      <section className="sg-section"><div className="sg-shell">
        {cases.length ? cases.map((item) => (
          <article className="sg-case-card" key={item.id}><h2>{item.title}</h2><p>{item.summary}</p></article>
        )) : (
          <div className="sg-empty">
            <h2>暂无案例</h2>
            <Link className="sg-primary" href="/school-guide/assessment">开始智能选校</Link>
          </div>
        )}
      </div></section>
    </main>
  );
}
