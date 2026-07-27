import Link from "next/link";
import { schoolGuideCases } from "@/lib/school-guide-data";

export default function SchoolGuideCasesPage() {
  const cases = schoolGuideCases.filter((item) => item.published && item.consentRecorded && item.anonymized);
  return (
    <main>
      <section className="sg-page-head"><div className="sg-shell">
        <div className="sg-eyebrow">真实案例</div>
        <h1>看相似家庭如何形成选择。</h1>
        <p>案例用于理解决策过程，不包装录取结果，也不能推导个人录取概率。</p>
      </div></section>
      <section className="sg-section"><div className="sg-shell">
        {cases.length ? cases.map((item) => (
          <article className="sg-case-card" key={item.id}><span>已获授权 · 已匿名</span><h2>{item.title}</h2><p>{item.summary}</p></article>
        )) : (
          <div className="sg-empty">
            <div className="sg-eyebrow">案例库准备中</div>
            <h2>目前没有达到发布标准的真实案例。</h2>
            <p>只有取得明确授权、完成匿名化并经人工审核的案例才会出现。现阶段不会使用虚构案例填充页面。</p>
            <Link className="sg-primary" href="/school-guide/assessment">先做智能选校</Link>
          </div>
        )}
        <div className="sg-trust">
          <div><strong>明确授权</strong><p>家庭确认可公开的范围和用途。</p></div>
          <div><strong>彻底匿名</strong><p>移除姓名、联系方式和可识别细节。</p></div>
          <div><strong>人工复核</strong><p>事实、措辞和官方规则逐项检查。</p></div>
        </div>
      </div></section>
    </main>
  );
}
