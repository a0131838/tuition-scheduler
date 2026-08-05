import { isManagerUser } from "@/lib/auth";
import { requireCareEngagementAccess } from "@/lib/care-access";
import {
  careRiskSlaMinutes,
  changeCareCoverageStatus,
  changeCareRiskCaseStatus,
  changeCareServiceReviewStatus,
  createCareCoveragePeriod,
  createCareRiskCase,
  createCareServiceReview,
  isCareRiskSlaBreached,
  updateCareServiceReview,
} from "@/lib/care-operations";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import type { CareCoverageStatus, CareRiskCaseStatus, CareServiceReviewStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "../../care.module.css";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function actionRedirect(engagementId: string, label: string, operation: Promise<unknown>) {
  try {
    await operation;
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label} failed`;
    redirect(`/admin/care/${encodeURIComponent(engagementId)}/operations?err=${encodeURIComponent(message)}`);
  }
  redirect(`/admin/care/${encodeURIComponent(engagementId)}/operations?msg=${encodeURIComponent(label)}`);
}

function riskNextStatuses(status: CareRiskCaseStatus): CareRiskCaseStatus[] {
  if (status === "OPEN") return ["ACKNOWLEDGED"];
  if (status === "ACKNOWLEDGED") return ["MONITORING", "RESOLVED"];
  if (status === "MONITORING") return ["RESOLVED"];
  if (status === "RESOLVED") return ["CLOSED"];
  return [];
}

function coverageNextStatuses(status: CareCoverageStatus): CareCoverageStatus[] {
  if (status === "SCHEDULED") return ["ACTIVE", "CANCELLED"];
  if (status === "ACTIVE") return ["COMPLETED", "CANCELLED"];
  return [];
}

function riskStatusLabel(lang: string, status: CareRiskCaseStatus) {
  const labels: Record<CareRiskCaseStatus, [string, string]> = {
    OPEN: ["Open", "待响应"], ACKNOWLEDGED: ["Acknowledged", "已确认"], MONITORING: ["Monitoring", "跟进中"],
    RESOLVED: ["Resolved", "已解决"], CLOSED: ["Closed", "已关闭"],
  };
  return lang === "EN" ? labels[status][0] : lang === "ZH" ? labels[status][1] : `${labels[status][0]} / ${labels[status][1]}`;
}

function coverageStatusLabel(lang: string, status: CareCoverageStatus) {
  const labels: Record<CareCoverageStatus, [string, string]> = {
    SCHEDULED: ["Scheduled", "已安排"], ACTIVE: ["Active", "代班中"], COMPLETED: ["Completed", "已完成"], CANCELLED: ["Cancelled", "已取消"],
  };
  return lang === "EN" ? labels[status][0] : lang === "ZH" ? labels[status][1] : `${labels[status][0]} / ${labels[status][1]}`;
}

export default async function CareOperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ msg?: string | string[]; err?: string | string[] }>;
}) {
  const { id } = await params;
  const actor = await requireCareEngagementAccess(id);
  const manager = actor.role === "ADMIN" || await isManagerUser(actor);
  const lang = await getLang();
  const sp = await searchParams;
  const msg = first(sp?.msg).trim();
  const err = first(sp?.err).trim();

  async function riskCreateAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await actionRedirect(id, "Risk added", createCareRiskCase({
      actor: current,
      engagementId: id,
      title: formData.get("title"),
      riskLevel: formData.get("riskLevel"),
      facts: formData.get("facts"),
      immediateAction: formData.get("immediateAction"),
      ownerUserId: formData.get("ownerUserId"),
      backupOwnerUserId: formData.get("backupOwnerUserId"),
      detectedAt: formData.get("detectedAt"),
      parentVisible: formData.get("parentVisible") === "on",
      publicSummary: formData.get("publicSummary"),
    }));
  }

  async function riskStatusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await actionRedirect(id, "Risk updated", changeCareRiskCaseStatus({
      actor: current,
      engagementId: id,
      riskCaseId: String(formData.get("riskCaseId") ?? ""),
      version: Number(formData.get("version")),
      nextStatus: String(formData.get("nextStatus")) as CareRiskCaseStatus,
      resolutionEvidence: formData.get("resolutionEvidence"),
    }));
  }

  async function coverageCreateAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    if (!(current.role === "ADMIN" || await isManagerUser(current))) redirect(`/admin/care/${id}/operations?err=Manager+access+required`);
    await actionRedirect(id, "Coverage scheduled", createCareCoveragePeriod({
      actor: current,
      engagementId: id,
      primaryUserId: formData.get("primaryUserId"),
      backupUserId: formData.get("backupUserId"),
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      reason: formData.get("reason"),
      handoverSummary: formData.get("handoverSummary"),
      criticalActions: formData.get("criticalActions"),
    }));
  }

  async function coverageStatusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    if (!(current.role === "ADMIN" || await isManagerUser(current))) redirect(`/admin/care/${id}/operations?err=Manager+access+required`);
    await actionRedirect(id, "Coverage updated", changeCareCoverageStatus({
      actor: current,
      engagementId: id,
      coverageId: String(formData.get("coverageId") ?? ""),
      version: Number(formData.get("version")),
      nextStatus: String(formData.get("nextStatus")) as CareCoverageStatus,
    }));
  }

  async function reviewCreateAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await actionRedirect(id, "Service review created", createCareServiceReview({
      actor: current,
      engagementId: id,
      periodLabel: formData.get("periodLabel"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      goalsSummary: formData.get("goalsSummary"),
      deliverySummary: formData.get("deliverySummary"),
      outcomeSummary: formData.get("outcomeSummary"),
      evidenceSummary: formData.get("evidenceSummary"),
      continuationRecommendation: formData.get("continuationRecommendation"),
      nextStagePlan: formData.get("nextStagePlan"),
      internalCommercialNote: formData.get("internalCommercialNote"),
    }));
  }

  async function reviewUpdateAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await actionRedirect(id, "Service review saved", updateCareServiceReview({
      actor: current,
      engagementId: id,
      reviewId: String(formData.get("reviewId") ?? ""),
      version: Number(formData.get("version")),
      periodLabel: formData.get("periodLabel"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      goalsSummary: formData.get("goalsSummary"),
      deliverySummary: formData.get("deliverySummary"),
      outcomeSummary: formData.get("outcomeSummary"),
      evidenceSummary: formData.get("evidenceSummary"),
      continuationRecommendation: formData.get("continuationRecommendation"),
      nextStagePlan: formData.get("nextStagePlan"),
      internalCommercialNote: formData.get("internalCommercialNote"),
    }));
  }

  async function reviewStatusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    const nextStatus = String(formData.get("nextStatus")) as CareServiceReviewStatus;
    if (nextStatus === "APPROVED" && !(current.role === "ADMIN" || await isManagerUser(current))) {
      redirect(`/admin/care/${id}/operations?err=Manager+approval+required`);
    }
    await actionRedirect(id, "Service review updated", changeCareServiceReviewStatus({
      actor: current,
      engagementId: id,
      reviewId: String(formData.get("reviewId") ?? ""),
      version: Number(formData.get("version")),
      nextStatus,
    }));
  }

  const [engagement, staff] = await Promise.all([
    prisma.careEngagement.findUnique({
      where: { id },
      include: {
        student: { select: { name: true, school: true, grade: true } },
        caseOwner: { select: { id: true, name: true } },
        riskCases: {
          include: { owner: { select: { name: true } }, backupOwner: { select: { name: true } } },
          orderBy: [{ status: "asc" }, { responseDueAt: "asc" }],
        },
        coveragePeriods: {
          include: { primary: { select: { name: true } }, backup: { select: { name: true } } },
          orderBy: [{ status: "asc" }, { startAt: "desc" }],
        },
        serviceReviews: {
          include: { preparedBy: { select: { name: true } }, approvedBy: { select: { name: true } } },
          orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CS", "TEACHER"] } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);
  if (!engagement) notFound();

  const now = new Date();
  const nowInput = formatBusinessDateTime(now).replace(" ", "T");
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const openRisks = engagement.riskCases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status));
  const breached = openRisks.filter((item) => isCareRiskSlaBreached(item, now));
  const activeCoverage = engagement.coveragePeriods.filter((item) => item.status === "ACTIVE");
  const approvedReviews = engagement.serviceReviews.filter((item) => item.status === "APPROVED");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>{t(lang, "Risk and continuity", "风险与服务连续性")}</div>
          <h1>{t(lang, "Operations", "运营闭环")} · {engagement.student.name}</h1>
          <div className={styles.muted}>{engagement.student.school ?? "-"} · {engagement.student.grade ?? "-"}</div>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.buttonSecondary} href={`/admin/care/${encodeURIComponent(id)}`}>{t(lang, "Project overview", "项目总览")}</Link>
        </div>
      </header>

      {err ? <div className={styles.noticeError}>{err}</div> : null}
      {msg ? <div className={styles.noticeSuccess}>{msg}</div> : null}

      <nav className={styles.moduleNav} aria-label={t(lang, "Project navigation", "项目导航")}>
        <Link href="/admin/care">{t(lang, "All students", "全部学生")}</Link>
        <Link href={`/admin/care/${encodeURIComponent(id)}`}>{t(lang, "Overview", "项目总览")}</Link>
        <Link data-active="true" href={`/admin/care/${encodeURIComponent(id)}/operations`}>{t(lang, "Operations", "运营闭环")}</Link>
        <Link href="/admin/care/quality">{t(lang, "Quality", "质量工作台")}</Link>
      </nav>

      <div className={styles.metrics}>
        <div className={styles.metric} data-tone={openRisks.length ? "risk" : "active"}><strong>{openRisks.length}</strong><span className={styles.muted}>{t(lang, "Open risks", "未结风险")}</span></div>
        <div className={styles.metric} data-tone={breached.length ? "risk" : "active"}><strong>{breached.length}</strong><span className={styles.muted}>{t(lang, "SLA breaches", "响应超时")}</span></div>
        <div className={styles.metric} data-tone={activeCoverage.length ? "active" : "neutral"}><strong>{activeCoverage.length}</strong><span className={styles.muted}>{t(lang, "Active coverage", "代班中")}</span></div>
        <div className={styles.metric}><strong>{approvedReviews.length}</strong><span className={styles.muted}>{t(lang, "Approved reviews", "已批准复盘")}</span></div>
      </div>

      <section className={styles.section} id="risks">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <h2>{t(lang, "Risk escalation", "风险升级")}</h2>
            <div className={styles.muted}>{t(lang, "Record verified facts, response ownership and closure evidence.", "记录已核实事实、响应负责人和闭环证据。")}</div>
          </div>
          <span className={styles.badge} data-tone={breached.length ? "risk" : "neutral"}>{breached.length} SLA</span>
        </div>
        <details className={styles.details}>
          <summary>{t(lang, "Add risk", "登记风险")}</summary>
          <form action={riskCreateAction} className={styles.formGrid}>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Risk title", "风险标题")}<input className={styles.field} name="title" maxLength={180} required /></label>
            <label className={styles.label}>{t(lang, "Risk level", "风险等级")}<select className={styles.select} name="riskLevel" defaultValue="MEDIUM">{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => <option key={level} value={level}>{level} · {careRiskSlaMinutes(level as never)} min</option>)}</select></label>
            <label className={styles.label}>{t(lang, "Detected at", "发现时间")}<input className={styles.field} name="detectedAt" type="datetime-local" defaultValue={nowInput} required /></label>
            <label className={styles.label}>{t(lang, "Owner", "主负责人")}<select className={styles.select} name="ownerUserId" defaultValue={engagement.caseOwner?.id ?? ""} required>{staff.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
            <label className={styles.label}>{t(lang, "Backup owner", "备份负责人")}<select className={styles.select} name="backupOwnerUserId" defaultValue=""><option value="">-</option>{staff.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Verified facts", "已核实事实")}<textarea className={styles.textarea} name="facts" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Immediate action", "立即行动")}<textarea className={styles.textarea} name="immediateAction" required /></label>
            <label className={`${styles.check} ${styles.full}`}><input name="parentVisible" type="checkbox" /><span>{t(lang, "Show reviewed summary to parent", "允许在家长汇报中使用摘要")}</span></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Parent summary", "家长摘要")}<textarea className={styles.textarea} name="publicSummary" /></label>
            <button className={styles.button} type="submit">{t(lang, "Save risk", "保存风险")}</button>
          </form>
        </details>
        <div className={styles.rows}>
          {engagement.riskCases.map((risk) => {
            const slaBreached = isCareRiskSlaBreached(risk, now);
            const next = riskNextStatuses(risk.status);
            return <article className={styles.timelineItem} data-tone={slaBreached || risk.riskLevel === "HIGH" || risk.riskLevel === "CRITICAL" ? "risk" : risk.status === "CLOSED" ? "active" : "neutral"} key={risk.id}>
              <div className={styles.timelineHead}><div><strong>{risk.title}</strong><div className={styles.muted}>{formatBusinessDateTime(risk.detectedAt)} · {risk.owner.name}{risk.backupOwner ? ` / ${risk.backupOwner.name}` : ""}</div></div><div className={styles.toolbar}><span className={styles.badge} data-tone={risk.riskLevel === "HIGH" || risk.riskLevel === "CRITICAL" ? "risk" : "neutral"}>{risk.riskLevel}</span><span className={styles.badge} data-tone={slaBreached ? "risk" : risk.status === "CLOSED" ? "active" : "neutral"}>{slaBreached ? t(lang, "SLA overdue", "响应超时") : riskStatusLabel(lang, risk.status)}</span></div></div>
              <div className={styles.evidence}><strong>{t(lang, "Facts", "事实")}</strong>{risk.facts}</div>
              <div className={styles.evidence}><strong>{t(lang, "Immediate action", "立即行动")}</strong>{risk.immediateAction}</div>
              <div className={styles.muted}>{t(lang, "Response due", "最晚响应")}: {formatBusinessDateTime(risk.responseDueAt)}</div>
              {risk.resolutionEvidence ? <div className={styles.evidence}><strong>{t(lang, "Resolution", "解决证据")}</strong>{risk.resolutionEvidence}</div> : null}
              {next.length ? <form action={riskStatusAction} className={styles.inlineForm}><input type="hidden" name="riskCaseId" value={risk.id} /><input type="hidden" name="version" value={risk.version} /><select className={styles.select} style={{ width: "auto" }} name="nextStatus" defaultValue="" required><option value="" disabled>{t(lang, "Choose next status", "选择下一状态")}</option>{next.map((status) => <option key={status} value={status}>{riskStatusLabel(lang, status)}</option>)}</select>{next.includes("RESOLVED") ? <input className={styles.field} style={{ maxWidth: 420 }} name="resolutionEvidence" placeholder={t(lang, "Required when resolving", "解决时必须填写证据")} /> : null}<button className={styles.buttonSecondary} type="submit">{t(lang, "Update", "更新")}</button></form> : null}
            </article>;
          })}
          {!engagement.riskCases.length ? <div className={styles.muted}>{t(lang, "No risk records.", "暂无风险记录。")}</div> : null}
        </div>
      </section>

      <section className={styles.section} id="coverage">
        <div className={styles.sectionHeading}>
          <h2>{t(lang, "Backup coverage and handover", "代班与交接")}</h2>
          <div className={styles.muted}>{t(lang, "Keep ownership explicit when the primary owner is unavailable.", "主负责人缺席时，明确代班时间、关键事项和交接责任。")}</div>
        </div>
        {manager ? <details className={styles.details}>
          <summary>{t(lang, "Schedule coverage", "安排代班")}</summary>
          <form action={coverageCreateAction} className={styles.formGrid}>
            <label className={styles.label}>{t(lang, "Primary owner", "原负责人")}<select className={styles.select} name="primaryUserId" defaultValue={engagement.caseOwner?.id ?? ""} required>{staff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className={styles.label}>{t(lang, "Backup owner", "代班负责人")}<select className={styles.select} name="backupUserId" required defaultValue=""><option value="" disabled>{t(lang, "Select", "请选择")}</option>{staff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label className={styles.label}>{t(lang, "Start", "开始")}<input className={styles.field} name="startAt" type="datetime-local" required /></label>
            <label className={styles.label}>{t(lang, "End", "结束")}<input className={styles.field} name="endAt" type="datetime-local" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Reason", "代班原因")}<input className={styles.field} name="reason" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Handover summary", "交接摘要")}<textarea className={styles.textarea} name="handoverSummary" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Critical actions and deadlines", "关键事项与截止时间")}<textarea className={styles.textarea} name="criticalActions" required /></label>
            <button className={styles.button} type="submit">{t(lang, "Schedule", "保存安排")}</button>
          </form>
        </details> : null}
        {engagement.coveragePeriods.map((coverage) => <article className={styles.timelineItem} data-tone={coverage.status === "ACTIVE" ? "active" : "neutral"} key={coverage.id}><div className={styles.timelineHead}><strong>{coverage.primary.name} → {coverage.backup.name}</strong><span className={styles.badge} data-tone={coverage.status === "ACTIVE" ? "active" : "neutral"}>{coverageStatusLabel(lang, coverage.status)}</span></div><div className={styles.muted}>{formatBusinessDateTime(coverage.startAt)} - {formatBusinessDateTime(coverage.endAt)} · {coverage.reason}</div><div className={styles.evidence}><strong>{t(lang, "Handover", "交接")}</strong>{coverage.handoverSummary}</div><div className={styles.evidence}><strong>{t(lang, "Critical actions", "关键事项")}</strong>{coverage.criticalActions}</div>{manager && coverageNextStatuses(coverage.status).length ? <form action={coverageStatusAction} className={styles.inlineForm}><input type="hidden" name="coverageId" value={coverage.id} /><input type="hidden" name="version" value={coverage.version} /><select className={styles.select} style={{ width: "auto" }} name="nextStatus" defaultValue="" required><option value="" disabled>{t(lang, "Choose next status", "选择下一状态")}</option>{coverageNextStatuses(coverage.status).map((status) => <option key={status} value={status}>{coverageStatusLabel(lang, status)}</option>)}</select><button className={styles.buttonSecondary} type="submit">{t(lang, "Update", "更新")}</button></form> : null}</article>)}
        {!engagement.coveragePeriods.length ? <div className={styles.muted}>{t(lang, "No coverage periods.", "暂无代班安排。")}</div> : null}
      </section>

      <section className={styles.section} id="reviews">
        <div className={styles.sectionHeading}>
          <h2>{t(lang, "Service value review", "服务价值复盘")}</h2>
          <div className={styles.muted}>{t(lang, "Compare goals, delivery evidence and the recommended next stage.", "对照目标、实际交付和证据，形成下一阶段建议。")}</div>
        </div>
        <details className={styles.details}>
          <summary>{t(lang, "Create review", "创建复盘")}</summary>
          <form action={reviewCreateAction} className={styles.formGrid}>
            <label className={styles.label}>{t(lang, "Period", "复盘期间")}<input className={styles.field} name="periodLabel" defaultValue={`${formatBusinessDateOnly(monthStart)} - ${formatBusinessDateOnly(monthEnd)}`} required /></label>
            <label className={styles.label}>{t(lang, "Recommendation", "后续建议")}<select className={styles.select} name="continuationRecommendation" defaultValue="CONTINUE">{["CONTINUE", "EXPAND", "ADJUST", "COMPLETE", "HOLD"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className={styles.label}>{t(lang, "Start", "开始")}<input className={styles.field} name="periodStart" type="date" defaultValue={formatBusinessDateOnly(monthStart)} required /></label>
            <label className={styles.label}>{t(lang, "End", "结束")}<input className={styles.field} name="periodEnd" type="date" defaultValue={formatBusinessDateOnly(monthEnd)} required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Goals", "原定目标")}<textarea className={styles.textarea} name="goalsSummary" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Delivery", "实际交付")}<textarea className={styles.textarea} name="deliverySummary" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Outcomes", "学生变化与结果")}<textarea className={styles.textarea} name="outcomeSummary" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Evidence", "证据摘要")}<textarea className={styles.textarea} name="evidenceSummary" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Next stage", "下一阶段方案")}<textarea className={styles.textarea} name="nextStagePlan" required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Internal commercial note", "内部续费备注")}<textarea className={styles.textarea} name="internalCommercialNote" /></label>
            <button className={styles.button} type="submit">{t(lang, "Save draft", "保存草稿")}</button>
          </form>
        </details>
        {engagement.serviceReviews.map((review) => <article className={styles.timelineItem} key={review.id}><div className={styles.timelineHead}><div><strong>{review.periodLabel}</strong><div className={styles.muted}>{formatBusinessDateOnly(review.periodStart)} - {formatBusinessDateOnly(review.periodEnd)} · {review.preparedBy.name}</div></div><div className={styles.toolbar}><span className={styles.badge}>{review.continuationRecommendation}</span><span className={styles.badge} data-tone={review.status === "APPROVED" ? "active" : "neutral"}>{review.status}</span></div></div>{review.status === "DRAFT" ? <details className={styles.details}><summary>{t(lang, "Edit draft", "编辑草稿")}</summary><form action={reviewUpdateAction} className={styles.formGrid}><input type="hidden" name="reviewId" value={review.id} /><input type="hidden" name="version" value={review.version} /><label className={styles.label}>{t(lang, "Period", "复盘期间")}<input className={styles.field} name="periodLabel" defaultValue={review.periodLabel} required /></label><label className={styles.label}>{t(lang, "Recommendation", "后续建议")}<select className={styles.select} name="continuationRecommendation" defaultValue={review.continuationRecommendation}>{["CONTINUE", "EXPAND", "ADJUST", "COMPLETE", "HOLD"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className={styles.label}>{t(lang, "Start", "开始")}<input className={styles.field} name="periodStart" type="date" defaultValue={formatBusinessDateOnly(review.periodStart)} required /></label><label className={styles.label}>{t(lang, "End", "结束")}<input className={styles.field} name="periodEnd" type="date" defaultValue={formatBusinessDateOnly(review.periodEnd)} required /></label>{[["goalsSummary", "Goals", "原定目标"], ["deliverySummary", "Delivery", "实际交付"], ["outcomeSummary", "Outcomes", "学生变化与结果"], ["evidenceSummary", "Evidence", "证据摘要"], ["nextStagePlan", "Next stage", "下一阶段方案"], ["internalCommercialNote", "Internal note", "内部续费备注"]].map(([name, en, zh]) => <label className={`${styles.label} ${styles.full}`} key={name}>{t(lang, en, zh)}<textarea className={styles.textarea} name={name} defaultValue={String(review[name as keyof typeof review] ?? "")} required={name !== "internalCommercialNote"} /></label>)}<button className={styles.buttonSecondary} type="submit">{t(lang, "Save", "保存")}</button></form></details> : <div className={styles.stack}><div className={styles.evidence}><strong>{t(lang, "Delivery", "实际交付")}</strong>{review.deliverySummary}</div><div className={styles.evidence}><strong>{t(lang, "Outcome", "学生变化与结果")}</strong>{review.outcomeSummary}</div><div className={styles.evidence}><strong>{t(lang, "Next stage", "下一阶段")}</strong>{review.nextStagePlan}</div></div>}{review.status === "DRAFT" ? <form action={reviewStatusAction}><input type="hidden" name="reviewId" value={review.id} /><input type="hidden" name="version" value={review.version} /><input type="hidden" name="nextStatus" value="SUBMITTED" /><button className={styles.button} type="submit">{t(lang, "Submit for approval", "提交审核")}</button></form> : null}{review.status === "SUBMITTED" && manager ? <form action={reviewStatusAction}><input type="hidden" name="reviewId" value={review.id} /><input type="hidden" name="version" value={review.version} /><input type="hidden" name="nextStatus" value="APPROVED" /><button className={styles.button} type="submit">{t(lang, "Approve review", "批准复盘")}</button></form> : null}{review.approvedBy ? <div className={styles.muted}>{t(lang, "Approved by", "批准人")}: {review.approvedBy.name}</div> : null}</article>)}
        {!engagement.serviceReviews.length ? <div className={styles.muted}>{t(lang, "No service reviews.", "暂无服务价值复盘。")}</div> : null}
      </section>
    </main>
  );
}
