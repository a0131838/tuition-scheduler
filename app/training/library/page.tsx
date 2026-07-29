import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { trainingModulesForUser, trainingRolesForUser } from "@/lib/training-center";

const card = {
  border: "1px solid #dbe5ef",
  borderRadius: 16,
  padding: 18,
  background: "#fff",
};

export default async function TrainingPdfLibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role === "STUDENT") redirect("/");

  const lang = await getLang();
  const text = (en: string, zh: string) => t(lang, en, zh);
  const roles = trainingRolesForUser(user.role, user.trainingRoles);
  const modules = trainingModulesForUser(user.role, user.trainingRoles);
  const categories = new Map<string, typeof modules>();

  for (const item of modules) {
    const key = text(item.categoryEn, item.category);
    categories.set(key, [...(categories.get(key) ?? []), item]);
  }

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh", color: "#172033" }}>
      <section style={{ ...card, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)", marginBottom: 18 }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>SGT PDF LIBRARY / PDF 资料库</div>
        <h1 style={{ margin: "8px 0" }}>{text("Training PDF Download Centre", "培训 PDF 下载中心")}</h1>
        <p>
          {text(
            "View or download the current step-by-step bilingual guides assigned to your roles at any time.",
            "随时查看或下载分配给本人岗位的现行中英双语逐步教学资料。"
          )}
        </p>
        <p style={{ color: "#475569" }}>
          {text("Training roles", "培训岗位")}：{roles.join(" / ")} · {text("Available PDFs", "可用 PDF")}：{modules.length}
          {user.role === "ADMIN"
            ? ` · ${text("Administrator full-library oversight", "管理员全资料库监督模式")}`
            : ""}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/training">{text("Back to My Training", "返回我的培训")}</Link>
          <a href="/api/training/sops/SYSTEM_OPERATION_MAP?download=1" download>
            {text("Download Full-System Map", "下载全系统流程地图")}
          </a>
        </div>
      </section>

      <section style={{ ...card, marginBottom: 18, borderColor: "#99f6e4", background: "#f0fdfa" }}>
        <strong>{text("How to use these guides", "教材使用方法")}</strong>
        <p style={{ marginBottom: 0 }}>
          {text(
            "Keep the PDF beside the system, complete one numbered step at a time, and stop to ask your manager whenever the page, permission, record, amount, or final status differs.",
            "把 PDF 与系统并排打开，每次只完成一个编号步骤；页面、权限、对象、金额或最终状态不一致时立即停止并询问主管。"
          )}
        </p>
      </section>

      <div style={{ display: "grid", gap: 20 }}>
        {[...categories.entries()].map(([category, items]) => (
          <section key={category}>
            <h2 style={{ margin: "0 0 10px" }}>{category}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 12 }}>
              {items.map((item) => (
                <article key={item.code} style={card}>
                  <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>{item.code}</div>
                  <h3 style={{ margin: "7px 0" }}>{text(item.titleEn, item.title)}</h3>
                  <p style={{ color: "#64748b", fontSize: 13 }}>
                    v{item.version} · {text("For", "适用岗位")}：{item.roles.join(" / ")}
                  </p>
                  <p style={{ fontSize: 13 }}>
                    {text(
                      "Beginner format: preparation, numbered actions, real system screenshots, save checks, stop conditions, and final checklist.",
                      "小白版结构：操作前准备、编号动作、真实系统截图、保存检查、停止条件和最终检查表。"
                    )}
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <a href={`/api/training/sops/${item.code}`} target="_blank" rel="noreferrer">
                      {text("View PDF", "查看 PDF")}
                    </a>
                    <a href={`/api/training/sops/${item.code}?download=1`} download>
                      {text("Download PDF", "下载 PDF")}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
