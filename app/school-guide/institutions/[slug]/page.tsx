import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolGuideOfficialInstitution } from "@/lib/school-guide-official-institutions";
import { getSchoolGuideDetailedPathway, getSchoolGuideSamplePack } from "@/lib/school-guide-pathways";

export default async function InstitutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const institution = getSchoolGuideOfficialInstitution(slug);
  if (!institution) notFound();
  const pathways = institution.pathwaySlugs.map(getSchoolGuideDetailedPathway).filter(Boolean);
  const packs = institution.samplePackSlugs.map(getSchoolGuideSamplePack).filter(Boolean);
  return <main>
    <section className="sg-page-head"><div className="sg-shell"><div className="sg-eyebrow">{institution.subcategory}</div><h1>{institution.nameZh}</h1>{institution.name !== institution.nameZh ? <p>{institution.name}</p> : null}</div></section>
    <section className="sg-section"><div className="sg-shell sg-institution-profile">
      <p className="sg-institution-lead">{institution.summary}</p>
      <div className="sg-institution-facts">{institution.keyFacts.map((fact) => <div key={fact.label}><small>{fact.label}</small><strong>{fact.value}</strong></div>)}</div>
      {institution.partnerProgrammes?.length ? <section className="sg-partner-programmes">
        <div className="sg-partner-programmes-head"><span>PRIVATE HIGHER EDUCATION</span><h2>合作大学、具体专业与QS排名</h2><p>排名统一采用QS世界大学排名2027；专业按实际颁证大学归类。</p></div>
        <div className="sg-partner-programme-list">{institution.partnerProgrammes.map((partner) => <article className="sg-partner-programme-card" key={partner.partner}>
          <div className="sg-partner-programme-title"><div><small>{partner.relationship}</small><h3>{partner.partnerZh}</h3><p>{partner.partner}</p></div><strong>{partner.qsRanking}</strong></div>
          {partner.statusNote ? <p className="sg-partner-status">{partner.statusNote}</p> : null}
          <div className="sg-programme-groups">{partner.programmeGroups.map((group) => <div key={group.level}><h4>{group.level}</h4><ul>{group.programmes.map((programme) => <li key={programme}>{programme}</li>)}</ul></div>)}</div>
        </article>)}</div>
      </section> : null}
      <article className="sg-copy">{institution.sections.map((section, index) => <details className="sg-school-detail-section" key={section.title} open={index === 0}><summary>{section.title}</summary><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></details>)}</article>
      {pathways.length ? <section className="sg-linked-block"><h2>申请路径</h2>{pathways.map((item) => item ? <Link href={`/school-guide/pathways/${item.slug}`} key={item.slug}><strong>{item.title}</strong><span>{item.audience}</span><b>→</b></Link> : null)}</section> : null}
      {packs.length ? <section className="sg-linked-block"><h2>例题与申请资料</h2>{packs.map((pack) => pack ? <a href={pack.downloadUrl} download key={pack.slug}><strong>{pack.title}</strong><span>{pack.label} · {pack.duration}</span><b>PDF</b></a> : null)}</section> : null}
      <div className="sg-source-note"><strong>资料来源</strong><span>{institution.sourceAuthority}</span><p>{institution.sourceNote}</p><small>更新于 {institution.updatedAt}</small></div>
      <div className="sg-actions"><Link className="sg-secondary" href="/school-guide/assessment">做学习评估</Link><Link className="sg-primary" href={`/school-guide/consult?summary=${encodeURIComponent(`希望了解${institution.nameZh}的申请与准备方案`)}`}>咨询申请方案</Link></div>
    </div></section>
  </main>;
}
