import { getCurrentUser, isManagerUser, isTeacherLeadUser } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  TRAINING_RELEASE_VERSION,
  trainingModuleProgressState,
  trainingModulesForUser,
  trainingRolesForUser,
  type TrainingModuleProgressState,
} from "@/lib/training-center";
import type { SystemUserRole } from "@/lib/staff-roles";
import { redirect } from "next/navigation";
import { reviewTrainingPractical } from "../actions";

const card = { border: "1px solid #dbe5ef", borderRadius: 16, padding: 16, background: "white" };

const stateTone: Record<TrainingModuleProgressState, { background: string; color: string }> = {
  NOT_STARTED: { background: "#f1f5f9", color: "#475569" },
  IN_PROGRESS: { background: "#eff6ff", color: "#1d4ed8" },
  PENDING_REVIEW: { background: "#fffbeb", color: "#a16207" },
  COMPLETED: { background: "#ecfdf5", color: "#047857" },
};

export default async function TrainingManagePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/admin/login");
  const manager = await isManagerUser(currentUser);
  const teacherLead = await isTeacherLeadUser(currentUser);
  if (!manager && !teacherLead) redirect("/training");
  const lang = await getLang();

  const users = await prisma.user.findMany({
    where: manager ? { role: { not: "STUDENT" } } : { role: "TEACHER" },
    orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      language: true,
      trainingRoleAssignments: {
        where: { isActive: true },
        select: { role: true },
        orderBy: { role: "asc" },
      },
      trainingProgresses: {
        where: { moduleVersion: TRAINING_RELEASE_VERSION },
        include: { approvedBy: { select: { name: true } } },
      },
    },
  });

  const stateLabel = (state: TrainingModuleProgressState) => {
    if (state === "NOT_STARTED") return t(lang, "Not Started", "未开始");
    if (state === "IN_PROGRESS") return t(lang, "In Progress", "进行中");
    if (state === "PENDING_REVIEW") return t(lang, "Pending Sign-off", "待验收");
    return t(lang, "Completed", "已完成");
  };

  const staffRows = users.map((user) => {
    const assignedRoles = user.trainingRoleAssignments.map((item) => item.role);
    const modules = trainingModulesForUser(user.role as SystemUserRole, assignedRoles);
    const progressByModule = new Map(user.trainingProgresses.map((progress) => [progress.moduleCode, progress]));
    const moduleRows = modules.map((module) => {
      const progress = progressByModule.get(module.code);
      return { module, progress, state: trainingModuleProgressState(progress) };
    });
    const counts = moduleRows.reduce(
      (result, row) => {
        result[row.state] += 1;
        return result;
      },
      { NOT_STARTED: 0, IN_PROGRESS: 0, PENDING_REVIEW: 0, COMPLETED: 0 } as Record<TrainingModuleProgressState, number>
    );
    return {
      user,
      trainingRoles: trainingRolesForUser(user.role as SystemUserRole, assignedRoles),
      moduleRows,
      counts,
    };
  }).sort((a, b) =>
    b.counts.PENDING_REVIEW - a.counts.PENDING_REVIEW ||
    b.counts.IN_PROGRESS - a.counts.IN_PROGRESS ||
    a.user.name.localeCompare(b.user.name)
  );

  const totalModules = staffRows.reduce((sum, row) => sum + row.moduleRows.length, 0);
  const pendingReview = staffRows.reduce((sum, row) => sum + row.counts.PENDING_REVIEW, 0);
  const completedModules = staffRows.reduce((sum, row) => sum + row.counts.COMPLETED, 0);
  const notStartedStaff = staffRows.filter((row) => row.moduleRows.length > 0 && row.counts.NOT_STARTED === row.moduleRows.length).length;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24, background: "#f6f8fb", minHeight: "100vh", color: "#172033" }}>
      <section style={{ ...card, background: "linear-gradient(135deg,#ecfdf5,#eff6ff)" }}>
        <div style={{ color: "#0f766e", fontWeight: 800, fontSize: 12 }}>TRAINING MANAGEMENT / 培训管理</div>
        <h1 style={{ marginBottom: 8 }}>{t(lang, manager ? "Staff Training Overview & Sign-off" : "Teacher Training Overview & Sign-off", manager ? "员工培训总览与验收" : "老师培训总览与验收")}</h1>
        <p style={{ color: "#475569" }}>
          {t(
            lang,
            manager
              ? "All staff are shown, including employees who have not started. Training roles assign learning only and do not grant system permissions."
              : "Teacher leads can review teacher training only. Finance and other staff training are not available.",
            manager
              ? "这里显示全部员工，包括尚未开始培训的人。培训岗位只分配学习内容，不授予系统操作权限。"
              : "老师主管只能查看和验收老师培训，财务及其他岗位培训不会显示。"
          )}
        </p>
        <p><a href="/training">{t(lang, "Back to My Training", "返回我的培训")}</a>{manager ? <> · <a href="/training/coverage">{t(lang, "View Full-System Operations Coverage", "查看全系统操作覆盖图")}</a></> : null}</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, margin: "16px 0" }}>
        {[
          [t(lang, "Staff", "员工"), users.length, "#0f766e"],
          [t(lang, "Required Modules", "应修模块"), totalModules, "#334155"],
          [t(lang, "Pending Sign-off", "待验收"), pendingReview, "#a16207"],
          [t(lang, "Completed Modules", "已完成模块"), completedModules, "#047857"],
          [t(lang, "Staff Not Started", "未开始员工"), notStartedStaff, "#b91c1c"],
        ].map(([label, value, color]) => (
          <div key={String(label)} style={card}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>{label}</div>
            <div style={{ color: String(color), fontSize: 28, fontWeight: 900, marginTop: 5 }}>{value}</div>
          </div>
        ))}
      </section>

      {pendingReview === 0 ? (
        <section style={{ ...card, marginBottom: 14, background: "#fffbeb", borderColor: "#fde68a" }}>
          <strong>{t(lang, "No practical tasks are waiting for sign-off.", "目前没有等待验收的实操任务。")}</strong>
          <p style={{ marginBottom: 0, color: "#78716c" }}>
            {t(
              lang,
              "Employees will appear below even before they start. Approval buttons appear after reading, an 80% quiz score, and practical submission.",
              "员工即使尚未开始也会显示在下方；完成阅读、80 分测验并提交实操后，才会出现通过或退回按钮。"
            )}
          </p>
        </section>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {staffRows.map(({ user, trainingRoles, moduleRows, counts }) => {
          const completion = moduleRows.length ? Math.round((counts.COMPLETED / moduleRows.length) * 100) : 0;
          return (
            <details key={user.id} style={card} open={counts.PENDING_REVIEW > 0}>
              <summary style={{ cursor: "pointer", listStylePosition: "outside" }}>
                <div style={{ display: "inline-grid", gap: 8, width: "calc(100% - 24px)", verticalAlign: "top", marginLeft: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{user.name || user.email} <span style={{ color: "#64748b", fontWeight: 500 }}>· {user.email}</span></strong>
                    <span style={{ fontWeight: 800, color: completion === 100 ? "#047857" : "#334155" }}>{completion}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", fontSize: 12 }}>
                    <span>{t(lang, "Primary Role", "主角色")}：{user.role}</span>
                    <span>{t(lang, "Training Roles", "培训岗位")}：{trainingRoles.join(" / ")}</span>
                    <span>{t(lang, "Language", "语言")}：{user.language}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ width: `${completion}%`, height: "100%", background: "#10b981" }} />
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", fontSize: 12 }}>
                    {(["NOT_STARTED", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED"] as const).map((state) => (
                      <span key={state} style={{ ...stateTone[state], padding: "3px 8px", borderRadius: 99, fontWeight: 700 }}>
                        {stateLabel(state)} {counts[state]}
                      </span>
                    ))}
                  </div>
                </div>
              </summary>

              <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
                {moduleRows.map(({ module, progress, state }) => (
                  <section key={module.code} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#fbfdff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <strong>{t(lang, module.titleEn, module.title)}</strong>
                      <span style={{ ...stateTone[state], padding: "3px 8px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>{stateLabel(state)}</span>
                    </div>
                    <p style={{ color: "#475569", fontSize: 13 }}>
                      {t(lang, "Reading", "阅读")}：{progress?.readAt ? t(lang, "Complete", "完成") : t(lang, "Incomplete", "未完成")} ·{" "}
                      {t(lang, "Quiz", "测验")}：{progress?.quizScore ?? "-"} ·{" "}
                      {t(lang, "Practical", "实操")}：{progress?.practicalStatus ?? "NOT_STARTED"}
                    </p>
                    {progress?.practicalEvidence ? <p>{t(lang, "Practical Evidence", "实操证据")}：{progress.practicalEvidence}</p> : null}
                    {progress?.approvedBy ? <small>{t(lang, "Last Reviewer", "最近验收人")}：{progress.approvedBy.name}</small> : null}
                    {progress?.approvalNote ? <p><small>{t(lang, "Review Note", "验收意见")}：{progress.approvalNote}</small></p> : null}
                    {state === "PENDING_REVIEW" && progress ? (
                      <form action={reviewTrainingPractical} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        <input type="hidden" name="progressId" value={progress.id} />
                        <div style={{ border: "1px solid #dbe5ef", borderRadius: 10, padding: 10, background: "#fff" }}>
                          <strong>{t(lang, "Manager competency rubric", "主管能力验收标准")}</strong>
                          <ol style={{ marginBottom: 8 }}>
                            {module.managerRubricEn.map((rubric, index) => (
                              <li key={rubric}>{t(lang, rubric, module.managerRubric[index])}</li>
                            ))}
                          </ol>
                          <label>
                            <input type="checkbox" name="rubricConfirmed" value="yes" required />{" "}
                            {t(lang, "I observed or verified every item above; this is not a self-sign-off.", "我已观察或核对以上每一项，并且这不是本人自我验收。")}
                          </label>
                        </div>
                        <textarea name="note" rows={2} placeholder={t(lang, "Approval note or rework instructions", "验收意见或返工要求")} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button name="decision" value="APPROVED">{t(lang, "Approve", "通过验收")}</button>
                          <button name="decision" value="NEEDS_REWORK">{t(lang, "Return for Rework", "退回重做")}</button>
                        </div>
                      </form>
                    ) : null}
                  </section>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}
