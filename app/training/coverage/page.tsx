import Link from "next/link";
import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { OPERATION_AREAS } from "@/lib/training-operation-coverage";
import { redirect } from "next/navigation";

export default async function TrainingCoveragePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!(await isManagerUser(user))) redirect("/training");

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh", color: "#172033" }}>
      <section style={{ border: "1px solid #dbe5ef", borderRadius: 18, padding: 18, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)" }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>OPERATION COVERAGE / 操作覆盖</div>
        <h1>全系统操作流程覆盖图</h1>
        <p>系统可见页面按业务结果归入 {OPERATION_AREAS.length} 条主流程。详细 SOP、主 SOP 和系统指引共同覆盖，不按“一个页面一份 PDF”重复制作。</p>
        <p><Link href="/training">返回培训中心</Link> · <a href="/api/training/sops/SYSTEM_OPERATION_MAP" target="_blank">打开流程地图 PDF</a></p>
      </section>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {OPERATION_AREAS.map((area) => (
          <section key={area.code} style={{ border: "1px solid #dbe5ef", borderRadius: 16, padding: 16, background: "white" }}>
            <strong>{area.title}</strong>
            <p style={{ color: "#475569" }}>负责人：{area.owners.join(" / ")} · 覆盖等级：{area.level}</p>
            <p>{area.outcome}</p>
            <small>入口：{area.routePrefixes.join("、")}<br />对应模块：{area.moduleCodes.join("、")}</small>
          </section>
        ))}
      </div>
    </main>
  );
}
