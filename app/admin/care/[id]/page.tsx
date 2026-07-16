import { requireCareEngagementAccess } from "@/lib/care-access";
import { CARE_REPORT_STATUS_LABELS, CARE_REPORT_TYPE_OPTIONS, reportTypeLabel } from "@/lib/care-report-validation";
import { createCareReportDraft } from "@/lib/care-reports";
import {
  addCareActivity,
  addCarePlan,
  addCareTask,
  audienceLabel,
  changeCareEngagementStatus,
  jsonSummary,
  setCareAttachmentArchived,
  upsertCareUniversityProfile,
  updateCareTask,
  updateCareEngagementConfig,
} from "@/lib/care-management";
import {
  CARE_ACTIVITY_SOURCE_OPTIONS,
  CARE_ATTACHMENT_OPTIONS,
  CARE_AUDIENCE_OPTIONS,
  CARE_LIFE_SUBTYPES,
  CARE_PARENT_VISIBILITY_OPTIONS,
  CARE_PROGRAM_SCOPE_IDS,
  CARE_PROGRAM_OPTIONS,
  CARE_RISK_OPTIONS,
  CARE_SCOPE_OPTIONS,
  CARE_STUDENT_CONSENT_OPTIONS,
  CARE_TASK_PRIORITY_OPTIONS,
  CARE_TASK_STATUS_OPTIONS,
  careActivityOptionsForProgram,
  careScopeOptionsForProgram,
  isUniversityCareProgram,
  parentVisibilityIdsFromJson,
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
import CareAttachmentUploader from "../_components/CareAttachmentUploader";

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

function fileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function runCareAction(engagementId: string, label: string, operation: Promise<unknown>) {
  try {
    await operation;
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label} failed`;
    redirect(`/admin/care/${encodeURIComponent(engagementId)}?err=${encodeURIComponent(message)}`);
  }
  redirect(`/admin/care/${encodeURIComponent(engagementId)}?msg=${encodeURIComponent(label)}`);
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

  async function statusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runCareAction(id, "Status updated",
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
    await runCareAction(id, "Plan added",
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

  async function reportAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    let reportId = "";
    try {
      const report = await createCareReportDraft({
        actor: current,
        engagementId: id,
        reportType: formData.get("reportType"),
        periodLabel: formData.get("periodLabel"),
        periodStart: formData.get("periodStart"),
        periodEnd: formData.get("periodEnd"),
      });
      reportId = report.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report draft failed";
      redirect(`/admin/care/${encodeURIComponent(id)}?err=${encodeURIComponent(message)}`);
    }
    redirect(`/admin/care/${encodeURIComponent(id)}/reports/${encodeURIComponent(reportId)}?msg=${encodeURIComponent("Report draft created")}`);
  }

  async function configAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    const canManage = current.role === "ADMIN" || (await isManagerUser(current));
    if (!canManage) redirect(`/admin/care/${encodeURIComponent(id)}?err=${encodeURIComponent("Only managers can change care scope and owners")}`);
    await runCareAction(id, "Configuration updated",
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
    await runCareAction(id, "Update added",
      addCareActivity({
        actor: current,
        engagementId: id,
        category: formData.get("category"),
        subtype: formData.get("subtype"),
        occurredAt: formData.get("occurredAt"),
        title: formData.get("title"),
        sourceType: formData.get("sourceType"),
        sourceLabel: formData.get("sourceLabel"),
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

  async function universityProfileAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    const canManage = current.role === "ADMIN" || (await isManagerUser(current));
    if (!canManage) redirect(`/admin/care/${encodeURIComponent(id)}?err=${encodeURIComponent("Only managers can change university profile settings")}`);
    await runCareAction(id, "University profile updated",
      upsertCareUniversityProfile({
        actor: current,
        engagementId: id,
        version: Number(formData.get("version")),
        institution: formData.get("institution"),
        degreeProgram: formData.get("degreeProgram"),
        currentAcademicYear: formData.get("currentAcademicYear"),
        currentTerm: formData.get("currentTerm"),
        expectedGraduationDate: formData.get("expectedGraduationDate"),
        currentGpaLabel: formData.get("currentGpaLabel"),
        targetGpaLabel: formData.get("targetGpaLabel"),
        studentConsentStatus: formData.get("studentConsentStatus"),
        parentVisibilityIds: formData.getAll("parentVisibilityIds"),
        consentNote: formData.get("consentNote"),
      }),
    );
  }

  async function attachmentStatusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runCareAction(id, String(formData.get("archived")) === "true" ? "Evidence archived" : "Evidence restored",
      setCareAttachmentArchived({
        actor: current,
        engagementId: id,
        attachmentId: String(formData.get("attachmentId") ?? ""),
        version: Number(formData.get("version")),
        archived: String(formData.get("archived")) === "true",
      }),
    );
  }

  async function taskAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await runCareAction(id, "Task added",
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
    await runCareAction(id, "Task updated",
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
        attachments: {
          include: {
            uploadedBy: { select: { name: true } },
            activity: { select: { id: true, title: true } },
            task: { select: { id: true, title: true } },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 100,
        },
        reports: {
          include: {
            preparedBy: { select: { name: true } },
            approvedBy: { select: { name: true } },
            _count: { select: { views: true } },
          },
          orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
          take: 24,
        },
        universityProfile: {
          include: { consentRecordedBy: { select: { name: true } } },
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
  const scopeOptions = careScopeOptionsForProgram(engagement.programType, scopeIds);
  const standardScopeIds = new Set(CARE_PROGRAM_SCOPE_IDS[engagement.programType]);
  const retainedLegacyScopeIds = scopeIds.filter((scopeId) => !standardScopeIds.has(scopeId));
  const universityProject = isUniversityCareProgram(engagement.programType);
  const activityOptions = careActivityOptionsForProgram(engagement.programType);
  const parentVisibilityIds = parentVisibilityIdsFromJson(engagement.universityProfile?.parentVisibilityJson);
  const exclusions = jsonList(engagement.exclusionsJson, "items");
  const openTasks = engagement.tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED");
  const activeAttachments = engagement.attachments.filter((attachment) => !attachment.archivedAt);
  const archivedAttachments = engagement.attachments.filter((attachment) => attachment.archivedAt);
  const nowInput = formatBusinessDateTime(new Date()).replace(" ", "T");
  const currentDate = new Date();
  const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const currentMonthLabel = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

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
        <div className={styles.metric}><strong>{activeAttachments.length}</strong><span className={styles.muted}>{t(lang, "Evidence", "证据文件")}</span></div>
        <div className={styles.metric}><strong>{engagement.reports.length}</strong><span className={styles.muted}>{t(lang, "Reports", "正式报告")}</span></div>
      </div>

      <section className={styles.section}>
        <div className={styles.layout}>
          <div>
            <h2>{t(lang, "Service scope", "服务范围")}</h2>
            <div style={{ marginTop: 8 }}>{scopeLabels.join(" · ") || "-"}</div>
            {retainedLegacyScopeIds.length ? <div className={styles.noticeError} style={{ marginTop: 8 }}>{t(lang, "Retained scope from the earlier programme template. Review before activation.", "包含原项目模板保留范围，请在启用前审核。")}</div> : null}
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
                <div className={styles.scopeGrid}>{scopeOptions.map((item) => <label className={styles.check} key={item.id}><input name="scopeIds" value={item.id} type="checkbox" defaultChecked={scopeIds.includes(item.id)} /><span>{lang === "EN" ? item.en : item.zh}{!standardScopeIds.has(item.id) ? t(lang, " (retained)", "（原项目保留）") : ""}</span></label>)}</div>
              </fieldset>
              <button className={styles.button} type="submit">{t(lang, "Save configuration", "保存配置")}</button>
            </form>
          </details>
        ) : null}
      </section>

      {universityProject ? (
        <section className={styles.section}>
          <div className={styles.timelineHead}>
            <div>
              <h2>{t(lang, "University profile and student consent", "大学档案与学生授权")}</h2>
              <div className={styles.muted} style={{ marginTop: 5 }}>
                {engagement.universityProfile?.institution ?? engagement.student.school ?? "-"}
                {engagement.universityProfile?.degreeProgram ? ` · ${engagement.universityProfile.degreeProgram}` : ""}
                {engagement.universityProfile?.currentAcademicYear ? ` · ${engagement.universityProfile.currentAcademicYear}` : ""}
                {engagement.universityProfile?.currentTerm ? ` · ${engagement.universityProfile.currentTerm}` : ""}
              </div>
            </div>
            <span className={styles.badge} data-tone={engagement.universityProfile?.studentConsentStatus === "WITHDRAWN" ? "risk" : engagement.universityProfile?.studentConsentStatus === "GRANTED" || engagement.universityProfile?.studentConsentStatus === "LIMITED" ? "active" : "neutral"}>
              {CARE_STUDENT_CONSENT_OPTIONS.find((item) => item.value === (engagement.universityProfile?.studentConsentStatus ?? "NOT_RECORDED"))?.[lang === "EN" ? "en" : "zh"]}
            </span>
          </div>
          <div className={styles.layout}>
            <div>
              <strong>{t(lang, "Academic position", "学业位置")}</strong>
              <div className={styles.muted} style={{ marginTop: 5 }}>
                {t(lang, "Graduation", "预计毕业")}: {engagement.universityProfile?.expectedGraduationDate ? formatBusinessDateOnly(engagement.universityProfile.expectedGraduationDate) : "-"}
                {engagement.universityProfile?.currentGpaLabel ? ` · ${t(lang, "Current GPA", "当前 GPA")}: ${engagement.universityProfile.currentGpaLabel}` : ""}
                {engagement.universityProfile?.targetGpaLabel ? ` · ${t(lang, "Target GPA", "目标 GPA")}: ${engagement.universityProfile.targetGpaLabel}` : ""}
              </div>
            </div>
            <div>
              <strong>{t(lang, "Parent-visible sections", "家长可见栏目")}</strong>
              <div className={styles.muted} style={{ marginTop: 5 }}>
                {CARE_PARENT_VISIBILITY_OPTIONS.filter((item) => parentVisibilityIds.includes(item.id)).map((item) => lang === "EN" ? item.en : item.zh).join(" · ") || "-"}
              </div>
              {engagement.universityProfile?.consentRecordedAt ? (
                <div className={styles.muted}>{formatBusinessDateTime(engagement.universityProfile.consentRecordedAt)} · {engagement.universityProfile.consentRecordedBy?.name ?? "-"}</div>
              ) : null}
            </div>
          </div>
          {canManageConfig ? (
            <details className={styles.details}>
              <summary>{t(lang, "Edit university profile", "修改大学档案")}</summary>
              <form action={universityProfileAction} className={styles.formGrid}>
                <input type="hidden" name="version" value={engagement.universityProfile?.version ?? 0} />
                <label className={styles.label}>{t(lang, "University", "大学")}<input className={styles.field} name="institution" maxLength={240} defaultValue={engagement.universityProfile?.institution ?? engagement.student.school ?? ""} /></label>
                <label className={styles.label}>{t(lang, "Degree and programme", "学位与专业")}<input className={styles.field} name="degreeProgram" maxLength={240} defaultValue={engagement.universityProfile?.degreeProgram ?? ""} /></label>
                <label className={styles.label}>{t(lang, "Academic year", "当前年级")}<input className={styles.field} name="currentAcademicYear" maxLength={80} defaultValue={engagement.universityProfile?.currentAcademicYear ?? engagement.student.grade ?? ""} /></label>
                <label className={styles.label}>{t(lang, "Current term", "当前学期")}<input className={styles.field} name="currentTerm" maxLength={120} defaultValue={engagement.universityProfile?.currentTerm ?? ""} /></label>
                <label className={styles.label}>{t(lang, "Expected graduation", "预计毕业日期")}<input className={styles.field} name="expectedGraduationDate" type="date" defaultValue={engagement.universityProfile?.expectedGraduationDate ? formatBusinessDateOnly(engagement.universityProfile.expectedGraduationDate) : ""} /></label>
                <label className={styles.label}>{t(lang, "Current GPA and scale", "当前 GPA 与满分")}<input className={styles.field} name="currentGpaLabel" maxLength={40} placeholder="3.4 / 4.0" defaultValue={engagement.universityProfile?.currentGpaLabel ?? ""} /></label>
                <label className={styles.label}>{t(lang, "Target GPA and scale", "目标 GPA 与满分")}<input className={styles.field} name="targetGpaLabel" maxLength={40} placeholder="3.7 / 4.0" defaultValue={engagement.universityProfile?.targetGpaLabel ?? ""} /></label>
                <label className={styles.label}>{t(lang, "Student consent", "学生授权")}<select className={styles.select} name="studentConsentStatus" defaultValue={engagement.universityProfile?.studentConsentStatus ?? "NOT_RECORDED"}>{CARE_STUDENT_CONSENT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label>
                <fieldset className={`${styles.full} ${styles.section}`} style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }}>
                  <legend style={{ fontWeight: 800 }}>{t(lang, "Authorized parent-visible sections", "授权家长可见栏目")}</legend>
                  <div className={styles.scopeGrid}>{CARE_PARENT_VISIBILITY_OPTIONS.map((item) => <label className={styles.check} key={item.id}><input name="parentVisibilityIds" value={item.id} type="checkbox" defaultChecked={parentVisibilityIds.includes(item.id)} /><span>{lang === "EN" ? item.en : item.zh}</span></label>)}</div>
                </fieldset>
                <label className={`${styles.label} ${styles.full}`}>{t(lang, "Consent record or note", "授权记录或说明")}<textarea className={styles.textarea} name="consentNote" maxLength={2000} defaultValue={engagement.universityProfile?.consentNote ?? ""} /></label>
                <button className={styles.button} type="submit">{t(lang, "Save university profile", "保存大学档案")}</button>
              </form>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.timelineHead}>
          <div>
            <h2>{t(lang, "Formal reports", "正式报告")}</h2>
            <div className={styles.muted}>{t(lang, "Draft from real service records, then submit for review before parents can see it.", "从真实服务记录生成草稿，提交审核后才能向家长发布。")}</div>
          </div>
          <span className={styles.badge}>{engagement.reports.length}</span>
        </div>
        <details className={styles.details}>
          <summary>{t(lang, "Create report draft", "创建报告草稿")}</summary>
          <form action={reportAction} className={styles.formGrid}>
            <label className={styles.label}>{t(lang, "Report type", "报告类型")}<select className={styles.select} name="reportType" defaultValue="MONTHLY">{CARE_REPORT_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label>
            <label className={styles.label}>{t(lang, "Period label", "报告期间")}<input className={styles.field} name="periodLabel" defaultValue={currentMonthLabel} maxLength={120} required /></label>
            <label className={styles.label}>{t(lang, "Start", "开始日期")}<input className={styles.field} name="periodStart" type="date" defaultValue={formatBusinessDateOnly(currentMonthStart)} required /></label>
            <label className={styles.label}>{t(lang, "End", "结束日期")}<input className={styles.field} name="periodEnd" type="date" defaultValue={formatBusinessDateOnly(currentMonthEnd)} required /></label>
            <button className={styles.button} type="submit">{t(lang, "Generate editable draft", "生成可编辑草稿")}</button>
          </form>
        </details>
        <div className={styles.rows}>
          {engagement.reports.map((report) => (
            <article className={styles.fileRow} key={report.id}>
              <div>
                <Link className={styles.rowTitle} href={`/admin/care/${encodeURIComponent(id)}/reports/${encodeURIComponent(report.id)}`}>{report.title}</Link>
                <div className={styles.muted}>{reportTypeLabel(report.reportType, lang === "EN")} · {formatBusinessDateOnly(report.periodStart)} - {formatBusinessDateOnly(report.periodEnd)} · {report.preparedBy.name}</div>
                {report.approvedBy ? <div className={styles.muted}>{t(lang, "Approved by", "审核人")}: {report.approvedBy.name}</div> : null}
              </div>
              <div className={styles.toolbar}>
                <span className={styles.badge} data-tone={report.status === "PUBLISHED" ? "active" : report.status === "RETURNED" || report.status === "REVOKED" ? "risk" : "neutral"}>{CARE_REPORT_STATUS_LABELS[report.status][lang === "EN" ? "en" : "zh"]}</span>
                {report.status === "PUBLISHED" ? <span className={styles.badge}>{t(lang, `${report._count.views} parent views`, `家长查看 ${report._count.views}`)}</span> : null}
                <Link className={styles.buttonSecondary} href={`/admin/care/${encodeURIComponent(id)}/reports/${encodeURIComponent(report.id)}`}>{t(lang, "Open", "打开")}</Link>
              </div>
            </article>
          ))}
          {engagement.reports.length === 0 ? <div className={styles.muted}>{t(lang, "No formal reports yet.", "暂无正式报告。")}</div> : null}
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.stack}>
          <section className={styles.section}>
            <h2>{t(lang, "Updates", "跟进记录")}</h2>
            <details className={styles.details}>
              <summary>{t(lang, "Add update", "新增跟进")}</summary>
              <form action={activityAction} className={styles.formGrid}>
                <label className={styles.label}>{t(lang, "Type", "类型")}<select className={styles.select} name="category" defaultValue={activityOptions[0]?.value ?? "GENERAL"}>{activityOptions.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label>
                {!universityProject ? <label className={styles.label}>{t(lang, "Life subtype", "生活事项")}<select className={styles.select} name="subtype" defaultValue=""><option value="">-</option>{CARE_LIFE_SUBTYPES.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label> : null}
                <label className={styles.label}>{t(lang, "Time", "发生时间")}<input className={styles.field} name="occurredAt" type="datetime-local" defaultValue={nowInput} /></label>
                <label className={styles.label}>{t(lang, "Risk", "风险")}<select className={styles.select} name="riskLevel" defaultValue="LOW">{CARE_RISK_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Source channel", "沟通来源")}<select className={styles.select} name="sourceType" defaultValue=""><option value="">-</option>{CARE_ACTIVITY_SOURCE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{lang === "EN" ? item.en : item.zh}</option>)}</select></label>
                <label className={styles.label}>{t(lang, "Source detail", "来源说明")}<input className={styles.field} name="sourceLabel" maxLength={240} placeholder={t(lang, "School, contact or subject", "学校、联系人或邮件主题")} /></label>
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
                      <div className={styles.muted}>{formatBusinessDateTime(activity.occurredAt)} · {activity.category}{activity.subtype ? ` / ${activity.subtype}` : ""}{activity.sourceType ? ` · ${activity.sourceType}` : ""}{activity.sourceLabel ? ` / ${activity.sourceLabel}` : ""} · {activity.createdBy.name}</div>
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
            <h2>{t(lang, "Evidence and school records", "证据与学校资料")}</h2>
            <details className={styles.details}>
              <summary>{t(lang, "Upload evidence", "上传证据")}</summary>
              <CareAttachmentUploader
                engagementId={engagement.id}
                english={lang === "EN"}
                categories={CARE_ATTACHMENT_OPTIONS.map((item) => ({ value: item.value, label: lang === "EN" ? item.en : item.zh }))}
                activities={engagement.activities.map((item) => ({
                  value: item.id,
                  label: `${formatBusinessDateOnly(item.occurredAt)} · ${item.title}`,
                }))}
                tasks={engagement.tasks.map((item) => ({
                  value: item.id,
                  label: `${formatBusinessDateOnly(item.dueAt)} · ${item.title}`,
                }))}
              />
            </details>
            <div className={styles.rows}>
              {activeAttachments.map((attachment) => {
                const category = CARE_ATTACHMENT_OPTIONS.find((item) => item.value === attachment.category);
                return (
                  <article className={styles.fileRow} key={attachment.id}>
                    <div>
                      <a className={styles.rowTitle} href={`/api/admin/care/attachments/${encodeURIComponent(attachment.id)}/file`} target="_blank" rel="noreferrer">{attachment.title}</a>
                      <div className={styles.muted}>
                        {category ? (lang === "EN" ? category.en : category.zh) : attachment.category}
                        {attachment.occurredAt ? ` · ${formatBusinessDateOnly(attachment.occurredAt)}` : ""}
                        {attachment.sourceLabel ? ` · ${attachment.sourceLabel}` : ""}
                      </div>
                      <div className={styles.muted}>{attachment.originalFileName} · {fileSizeLabel(attachment.fileSizeBytes)} · {attachment.uploadedBy.name}</div>
                      {attachment.note ? <div>{attachment.note}</div> : null}
                      {attachment.activity ? <div className={styles.muted}>{t(lang, "Update", "关联跟进")}: {attachment.activity.title}</div> : null}
                      {attachment.task ? <div className={styles.muted}>{t(lang, "Task", "关联待办")}: {attachment.task.title}</div> : null}
                    </div>
                    <div className={styles.toolbar}>
                      <span className={styles.badge}>{attachment.audience === "INTERNAL_ONLY" ? t(lang, "Internal", "仅内部") : t(lang, "For reviewed report", "供审核报告使用")}</span>
                      <a className={styles.buttonSecondary} href={`/api/admin/care/attachments/${encodeURIComponent(attachment.id)}/file?download=1`}>{t(lang, "Download", "下载")}</a>
                      <form action={attachmentStatusAction}>
                        <input type="hidden" name="attachmentId" value={attachment.id} />
                        <input type="hidden" name="version" value={attachment.version} />
                        <input type="hidden" name="archived" value="true" />
                        <button className={styles.buttonSecondary} type="submit">{t(lang, "Archive", "归档")}</button>
                      </form>
                    </div>
                  </article>
                );
              })}
              {activeAttachments.length === 0 ? <div className={styles.muted} style={{ paddingTop: 10 }}>{t(lang, "No evidence yet.", "暂无证据文件。")}</div> : null}
            </div>
            {archivedAttachments.length ? (
              <details className={styles.details}>
                <summary>{t(lang, `Archived (${archivedAttachments.length})`, `已归档（${archivedAttachments.length}）`)}</summary>
                <div className={styles.rows}>
                  {archivedAttachments.map((attachment) => (
                    <article className={styles.fileRow} key={attachment.id}>
                      <div>
                        <a className={styles.rowTitle} href={`/api/admin/care/attachments/${encodeURIComponent(attachment.id)}/file`} target="_blank" rel="noreferrer">{attachment.title}</a>
                        <div className={styles.muted}>{attachment.originalFileName} · {fileSizeLabel(attachment.fileSizeBytes)}</div>
                      </div>
                      <form action={attachmentStatusAction}>
                        <input type="hidden" name="attachmentId" value={attachment.id} />
                        <input type="hidden" name="version" value={attachment.version} />
                        <input type="hidden" name="archived" value="false" />
                        <button className={styles.buttonSecondary} type="submit">{t(lang, "Restore", "恢复")}</button>
                      </form>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
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
