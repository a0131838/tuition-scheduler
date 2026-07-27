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
          <div className="sg-eyebrow">Human review</div>
          <h1>把不确定的问题交给人工核对。</h1>
          <p>提交后会进入现有资源跟进系统。顾问核对官方资格、目标学校和时间，不以自动测评代替正式结论。</p>
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
