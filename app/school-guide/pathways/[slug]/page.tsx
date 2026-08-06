import { notFound } from "next/navigation";
import { getSchoolGuideDetailedPathway, getSchoolGuideSamplePack } from "@/lib/school-guide-pathways";

export default async function SchoolGuidePathwayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathway = getSchoolGuideDetailedPathway(slug);
  if (!pathway) notFound();
  const packs = pathway.samplePackSlugs.map(getSchoolGuideSamplePack).filter(Boolean);

  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">Admission pathway</div>
          <h1>{pathway.title}</h1>
          <p>{pathway.audience}</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell sg-detail-grid">
          <article className="sg-copy">
            <p>{pathway.summary}</p>
            <h2>申请步骤</h2>
            <ol>{pathway.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <h2>考试与评估</h2>
            {pathway.examSections.map((section) => <div className="sg-pathway-exam" key={section.title}><strong>{section.title}</strong><p>{section.detail}</p></div>)}
            <h2>规则与要点</h2>
            <ul>{pathway.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            <h2>材料</h2>
            <ul>{pathway.documents.map((document) => <li key={document}>{document}</li>)}</ul>
            <h2>注意事项</h2>
            <ul>{pathway.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul>
          </article>
          <aside className="sg-source-list"><div className="sg-eyebrow">例题与资料</div>
            {packs.map((pack) => pack ? <div className="sg-source" key={pack.slug}><a href={pack.downloadUrl} download>{pack.title}（PDF）</a><small>{pack.label} · {pack.duration}</small></div> : null)}
            <p>例题为博思原创准备材料，不是学校或MOE真题，也不预测正式考试。</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
