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
  const platformSections = (["WEB", "MINIAPP"] as const).map((platform) => {
    const platformModules = modules.filter((item) => item.platform === platform);
    const categories = new Map<string, typeof modules>();
    for (const item of platformModules) {
      const key = text(item.categoryEn, item.category);
      categories.set(key, [...(categories.get(key) ?? []), item]);
    }
    return { platform, platformModules, categories };
  });

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
          <a href="/api/training/catalogs/web?download=1" download>
            {text("Download Web Catalogue", "下载网页端目录")}
          </a>
          <a href="/api/training/catalogs/miniapp?download=1" download>
            {text("Download Mini Program Catalogue", "下载小程序目录")}
          </a>
        </div>
      </section>

      <section style={{ ...card, marginBottom: 18, borderColor: "#99f6e4", background: "#f0fdfa" }}>
        <strong>{text("How to use these guides", "教材使用方法")}</strong>
        <p style={{ marginBottom: 0 }}>
          {text(
            "Choose Web or Mini Program first. Each PDF covers one function and contains the complete Chinese section before the complete English section. Complete one numbered step at a time.",
            "先选择网页端或小程序。每份 PDF 只讲一个功能，先完整中文版、再完整英文版；每次只完成一个编号步骤。"
          )}
        </p>
      </section>

      <div style={{ display: "grid", gap: 28 }}>
        {platformSections.map(({ platform, platformModules, categories }) => (
          <section key={platform} style={{ border: "2px solid #cbd5e1", borderRadius: 20, padding: 18, background: platform === "WEB" ? "#f8fbff" : "#fffaf5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: platform === "WEB" ? "#1d4ed8" : "#c2410c", fontWeight: 900, fontSize: 12 }}>{platform}</div>
                <h2 style={{ margin: "5px 0" }}>{platform === "WEB" ? text("Web System Training", "网页端功能培训") : text("WeChat Mini Program Training", "微信小程序功能培训")}</h2>
                <p style={{ margin: 0, color: "#64748b" }}>{text("Functions", "功能文档")}：{platformModules.length}</p>
              </div>
              <a href={`/api/training/catalogs/${platform === "WEB" ? "web" : "miniapp"}?download=1`} download>
                {text("Download this platform catalogue", "下载本平台目录")}
              </a>
            </div>
            <div style={{ display: "grid", gap: 20, marginTop: 18 }}>
              {[...categories.entries()].map(([category, items]) => (
                <section key={`${platform}-${category}`}>
                  <h3 style={{ margin: "0 0 10px" }}>{category}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 12 }}>
                    {items.map((item) => (
                      <article key={item.code} style={card}>
                        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>{item.code}</div>
                        <h3 style={{ margin: "7px 0" }}>{text(item.titleEn, item.title)}</h3>
                        <p style={{ color: "#64748b", fontSize: 13 }}>v{item.version} · {text("For", "适用岗位")}：{item.roles.join(" / ")}</p>
                        <p style={{ fontSize: 13 }}>{text("One function only: complete Chinese section, language divider, then complete English section.", "只讲一个功能：完整中文版、语言分隔页、完整英文版。")}</p>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <a href={`/api/training/sops/${item.code}`} target="_blank" rel="noreferrer">{text("View PDF", "查看 PDF")}</a>
                          <a href={`/api/training/sops/${item.code}?download=1`} download>{text("Download PDF", "下载 PDF")}</a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
