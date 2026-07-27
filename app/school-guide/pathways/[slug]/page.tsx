import { notFound } from "next/navigation";
import { getOfficialSource, getSchoolGuidePathway } from "@/lib/school-guide-data";

export default async function SchoolGuidePathwayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathway = getSchoolGuidePathway(slug);
  if (!pathway) notFound();
  const sources = pathway.sourceIds.map(getOfficialSource).filter(Boolean);

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
            <h2>申请要点</h2>
            <ul>{pathway.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            <h2>注意事项</h2>
            <ul>{pathway.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul>
          </article>
          <aside className="sg-source-list">
            <div className="sg-eyebrow">官方来源</div>
            {sources.map((source) => source ? (
              <div className="sg-source" key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
                <small>{source.authority}</small>
              </div>
            ) : null)}
          </aside>
        </div>
      </section>
    </main>
  );
}
