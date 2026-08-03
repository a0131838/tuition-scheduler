import Link from "next/link";
import { getCurrentUser, isManagerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trainingModulesForUser, trainingRolesForUser } from "@/lib/training-center";
import { redirect } from "next/navigation";
import { acknowledgeTrainingRead, submitTrainingPractical, submitTrainingQuiz } from "./actions";
import { getLang, t } from "@/lib/i18n";

const card = { border: "1px solid #dbe5ef", borderRadius: 18, padding: 18, background: "#fff" };

export default async function TrainingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role === "STUDENT") redirect("/");
  const trainingRoles = trainingRolesForUser(user.role, user.trainingRoles);
  const phaseRank = { FOUNDATION: 0, CORE: 1, SPECIALIST: 2 } as const;
  const modules = [...trainingModulesForUser(user.role, user.trainingRoles)].sort(
    (a, b) => a.platform.localeCompare(b.platform) || phaseRank[a.phase] - phaseRank[b.phase] || a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
  );
  const progresses = await prisma.staffTrainingProgress.findMany({ where: { userId: user.id } });
  const byKey = new Map(progresses.map((item) => [`${item.moduleCode}:${item.moduleVersion}`, item]));
  const manager = await isManagerUser(user);
  const lang = await getLang();
  const moduleText = (en: string, zh: string) => t(lang, en, zh);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh", color: "#172033" }}>
      <div style={{ ...card, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)", marginBottom: 18 }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>SGT TRAINING CENTER / 员工培训中心</div>
        <h1 style={{ margin: "8px 0" }}>{moduleText("Required Training for My Roles", "我的岗位必修")}</h1>
        <p>{moduleText("Completion standard: read the current SOP → score at least 80% → practise with training data → manager sign-off.", "完成标准：阅读当前 SOP → 测验 80 分以上 → 培训数据实操 → 主管验收。")}</p>
        <p style={{ color: "#475569" }}>{moduleText("Current training roles", "当前培训岗位")}：{trainingRoles.join(" / ") || moduleText("No staff training role", "无员工培训岗位")}（{moduleText("the primary role is included automatically; managers assign additional training roles", "主角色自动包含，附加岗位由管理者分配")}）</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={user.role === "TEACHER" ? "/teacher" : "/admin"}>{moduleText("Back to Workspace", "返回工作台")}</Link>
          <Link href="/training/library">{moduleText("PDF Download Centre", "PDF 下载中心")}</Link>
          {manager ? <Link href="/training/manage">{moduleText("Manager Sign-off", "主管验收台")}</Link> : null}
        </div>
      </div>
      <section style={{ ...card, marginBottom: 16, borderColor: "#99f6e4", background: "#f0fdfa" }}>
        <strong>{moduleText("Recommended learning order", "建议学习顺序")}</strong>
        <p style={{ marginBottom: 0 }}>
          1. {moduleText("Foundation and login", "基础与登录")} → 2. {moduleText("Role core workflows", "岗位核心流程")} → 3. {moduleText("Specialist scenarios", "专项场景")}。
          {moduleText(" Complete one module at a time; do not submit practical evidence before reading and passing its quiz.", " 每次只完成一个模块；未阅读并通过测验前不能提交实操。")}
        </p>
      </section>
      <div style={{ display: "grid", gap: 16 }}>
        {(["WEB", "MINIAPP"] as const).map((platform) => (
          <section key={platform} style={{ display: "grid", gap: 16, border: "2px solid #cbd5e1", borderRadius: 20, padding: 16, background: platform === "WEB" ? "#f8fbff" : "#fffaf5" }}>
            <div>
              <div style={{ color: platform === "WEB" ? "#1d4ed8" : "#c2410c", fontWeight: 900, fontSize: 12 }}>{platform}</div>
              <h2 style={{ margin: "5px 0" }}>{platform === "WEB" ? moduleText("Web System Training", "网页端功能培训") : moduleText("WeChat Mini Program Training", "微信小程序功能培训")}</h2>
              <p style={{ margin: 0, color: "#64748b" }}>{moduleText("Complete this platform separately. Do not switch between Web and Mini Program during one module.", "本平台单独学习；完成一个模块期间不要在网页端和小程序之间来回切换。")}</p>
            </div>
            {modules.filter((item) => item.platform === platform).map((item) => {
          const progress = byKey.get(`${item.code}:${item.version}`);
          const complete = Boolean(progress?.readAt && progress?.quizPassedAt && progress?.practicalStatus === "APPROVED");
          const practicalReady = Boolean(progress?.readAt && progress?.quizPassedAt);
          return (
            <details key={item.code} style={card} open={!complete}>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 17 }}>
                {complete ? "✅" : "⬜"} {moduleText(item.titleEn, item.title)} <span style={{ color: "#64748b", fontSize: 12 }}>v{item.version} · {moduleText(item.categoryEn, item.category)}</span>
              </summary>
              <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                <section style={{ border: "1px solid #dbe5ef", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                  <strong>{moduleText("Learning brief", "学习说明")}</strong>
                  <p style={{ color: "#475569" }}>
                    {moduleText("Phase", "阶段")}：{moduleText(
                      item.phase === "FOUNDATION" ? "Foundation" : item.phase === "CORE" ? "Role Core" : "Specialist",
                      item.phase === "FOUNDATION" ? "基础必修" : item.phase === "CORE" ? "岗位核心" : "专项进阶"
                    )} · {moduleText("Estimated time", "预计用时")}：{item.estimatedMinutes} {moduleText("minutes", "分钟")}
                  </p>
                  <ul>
                    {item.learningObjectivesEn.map((objective, index) => (
                      <li key={objective}>{moduleText(objective, item.learningObjectives[index])}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <strong>{moduleText("Step 1: Read", "步骤一：阅读")}</strong>
                  <p>
                    <a href={`/api/training/sops/${item.code}`} target="_blank" rel="noreferrer">{moduleText("Open Current Bilingual PDF", "打开当前中英双语 PDF")}</a>
                    {" · "}
                    <a href={`/api/training/sops/${item.code}?download=1`} download>{moduleText("Download PDF", "下载 PDF")}</a>
                  </p>
                  <form action={acknowledgeTrainingRead}>
                    <input type="hidden" name="moduleCode" value={item.code} />
                    <button type="submit">{progress?.readAt ? moduleText("Confirm Again", "重新确认已阅读") : moduleText("Confirm Current Version Read", "确认已阅读当前版本")}</button>
                  </form>
                </section>
                <form action={submitTrainingQuiz} style={{ display: "grid", gap: 12 }}>
                  <strong>{moduleText("Step 2: Knowledge Check", "步骤二：知识检查")} {progress?.quizScore !== null && progress?.quizScore !== undefined ? `（${moduleText("Latest", "最近")} ${progress.quizScore}）` : ""}</strong>
                  <input type="hidden" name="moduleCode" value={item.code} />
                  {item.questions.map((question, index) => (
                    <fieldset key={question.prompt} style={{ border: "1px solid #e2e8f0", borderRadius: 12 }}>
                      <legend>{index + 1}. {moduleText(question.promptEn, question.prompt)}</legend>
                      {question.options.map((option, optionIndex) => (
                        <label key={option} style={{ display: "block", margin: "7px 0" }}>
                          <input required type="radio" name={`answer-${index}`} value={optionIndex} /> {moduleText(question.optionsEn[optionIndex], option)}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button type="submit">{moduleText("Submit Quiz", "提交测验")}</button>
                </form>
                <form action={submitTrainingPractical} style={{ display: "grid", gap: 8 }}>
                  <strong>{moduleText("Step 3: Practical Task", "步骤三：实操任务")}</strong>
                  {!practicalReady ? (
                    <p style={{ margin: 0, color: "#b45309" }}>
                      {moduleText("Locked until the current PDF is confirmed read and the quiz is passed at 80% or above.", "完成当前 PDF 阅读确认并且测验达到 80 分后，实操提交才会开放。")}
                    </p>
                  ) : null}
                  <p>{moduleText(item.practicalTaskEn, item.practicalTask)}</p>
                  {progress?.practicalEvidence ? <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 10, borderRadius: 10 }}>{progress.practicalEvidence}</pre> : null}
                  <label>
                    {moduleText("Training-data reference", "培训数据名称或编号")}
                    <input name="trainingData" required minLength={3} disabled={!practicalReady} placeholder={moduleText("Example: Training Student A / Ticket TRAIN-001", "例如：培训学生 A／工单 TRAIN-001")} style={{ display: "block", width: "100%", marginTop: 4 }} />
                  </label>
                  <label>
                    {moduleText("Verified final result", "已核对的最终结果")}
                    <textarea name="finalResult" required minLength={10} disabled={!practicalReady} rows={2} placeholder={moduleText("State the final system status you reopened or refreshed and verified.", "说明重新打开或刷新后确认的最终系统状态。")} style={{ display: "block", width: "100%", marginTop: 4 }} />
                  </label>
                  <label>
                    {moduleText("Self-check against the manager rubric", "按照主管验收标准逐项自查")}
                    <textarea name="selfCheck" required minLength={20} disabled={!practicalReady} rows={3} placeholder={moduleText("Explain account/role, target record, key actions, final evidence, and the exception you can handle.", "说明账号岗位、目标记录、关键动作、最终证据，以及自己能处理的异常。")} style={{ display: "block", width: "100%", marginTop: 4 }} />
                  </label>
                  <div style={{ border: "1px solid #fde68a", borderRadius: 10, padding: 10, background: "#fffbeb" }}>
                    <strong>{moduleText("Manager will check", "主管将检查")}</strong>
                    <ol>
                      {item.managerRubricEn.map((rubric, index) => <li key={rubric}>{moduleText(rubric, item.managerRubric[index])}</li>)}
                    </ol>
                  </div>
                  <button type="submit" disabled={!practicalReady}>{moduleText("Submit for Manager Sign-off", "提交主管验收")}</button>
                  <small>{moduleText("Status", "状态")}：{progress?.practicalStatus ?? "NOT_STARTED"} {progress?.approvalNote ? `· ${progress.approvalNote}` : ""}</small>
                </form>
              </div>
            </details>
          );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
