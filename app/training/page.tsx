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
  const modules = trainingModulesForUser(user.role, user.trainingRoles);
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
          {manager ? <Link href="/training/manage">{moduleText("Manager Sign-off", "主管验收台")}</Link> : null}
        </div>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {modules.map((item) => {
          const progress = byKey.get(`${item.code}:${item.version}`);
          const complete = Boolean(progress?.readAt && progress?.quizPassedAt && progress?.practicalStatus === "APPROVED");
          return (
            <details key={item.code} style={card} open={!complete}>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 17 }}>
                {complete ? "✅" : "⬜"} {moduleText(item.titleEn, item.title)} <span style={{ color: "#64748b", fontSize: 12 }}>v{item.version} · {moduleText(item.categoryEn, item.category)}</span>
              </summary>
              <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                <section>
                  <strong>{moduleText("Step 1: Read", "步骤一：阅读")}</strong>
                  <p><a href={`/api/training/sops/${item.code}`} target="_blank" rel="noreferrer">{moduleText("Open Current Bilingual PDF", "打开当前中英双语 PDF")}</a></p>
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
                  <p>{moduleText(item.practicalTaskEn, item.practicalTask)}</p>
                  <textarea name="evidence" required minLength={10} rows={3} placeholder={moduleText("Enter the training-data name, final result, and self-check evidence. Do not enter passwords or sensitive information.", "填写培训数据名称、完成结果和自查证据；不要填写密码或敏感资料。")} defaultValue={progress?.practicalEvidence ?? ""} />
                  <button type="submit">{moduleText("Submit for Manager Sign-off", "提交主管验收")}</button>
                  <small>{moduleText("Status", "状态")}：{progress?.practicalStatus ?? "NOT_STARTED"} {progress?.approvalNote ? `· ${progress.approvalNote}` : ""}</small>
                </form>
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}
