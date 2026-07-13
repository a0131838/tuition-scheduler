import { requireCareEngagementAccess } from "@/lib/care-access";
import {
  addCareActivity,
  addCarePlan,
  addCareTask,
  audienceLabel,
  changeCareEngagementStatus,
  jsonSummary,
  updateCareTask,
  updateCareEngagementConfig,
} from "@/lib/care-management";
import {
  CARE_ACTIVITY_OPTIONS,
  CARE_AUDIENCE_OPTIONS,
  CARE_LIFE_SUBTYPES,
  CARE_PROGRAM_OPTIONS,
  CARE_RISK_OPTIONS,
  CARE_SCOPE_OPTIONS,
  CARE_TASK_PRIORITY_OPTIONS,
  CARE_TASK_STATUS_OPTIONS,
  scopeIdsFromJson,
} from "@/lib/care-validation";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { isManagerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CareEngagementStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "../care.module.css";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function nextStatuses(status: CareEngagementStatus): CareEngagementStatus[] {
  if (status === "DRAFT") return ["ACTIVE", "CANCELLED"];
  if (status === "ACTIVE") return ["PAUSED", "COMPLETED", "CANCELLED"];
  if (status === "PAUSED") return ["ACTIVE", "COMPLETED", "CANCELLED"];
  return [];
}

function jsonList(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = (value as Record<string, unknown>)[field];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
}

export default async function CareDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string | string[]; err?: string | string[] }>;
}) {
  const { id } = await params;
  const actor = await requireCareEngagementAccess(id);
  const canManageConfig = actor.role === "ADMIN" || (await isManagerUser(actor));
  const lang = await getLang();
  const sp = await searchParams;
  const msg = first(sp?.msg).trim();
  const err = first(sp?.err).trim();

  async function runAction(label: string, operation: () => Promise<unknown>) {
    try {
      await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : `${label} failed`;
      redirect(`/admin/care/${encodeURIComponent(id)}?err=${encodeURIComponent(message)}`);
    }
    redirect(`/admin/care/${encodeURIComponent(id)}?msg=${encodeURIComponent(label)}`);
  }

  async function statusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runAction("Status updated", () =>
      changeCareEngagementStatus({
        actor: current,
        engagementId: id,
        version: Number(formData.get("version")),
        nextStatus: String(formData.get("nextStatus")) as CareEngagementStatus,
      }),
    );
  }

  async function planAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runAction("Plan added", () =>
      addCarePlan({
        actor: current,
        engagementId: id,
        periodLabel: formData.get("periodLabel"),
        periodStart: formData.get("periodStart"),
        periodEnd: formData.get("periodEnd"),
        baseline: formData.get("baseline"),
        goals: formData.get("goals"),
        successCriteria: formData.get("successCriteria"),
        actionPlan: formData.get("actionPlan"),
      }),
    );
  }

  async function configAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    const canManage = current.role === "ADMIN" || (await isManagerUser(current));
    if (!canManage) redirect(`/admin/care/${encodeURIComponent(id)}?err=${encodeURIComponent("Only managers can change care scope and owners")}`);
    await runAction("Configuration updated", () =>
      updateCareEngagementConfig({
        actor: current,
        engagementId: id,
        version: Number(formData.get("version")),
        startDate: formData.get("startDate"),
        caseOwnerUserId: formData.get("caseOwnerUserId"),
        reviewerUserId: formData.get("reviewerUserId"),
        scopeIds: formData.getAll("scopeIds"),
      }),
    );
  }

  async function activityAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runAction("Update added", () =>
      addCareActivity({
        actor: current,
        engagementId: id,
        category: formData.get("category"),
        subtype: formData.get("subtype"),
        occurredAt: formData.get("occurredAt"),
        title: formData.get("title"),
        factEvidence: formData.get("factEvidence"),
        professionalJudgment: formData.get("professionalJudgment"),
        actionTaken: formData.get("actionTaken"),
        outcomeVerification: formData.get("outcomeVerification"),
        nextAction: formData.get("nextAction"),
        nextActionDue: formData.get("nextActionDue"),
        riskLevel: formData.get("riskLevel"),
        ownerUserId: formData.get("ownerUserId"),
        internalNote: formData.get("internalNote"),
        audience: formData.get("audience"),
        publicSummary: formData.get("publicSummary"),
      }),
    );
  }

  async function taskAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runAction("Task added", () =>
      addCareTask({
        actor: current,
        engagementId: id,
        title: formData.get("title"),
        description: formData.get("description"),
        assignedToUserId: formData.get("assignedToUserId"),
        priority: formData.get("priority"),
        dueAt: formData.get("dueAt"),
      }),
    );
  }

  async function taskUpdateAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runAction("Task updated", () =>
      updateCareTask({
        actor: current,
        taskId: String(formData.get("taskId") ?? ""),
        version: Number(formData.get("version")),
        status: formData.get("status"),
        completionEvidence: formData.get("completionEvidence"),
        nextFollowUpAt: formData.get("nextFollowUpAt"),
      }),
    );
  }

  const [engagement, configurableStaff] = await Promise.all([prisma.careEngagement.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, school: true, grade: true } },
        caseOwner: { select: { id: true, name: true, email: true } },
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
        },
        plans: { orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }], take: 12 },
        activities: {
          include: { owner: { select: { name: true } }, createdBy: { select: { name: true } } },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          take: 50,
        },
        tasks: {
          include: { assignedTo: { select: { name: true } } },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          take: 100,
        },
      },
    }), canManageConfig ? prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CS", "TEACHER"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }) : []]);
  if (!engagement) notFound();

  const staff = Array.from(
    new Map(engagement.members.map((member) => [member.user.id, { id: member.user.id, name: member.user.name }])).values(),
  );
  const reviewerUserId = engagement.members.find((member) => member.role === "REVIEWER")?.userId ?? "";

  const program = CARE_PROGRAM_OPTIONS.find((item) => item.value === engagement.programType);
  const scopeIds = scopeIdsFromJson(engagement.scopeJson);
  const scopeLabels = CARE_SCOPE_OPTIONS.filter((item) => scopeIds.includes(item.id)).map((item) => lang === "EN" ? item.en : item.zh);
  const exclusions = jsonList(engagement.exclusionsJson, "items");
  const openTasks = engagement.tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const nowInput = formatBusinessDateTime(new Date()).replace(" ", "T");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.toolbar}>
            <Link href="/admin/care" className={styles.buttonSecondary}>{t(lang, "Back", "返回")}</Link>
            <span className={styles.badge} data-tone={engagement.status === "ACTIVE" ? "active" : "neutral"}>{engagement.status}</span>
          </div>
          <h1 style={{ marginTop: 10 }}>{engagement.student.name}</h1>
          <div className={styles.muted}>{engagement.student.school ?? "-"} · {engagement.student.grade ?? "-"} · {program ? (lang === "EN" ? program.en : program.zh) : engagement.programType}</div>
        </div>
        {nextStatuses(engagement.status).length ? (
          <form action={statusAction} className={styles.inlineForm}>
            <input type="hidden" name="version" value={engagement.version} />
            <select className={styles.select} style={{ width: "auto" }} name="nextStatus" defaultValue={nextStatuses(engagement.status)[0]}>
              {nextStatuses(engagement.status).map((status) => <option value={status} key={status}>{status}</option>)}
            </select>
            <button className={styles.buttonSecondary} type="submit">{t(lang, "Update status", "更新状态")}</button>
          </form>
        ) : null}
      </header>

      {err ? <div className={styles.noticeError}>{err}</div> : null}
      {msg ? <div className={styles.noticeSuccess}>{msg}</div> : null}

      <div className={styles.metrics}>
        <div className={styles.metric}><strong>{openTasks.length}</strong><span className={styles.muted}>{t(lang, "Open tasks", "未完成待办")}</span></div>
        <div className={styles.metric}><strong>{engagement.activities.length}</strong><span className={styles.muted}>{t(lang, "Updates", "跟进记录")}</span></div>
        <div className={styles.metric}><strong>{engagement.plans.length}</strong><span className={styles.muted}>{t(lang, "Plans", "阶段计划")}</span></div>
        <div className={styles.metric}><strong>{engagement.members.length}</strong><span className={styles.muted}>{t(lang, "Team", "责任成员")}</span></div>
      </div>

      <section className={styles.section}>
        <div className={styles.layout}>
          <div>
            <h2>{t(lang, "Service scope", "服务范围")}</h2>
            <div style={{ marginTop: 8 }}>{scopeLabels.join(" · ") || "-"}</div>
            <div className={styles.muted} style={{ marginTop: 5 }}>
              {t(lang, "Third-party costs are excluded unless the contract states otherwise.", "第三方实际费用不包含，除非合同另有明确约定。")}
              {exclusions.length ? ` (${exclusions.length})` : ""}
            </div>
          </div>
          <div>
            <h2>{t(lang, "Owners", "负责人")}</h2>
            <div className={styles.stack} style={{ marginTop: 8 }}>
              {engagement.members.map((member) => (
                <div key={member.id}><strong>{member.user.name}</strong> <span className={styles.muted}>{member.role}</span></div>
              ))}
            </div>
          </div>
        </div>
        {canManageConfig ? (
          <details className={styles.details}>
            <summary>{t(lang, "Edit scope and owners", "修改范围和负责人")}</summary>
            <form action={configAction} className={styles.formGrid}>
              <input type="hidden" name="version" value={engagement.version} />
              <label className={styles.label}>{t(lang, "Start date", "开始日期")}<input className={styles.field} name="startDate" type="date" defaultValue={engagement.startDate ? formatBusinessDateOnly(engagement.startDate) : ""} required /></label>
              <label className={styles.label}>{t(lang, "Case owner", "总负责人")}<select className={styles.select} name="caseOwnerUserId" defaultValue={engagement.caseOwnerUserId ?? ""} required>{configurableStaff.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email} · {user.role}</option>)}</select></label>
              <label className={styles.label}>{t(lang, "Reviewer", "月报审核人")}<select className={styles.select} name="reviewerUserId" defaultValue={reviewerUserId}><option value="">{t(lang, "Assign later", "稍后指定")}</option>{configurableStaff.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email} · {user.role}</option>)}</select></label>
              <fieldset className={`${styles.full} ${styles.section}`} style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }}>
                <legend style={{ fontWeight: 800 }}>{t(lang, "Service scope", "服务范围")}</legend>
                <div className={styles.scopeGrid}>{CARE_SCOPE_OPTIONS.map((item) => <label className={styles.check} key={item.id}><input name="scopeIds" value={item.id} type="checkbox" defaultChecked={scopeIds.includes(item.id)} /><span>{lang === "EN" ? item.en : item.zh}</span></label>)}</div>
              </fieldset>
              <button className={styles.button} type="submit">{t(lang, "Save configuration", "保存配置")}</button>
            </form>
          </details>
        ) : null}
      </section>

      <div className={styles.layout}>
        <div className={styles.stack}>
          <section className={styles.section}>
            <h2>{t(lang, "Updates", "跟进记录")}</h2>
            <details className={styles.details}>
              <summary>{t(lang, "Add update", "新增跟进")}</summary>
              <form action={activityAction} className={styles.formGrid}>
                <label className={styles.label}>{t(lang, "Type", "类型")}<select className={styles.select} name="category" defaultValue="ACADEMIC">{CARE_ACTIVITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Life subtype", "生活事项")}<select className={styles.select} name="subtype" defaultValue=""><option value="">-</option>{CARE_LIFE_SUBTYPES.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Time", "发生时间")}<input className={styles.field} name="occurredAt" type="datetime-local" defaultValue={nowInput} /></label>
                <label className={styles.label}>{t(lang, "Risk", "风险")}<select className={styles.select} name="riskLevel" defaultValue="LOW">{CARE_RISK_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Title", "标题")}<input className={styles.field} name="title" maxLength={180} required /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Facts and evidence", "事实与证据")}<textarea className={styles.textarea} name="factEvidence" required /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Professional judgement", "专业判断")}<textarea className={styles.textarea} name="professionalJudgment" /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Action taken", "已采取行动")}<textarea className={styles.textarea} name="actionTaken" /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Result", "结果验证")}<textarea className={styles.textarea} name="outcomeVerification" /></label>
                <label className={styles.label}>{t(lang, "Next action", "下一步")}<input className={styles.field} name="nextAction" /></label>
                <label className={styles.label}>{t(lang, "Due", "截止时间")}<input className={styles.field} name="nextActionDue" type="datetime-local" /></label>
                <label className={styles.label}>{t(lang, "Owner", "负责人")}<select className={styles.select} name="ownerUserId" defaultValue={engagement.caseOwnerUserId ?? ""}><option value="">-</option>{staff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Visibility", "汇报范围")}<select className={styles.select} name="audience" defaultValue="INTERNAL_ONLY">{CARE_AUDIENCE_OPTIONS.map((item) => <option key={item} value={item}>{item === "INTERNAL_ONLY" ? t(lang, "Internal", "仅内部") : t(lang, "Parent summary", "家长摘要")}</option>)}</select></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Parent summary", "家长摘要")}<textarea className={styles.textarea} name="publicSummary" /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Internal note", "内部备注")}<textarea className={styles.textarea} name="internalNote" /></label>
                <button className={styles.button} type="submit">{t(lang, "Save update", "保存跟进")}</button>
              </form>
            </details>
            <div>
              {engagement.activities.map((activity) => (
                <article className={styles.timelineItem} key={activity.id}>
                  <div className={styles.timelineHead}>
                    <div>
                      <strong>{activity.title}</strong>
                      <div className={styles.muted}>{formatBusinessDateTime(activity.occurredAt)} · {activity.category}{activity.subtype ? ` / ${activity.subtype}` : ""} · {activity.createdBy.name}</div>
                    </div>
                    <div className={styles.toolbar}>
                      <span className={styles.badge} data-tone={activity.riskLevel === "HIGH" || activity.riskLevel === "CRITICAL" ? "risk" : "neutral"}>{activity.riskLevel}</span>
                      <span className={styles.badge}>{audienceLabel(activity.audience)}</span>
                    </div>
                  </div>
                  <div className={styles.evidence}><strong>{t(lang, "Facts", "事实")}</strong>{activity.factEvidence}</div>
                  {activity.professionalJudgment ? <div className={styles.evidence}><strong>{t(lang, "Judgement", "判断")}</strong>{activity.professionalJudgment}</div> : null}
                  {activity.actionTaken ? <div className={styles.evidence}><strong>{t(lang, "Action", "行动")}</strong>{activity.actionTaken}</div> : null}
                  {activity.outcomeVerification ? <div className={styles.evidence}><strong>{t(lang, "Result", "结果")}</strong>{activity.outcomeVerification}</div> : null}
                  {activity.nextAction ? <div><strong>{t(lang, "Next", "下一步")}:</strong> {activity.nextAction} {activity.nextActionDue ? `· ${formatBusinessDateTime(activity.nextActionDue)}` : ""} {activity.owner?.name ? `· ${activity.owner.name}` : ""}</div> : null}
                  {activity.publicSummary ? <div className={styles.muted}><strong>{t(lang, "Parent summary", "家长摘要")}:</strong> {activity.publicSummary}</div> : null}
                </article>
              ))}
              {engagement.activities.length === 0 ? <div className={styles.muted} style={{ paddingTop: 10 }}>{t(lang, "No updates yet.", "暂无跟进记录。")}</div> : null}
            </div>
          </section>

          <section className={styles.section}>
            <h2>{t(lang, "Plans", "阶段计划")}</h2>
            <details className={styles.details}>
              <summary>{t(lang, "Add plan", "新增计划")}</summary>
              <form action={planAction} className={styles.formGrid}>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Period", "阶段名称")}<input className={styles.field} name="periodLabel" placeholder={t(lang, "e.g. 30-day transition", "例如：入学前30天适应期")} required /></label>
                <label className={styles.label}>{t(lang, "Start", "开始")}<input className={styles.field} name="periodStart" type="date" defaultValue={formatBusinessDateOnly(new Date())} required /></label>
                <label className={styles.label}>{t(lang, "End", "结束")}<input className={styles.field} name="periodEnd" type="date" required /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Baseline", "当前基线")}<textarea className={styles.textarea} name="baseline" /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Goals", "目标")}<textarea className={styles.textarea} name="goals" required /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Success criteria", "完成标准")}<textarea className={styles.textarea} name="successCriteria" /></label>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Action plan", "行动计划")}<textarea className={styles.textarea} name="actionPlan" /></label>
                <button className={styles.button} type="submit">{t(lang, "Save plan", "保存计划")}</button>
              </form>
            </details>
            {engagement.plans.map((plan) => (
              <article className={styles.planItem} key={plan.id}>
                <div className={styles.timelineHead}><strong>{plan.periodLabel}</strong><span className={styles.badge}>{plan.status}</span></div>
                <div className={styles.muted}>{formatBusinessDateOnly(plan.periodStart)} - {formatBusinessDateOnly(plan.periodEnd)}</div>
                {jsonSummary(plan.baselineJson) ? <div><strong>{t(lang, "Baseline", "基线")}:</strong> {jsonSummary(plan.baselineJson)}</div> : null}
                <div><strong>{t(lang, "Goals", "目标")}:</strong> {jsonSummary(plan.goalsJson)}</div>
                {jsonSummary(plan.actionPlanJson) ? <div><strong>{t(lang, "Actions", "行动")}:</strong> {jsonSummary(plan.actionPlanJson)}</div> : null}
              </article>
            ))}
          </section>
        </div>

        <aside className={styles.stack}>
          <section className={styles.section}>
            <h2>{t(lang, "Tasks", "待办")}</h2>
            <details className={styles.details}>
              <summary>{t(lang, "Add task", "新增待办")}</summary>
              <form action={taskAction} className={styles.stack}>
                <label className={styles.label}>{t(lang, "Task", "事项")}<input className={styles.field} name="title" required /></label>
                <label className={styles.label}>{t(lang, "Details", "说明")}<textarea className={styles.textarea} name="description" /></label>
                <label className={styles.label}>{t(lang, "Owner", "负责人")}<select className={styles.select} name="assignedToUserId" defaultValue={engagement.caseOwnerUserId ?? ""} required>{staff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Priority", "优先级")}<select className={styles.select} name="priority" defaultValue="NORMAL">{CARE_TASK_PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Due", "截止时间")}<input className={styles.field} name="dueAt" type="datetime-local" required /></label>
                <button className={styles.button} type="submit">{t(lang, "Save task", "保存待办")}</button>
              </form>
            </details>
            <div>
              {engagement.tasks.map((task) => (
                <article className={styles.taskItem} key={task.id}>
                  <div className={styles.taskHead}>
                    <strong>{task.title}</strong>
                    <span className={styles.badge} data-tone={task.priority === "HIGH" || task.priority === "URGENT" ? "risk" : "neutral"}>{task.priority}</span>
                  </div>
                  <div className={styles.muted}>{task.assignedTo.name} · {formatBusinessDateTime(task.dueAt)} · {task.status}</div>
                  {task.description ? <div>{task.description}</div> : null}
                  <form action={taskUpdateAction} className={styles.stack}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="version" value={task.version} />
                    <select className={styles.select} name="status" defaultValue={task.status}>{CARE_TASK_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                    <input className={styles.field} name="nextFollowUpAt" type="datetime-local" aria-label={t(lang, "Next follow-up", "下次跟进")} />
                    <textarea className={styles.textarea} name="completionEvidence" placeholder={t(lang, "Result when completed", "完成时填写结果")} defaultValue={task.completionEvidence ?? ""} />
                    <button className={styles.buttonSecondary} type="submit">{t(lang, "Update", "更新")}</button>
                  </form>
                </article>
              ))}
              {engagement.tasks.length === 0 ? <div className={styles.muted} style={{ paddingTop: 10 }}>{t(lang, "No tasks yet.", "暂无待办。")}</div> : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
