import ConsultForm from "./ConsultForm";

export default async function SchoolGuideConsultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const summary = [
    sp.birthDate ? `出生日期:${String(sp.birthDate)}` : "",
    sp.targetEntryYear ? `目标入学年:${String(sp.targetEntryYear)}` : "",
    sp.residency ? `身份:${String(sp.residency)}` : "",
    sp.preferredSystem ? `体系偏好:${String(sp.preferredSystem)}` : "",
  ].filter(Boolean).join("；").slice(0, 500);

  return (
    <main>
      <section className="sg-page-head">
        <div className="sg-shell">
          <div className="sg-eyebrow">人工评估</div>
          <h1>告诉我们你的问题</h1>
          <p>我们会联系你。</p>
        </div>
      </section>
      <section className="sg-section">
        <div className="sg-shell">
          <ConsultForm assessmentSummary={summary} />
        </div>
      </section>
    </main>
  );
}
