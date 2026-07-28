import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { OPERATION_AREAS, operationAreaForRoute } from "../lib/training-operation-coverage.ts";

const root = process.cwd();
const htmlPath = path.join(root, "docs", "SOP-全系统操作流程地图-培训版-20260728.html");
const pdfPath = path.join(root, "output", "pdf", "00-SGT全系统操作流程地图-培训版-20260728.pdf");
const matrixPath = path.join(root, "docs", "培训中心", "系统操作流程覆盖矩阵-20260728.md");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageRoute(file) {
  const relative = path.relative(path.join(root, "app"), file).replaceAll(path.sep, "/");
  const withoutPage = relative.replace(/\/?page\.tsx$/, "");
  return withoutPage ? `/${withoutPage}` : "/";
}

const webRoutes = walk(path.join(root, "app"))
  .filter((file) => file.endsWith("page.tsx"))
  .map(pageRoute)
  .sort();
const miniappConfig = JSON.parse(
  fs.readFileSync(path.join(root, "miniapp", "boss-academic-parent", "app.json"), "utf8")
);
const miniappRoutes = (miniappConfig.pages ?? []).map((page) => `/miniapp/${page}`).sort();
const routes = [...webRoutes, ...miniappRoutes];

const unmapped = routes.filter((route) => !operationAreaForRoute(route));
if (unmapped.length) throw new Error(`Unmapped page routes: ${unmapped.join(", ")}`);

const screenshots = {
  ACCESS: "assets/sop-resource-followup-20260529/annotated/admin-users.png",
  TRAINING: "assets/sop-resource-followup-20260529/annotated/admin-users.png",
  SCHOOL_APPLICATION: "assets/sop-school-application-service-20260605/annotated/01-student-entry.png",
  COMMUNICATION: "assets/sop-家长沟通通知中心-20260718/annotated/05-admin-communication-monitor.png",
  REPORTING: "assets/sop-manager-teacher-feedback-20260623/annotated/03-admin-recent-feedback-status.png",
  LEADS_GUIDE: "assets/sop-resource-followup-20260529/annotated/sales-workspace.png",
  WORK_CONTROL: "assets/sop-小程序员工工作台-20260718/annotated/01-academic-home.png",
  EDUTRUST: "assets/sop-edutrust-contract-20260622/annotated/01-edutrust-overview.png",
  CARE: "assets/sop-全托管-20260713/annotated/01-care-overview.png",
  FINANCE: "assets/sop-finance-partner-credit-note-20260714/annotated/01-entry.png",
  PACKAGES_CONTRACTS: "assets/sop-student-contract-20260604/annotated/06-package-billing-check.png",
  SCHEDULING: "assets/sop-小程序员工工作台-20260718/annotated/08-academic-schedule.png",
  STUDENTS: "assets/sop-student-contract-20260604/annotated/01-admin-students-list.png",
  TEACHERS: "assets/sop-tutor-payment-profile-20260529/teacher/01-payment-details-current-annotated.png",
  MANAGEMENT: "assets/sop-小程序员工工作台-20260718/annotated/09-management-home.png",
  DASHBOARD: "assets/sop-小程序员工工作台-20260718/annotated/13-management-account-switch.png",
};

const esc = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const areaPages = OPERATION_AREAS.map((area, index) => {
  const areaRoutes = routes.filter((route) => operationAreaForRoute(route)?.code === area.code);
  const image = screenshots[area.code];
  const imagePath = image ? path.join(root, "docs", image) : "";
  const imageHtml = image && fs.existsSync(imagePath)
    ? `<div class="shot"><img src="${esc(image)}"><div class="caption">真实系统截图示例；具体步骤以对应详细 SOP 为准。</div></div>`
    : "<!-- 当前流程以现行详细 SOP 截图为准 -->";
  return `
    <section class="page">
      <header><span>${String(index + 1).padStart(2, "0")} / ${OPERATION_AREAS.length}</span><span>${esc(area.level)}</span></header>
      <h1>${esc(area.title)}</h1>
      <div class="grid">
        <div>
          <div class="green"><b>最终完成结果</b><br>${esc(area.outcome)}</div>
          <h2>谁负责</h2><p>${esc(area.owners.join(" / "))}</p>
          <h2>对应培训模块</h2><p>${esc(area.moduleCodes.join("、"))}</p>
          <h2>系统入口（${areaRoutes.length} 个页面）</h2>
          <div class="routes">${areaRoutes.map((route) => `<code>${esc(route)}</code>`).join("")}</div>
          <div class="danger"><b>停止条件：</b>页面、权限、按钮或状态与现行 SOP 不一致，或操作会影响合同、课包、财务、工资、家长可见内容时，停止并找主管确认。</div>
        </div>
        ${imageHtml}
      </div>
    </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>SGT 全系统操作流程地图</title>
<style>
@page { size: A4 landscape; margin: 14mm 12mm; }
* { box-sizing: border-box; } body { margin: 0; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; }
.page { height: 181mm; page-break-after: always; position: relative; overflow: hidden; break-inside: avoid; }
.page:last-child { page-break-after: auto; } header { display: flex; justify-content: space-between; color: #64748b; font-size: 10pt; border-bottom: 1px solid #dbe5ef; padding-bottom: 3mm; }
h1 { font-size: 25pt; margin: 8mm 0 5mm; } h2 { font-size: 13pt; margin: 4mm 0 1.5mm; } p { margin: 0 0 3mm; line-height: 1.55; }
.cover { display: grid; align-content: center; background: linear-gradient(135deg,#ecfdf5,#eff6ff); padding: 16mm; border-radius: 8mm; }
.cover h1 { font-size: 34pt; color: #0f766e; }.cover .meta { font-size: 15pt; line-height: 1.8; }
.grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 8mm; }
.green,.amber,.danger { border-radius: 4mm; padding: 4mm; line-height: 1.55; margin-bottom: 3mm; }
.green { background: #ecfdf5; border: 1px solid #86efac; }.amber { background: #fffbeb; border: 1px solid #fcd34d; }.danger { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
.routes { display: grid; grid-template-columns: 1fr 1fr; gap: .7mm 1mm; }
code { background: #f1f5f9; border: 1px solid #dbe5ef; padding: .45mm .8mm; border-radius: 1mm; font-size: 6.2pt; line-height: 1.15; overflow-wrap: anywhere; }
.shot { border: 1px solid #cbd5e1; border-radius: 4mm; overflow: hidden; align-self: start; background: #fff; }
.shot img { display: block; width: 100%; max-height: 82mm; object-fit: contain; background: #f8fafc; }.caption { padding: 2.5mm; color: #475569; font-size: 9pt; }
ol { line-height: 1.7; }.summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 4mm; margin-top: 8mm; }.metric { padding: 5mm; border-radius: 4mm; background: #fff; border: 1px solid #dbe5ef; }.metric b { display:block;font-size:25pt;color:#0f766e; }
</style></head><body>
<section class="page cover">
  <div><b>SGT TRAINING CENTER / 共同必修</b><h1>全系统操作流程地图</h1>
  <div class="meta">适用：Admin / Finance / Sales / CS / Teacher<br>版本：2026-07-28<br>截图：来自当前 SGT 系统的真实角色页面，已使用既有红框标注素材</div>
  <div class="summary"><div class="metric"><b>${routes.length}</b>网页＋小程序页面</div><div class="metric"><b>${OPERATION_AREAS.length}</b>主操作流程</div><div class="metric"><b>23</b>培训模块</div><div class="metric"><b>0</b>未归类页面</div></div></div>
</section>
<section class="page">
  <header><span>使用方法</span><span>先地图，后详细 SOP</span></header><h1>不是一个页面一份 SOP，而是一个业务结果一条完整流程</h1>
  <div class="grid"><div>
  <div class="green"><b>正确使用顺序</b><ol><li>先在本地图找到业务目标。</li><li>确认负责人、系统入口和最终完成结果。</li><li>打开列出的详细培训模块，按步骤操作。</li><li>遇到停止条件，记录当前状态并升级主管。</li><li>完成后按检查表和系统最终状态验收。</li></ol></div>
  <div class="amber">页面数量不等于流程数量：创建、查看、审批、导出和历史页可能属于同一业务流程；系统自动任务不要求员工逐页操作。</div></div>
  <div><h2>覆盖等级</h2><p><b>DETAILED_SOP</b>：已有专项逐步 SOP。</p><p><b>MASTER_SOP</b>：由岗位主 SOP 覆盖多个关联页面。</p><p><b>SYSTEM_GUIDE</b>：登录、导航、工作台等系统使用说明。</p>
  <div class="danger">本地图负责“所有入口不遗漏”；详细 SOP 负责“关键操作不出错”。两者必须配套使用。</div></div></div>
</section>
${areaPages}
<section class="page">
  <header><span>培训验收</span><span>版本 2026-07-28</span></header><h1>员工必须能说清四件事</h1>
  <div class="grid"><div class="green"><ol><li>我的任务属于哪条主流程？</li><li>正确入口和对应现行 SOP 是什么？</li><li>什么系统状态才代表真正完成？</li><li>遇到缺资料、权限或高风险异常时找谁？</li></ol></div>
  <div><div class="amber">知识检查 80 分及格；实操使用培训数据；主管验收后才算完成。</div><div class="danger">培训岗位只决定课程分配，不增加任何系统操作权限。</div></div></div>
</section>
</body></html>`;

async function main() {
  fs.writeFileSync(htmlPath, html);

  const matrix = [
  "# SGT 系统操作流程覆盖矩阵",
  "",
  `盘点日期：2026-07-28`,
  `页面范围：${webRoutes.length} 个网页页面 + ${miniappRoutes.length} 个微信小程序页面，共 ${routes.length} 个可见页面`,
  `主流程：${OPERATION_AREAS.length} 条`,
  `未归类：${unmapped.length} 个`,
  "",
  "| 主流程 | 负责人 | 覆盖等级 | 页面数 | 对应培训模块 |",
  "| --- | --- | --- | ---: | --- |",
  ...OPERATION_AREAS.map((area) => {
    const count = routes.filter((route) => operationAreaForRoute(route)?.code === area.code).length;
    return `| ${area.title} | ${area.owners.join(" / ")} | ${area.level} | ${count} | ${area.moduleCodes.join("、")} |`;
  }),
  "",
  "## 全部页面映射",
  "",
  ...routes.map((route) => {
    const area = operationAreaForRoute(route)!;
    return `- \`${route}\` → ${area.title}（${area.level}）`;
  }),
  "",
  ].join("\n");
  fs.writeFileSync(matrixPath, matrix);

  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.pdf({ path: pdfPath, format: "A4", landscape: true, printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ htmlPath, pdfPath, matrixPath, routes: routes.length, areas: OPERATION_AREAS.length, unmapped: unmapped.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
