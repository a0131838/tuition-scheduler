import { requireCareEngagementAccess } from "@/lib/care-access";
import { CARE_REPORT_STATUS_LABELS, canEditCareReport, reportTypeLabel } from "@/lib/care-report-validation";
import { changeCareReportStatus, updateCareReportDraft } from "@/lib/care-reports";
import { answerParentCareQuestion, parentQuestionStatusLabel } from "@/lib/care-operations";
import { isManagerUser } from "@/lib/auth";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import type { CareReportStatus } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "../../../care.module.css";

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function snapshotMetrics(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const row = value as Record<string, unknown>;
  return [
    ["Lessons", "课程", Number(row.lessonCount ?? 0)],
    ["Feedback", "老师反馈", Number(row.feedbackCount ?? 0)],
    ["Updates", "托管跟进", Number(row.activityCount ?? 0)],
    ["Evidence", "证据文件", Number(row.attachmentCount ?? 0)],
  ] as const;
}

async function actionRedirect(engagementId: string, reportId: string, label: string, operation: Promise<unknown>) {
  try {
    await operation;
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label} failed`;
    redirect(`/admin/care/${encodeURIComponent(engagementId)}/reports/${encodeURIComponent(reportId)}?err=${encodeURIComponent(message)}`);
  }
  redirect(`/admin/care/${encodeURIComponent(engagementId)}/reports/${encodeURIComponent(reportId)}?msg=${encodeURIComponent(label)}`);
}

function Section({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return <div className={styles.reportSection}><strong>{title}</strong><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{value}</div></div>;
}

export default async function CareReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reportId: string }>;
  searchParams?: Promise<{ msg?: string | string[]; err?: string | string[] }>;
}) {
  const { id, reportId } = await params;
  const actor = await requireCareEngagementAccess(id);
  const lang = await getLang();
  const sp = await searchParams;
  const msg = first(sp?.msg).trim();
  const err = first(sp?.err).trim();

  async function saveAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await actionRedirect(id, reportId, "Report saved", updateCareReportDraft({
      actor: current,
      engagementId: id,
      reportId,
      version: Number(formData.get("version")),
      title: formData.get("title"),
      riskLevel: formData.get("riskLevel"),
      overallSummary: formData.get("overallSummary"),
      academicSummary: formData.get("academicSummary"),
      schoolSummary: formData.get("schoolSummary"),
      lifeSummary: formData.get("lifeSummary"),
      riskSummary: formData.get("riskSummary"),
      actionsCompleted: formData.get("actionsCompleted"),
      evidenceSummary: formData.get("evidenceSummary"),
      nextPlan: formData.get("nextPlan"),
      studentActions: formData.get("studentActions"),
      parentActions: formData.get("parentActions"),
      internalNote: formData.get("internalNote"),
    }));
  }

  async function statusAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    const nextStatus = String(formData.get("nextStatus") ?? "") as CareReportStatus;
    await actionRedirect(id, reportId, `Report ${nextStatus.toLowerCase()}`, changeCareReportStatus({
      actor: current,
      engagementId: id,
      reportId,
      version: Number(formData.get("version")),
      nextStatus,
      reviewNote: formData.get("reviewNote"),
    }));
  }

  async function answerQuestionAction(formData: FormData) {
    "use server";
    const current = await requireCareEngagementAccess(id);
    await actionRedirect(id, reportId, "Parent question answered", answerParentCareQuestion({
      actor: current,
      engagementId: id,
      questionId: String(formData.get("questionId") ?? ""),
      response: formData.get("response"),
    }));
  }

  const report = await prisma.careReport.findFirst({
    where: { id: reportId, engagementId: id },
    include: {
      student: { select: { name: true, school: true, grade: true } },
      engagement: {
        select: {
          programType: true,
          members: { where: { isActive: true }, select: { userId: true, role: true } },
        },
      },
      preparedBy: { select: { name: true } },
      submittedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      publishedBy: { select: { name: true } },
      revokedBy: { select: { name: true } },
      activityLinks: { include: { activity: { select: { id: true, title: true, occurredAt: true } } }, orderBy: { createdAt: "asc" } },
      attachmentLinks: { include: { attachment: { select: { id: true, title: true, category: true } } }, orderBy: { createdAt: "asc" } },
      views: { include: { parent: { select: { name: true, phone: true } } }, orderBy: { lastViewedAt: "desc" } },
      questions: {
        include: {
          parent: { select: { name: true, phone: true } },
          assignedTo: { select: { name: true } },
          respondedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!report) notFound();

  const manager = actor.role === "ADMIN" || actor.operationsAdmin || await isManagerUser(actor);
  const designatedReviewer = report.engagement.members.some((member) => member.userId === actor.id && ["REVIEWER", "EXECUTIVE_OWNER"].includes(member.role));
  const canReview = manager || designatedReviewer;
  const editable = canEditCareReport(report.status);
  const metrics = snapshotMetrics(report.sourceSnapshotJson);
  const metricCounts = Object.fromEntries(metrics.map(([en, , count]) => [en, count]));
  const sparseMonthlyEvidence = report.reportType === "MONTHLY"
    && Number(metricCounts.Lessons ?? 0) === 0
    && Number(metricCounts.Feedback ?? 0) === 0
    && Number(metricCounts.Evidence ?? 0) === 0
    && Number(metricCounts.Updates ?? 0) < 2;
  const statusLabel = CARE_REPORT_STATUS_LABELS[report.status][lang === "EN" ? "en" : "zh"];
  const workflowStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED"] as const;
  const workflowIndex =
    report.status === "RETURNED" ? 0
      : report.status === "REVOKED" ? 3
        : Math.max(0, workflowStatuses.indexOf(report.status as typeof workflowStatuses[number]));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>{reportTypeLabel(report.reportType, lang === "EN")}</div>
          <h1>{report.title}</h1>
          <div className={styles.muted}>{report.student.name} · {report.student.school ?? "-"} · {formatBusinessDateOnly(report.periodStart)} - {formatBusinessDateOnly(report.periodEnd)}</div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge} data-tone={report.status === "PUBLISHED" ? "active" : report.status === "RETURNED" || report.status === "REVOKED" ? "risk" : "neutral"}>{statusLabel}</span>
          {(report.status === "APPROVED" || report.status === "PUBLISHED") ? <a className={styles.buttonSecondary} href={`/api/admin/care/reports/${encodeURIComponent(report.id)}/pdf`}>{t(lang, "PDF", "下载PDF")}</a> : null}
        </div>
      </header>

      {err ? <div className={styles.noticeError}>{err}</div> : null}
      {msg ? <div className={styles.noticeSuccess}>{msg}</div> : null}
      {sparseMonthlyEvidence ? <div className={styles.noticeError}>{t(lang, "Evidence warning: this monthly report has no lessons, teacher feedback or files and fewer than two care updates. Add evidence or record a clear no-activity explanation before review.", "证据提醒：本月报没有课程、老师反馈或附件，且托管跟进少于2条。请先补充证据，或明确记录本期无活动的原因，再提交审核。")}</div> : null}

      <nav className={styles.moduleNav} aria-label={t(lang, "Report navigation", "报告导航")}>
        <Link href="/admin/care">{t(lang, "All students", "全部学生")}</Link>
        <Link href={`/admin/care/${encodeURIComponent(id)}`}>{t(lang, "Project overview", "项目总览")}</Link>
        <Link data-active="true" href={`/admin/care/${encodeURIComponent(id)}/reports/${encodeURIComponent(reportId)}`}>{t(lang, "Current report", "当前报告")}</Link>
        <Link href={`/admin/care/${encodeURIComponent(id)}/operations`}>{t(lang, "Operations", "运营闭环")}</Link>
      </nav>

      <div className={styles.workflow} aria-label={t(lang, "Report workflow", "报告流程")}>
        {workflowStatuses.map((status, index) => (
          <div
            className={styles.workflowStep}
            data-complete={workflowIndex > index || report.status === "PUBLISHED"}
            data-current={workflowIndex === index && report.status !== "REVOKED"}
            key={status}
          >
            <strong>{CARE_REPORT_STATUS_LABELS[status][lang === "EN" ? "en" : "zh"]}</strong>
            <span>{index === 0 ? t(lang, "Prepare", "整理内容") : index === 1 ? t(lang, "Review", "负责人审核") : index === 2 ? t(lang, "Lock", "批准锁定") : t(lang, "Parent", "家长可见")}</span>
          </div>
        ))}
      </div>

      <div className={styles.metrics}>
        {metrics.map(([en, zh, value]) => <div className={styles.metric} key={en}><strong>{value}</strong><span className={styles.muted}>{t(lang, en, zh)}</span></div>)}
        <div className={styles.metric}><strong>{report.views.length}</strong><span className={styles.muted}>{t(lang, "Parent readers", "家长查看")}</span></div>
      </div>

      {editable ? (
        <section className={styles.section}>
          <h2>{t(lang, "Edit report", "编辑报告")}</h2>
          {report.status === "RETURNED" && report.reviewNote ? <div className={styles.noticeError}>{t(lang, "Return reason", "退回原因")}: {report.reviewNote}</div> : null}
          <form action={saveAction} className={styles.formGrid}>
            <input type="hidden" name="version" value={report.version} />
            <div className={`${styles.formSectionTitle} ${styles.full}`}>{t(lang, "Report identity", "报告基本信息")}</div>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Title", "标题")}<input className={styles.field} name="title" maxLength={240} defaultValue={report.title} required /></label>
            <label className={styles.label}>{t(lang, "Risk", "风险等级")}<select className={styles.select} name="riskLevel" defaultValue={report.riskLevel}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <div className={`${styles.formSectionTitle} ${styles.full}`}>{t(lang, "Conclusion and progress", "结论与进展")}</div>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Overall conclusion", "本期结论")}<textarea className={styles.textarea} name="overallSummary" defaultValue={report.overallSummary} required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Academic progress", "学业进展")}<textarea className={styles.textarea} name="academicSummary" defaultValue={report.academicSummary ?? ""} /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "School communication", "学校沟通")}<textarea className={styles.textarea} name="schoolSummary" defaultValue={report.schoolSummary ?? ""} /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Life and wellbeing", "生活与状态")}<textarea className={styles.textarea} name="lifeSummary" defaultValue={report.lifeSummary ?? ""} /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Risks", "风险与判断")}<textarea className={styles.textarea} name="riskSummary" defaultValue={report.riskSummary ?? ""} /></label>
            <div className={`${styles.formSectionTitle} ${styles.full}`}>{t(lang, "Delivery and next actions", "交付与下一步")}</div>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Actions completed", "已完成行动")}<textarea className={styles.textarea} name="actionsCompleted" defaultValue={report.actionsCompleted} required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Delivery evidence", "交付证据")}<textarea className={styles.textarea} name="evidenceSummary" defaultValue={report.evidenceSummary ?? ""} /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Next plan", "下一阶段计划")}<textarea className={styles.textarea} name="nextPlan" defaultValue={report.nextPlan} required /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Student actions", "学生需要完成")}<textarea className={styles.textarea} name="studentActions" defaultValue={report.studentActions ?? ""} /></label>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Parent actions", "家长需要配合")}<textarea className={styles.textarea} name="parentActions" defaultValue={report.parentActions ?? ""} /></label>
            <div className={`${styles.formSectionTitle} ${styles.full}`}>{t(lang, "Internal only", "仅内部可见")}</div>
            <label className={`${styles.label} ${styles.full}`}>{t(lang, "Internal note", "内部备注，不向家长展示")}<textarea className={styles.textarea} name="internalNote" defaultValue={report.internalNote ?? ""} /></label>
            <button className={styles.button} type="submit">{t(lang, "Save draft", "保存草稿")}</button>
          </form>
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.timelineHead}><h2>{t(lang, "Parent report", "家长报告内容")}</h2><span className={styles.badge} data-tone={report.riskLevel === "HIGH" || report.riskLevel === "CRITICAL" ? "risk" : "neutral"}>{report.riskLevel}</span></div>
          <div className={styles.reportDocument}>
            <Section title={t(lang, "Overall conclusion", "本期结论")} value={report.overallSummary} />
            <Section title={t(lang, "Academic progress", "学业进展")} value={report.academicSummary} />
            <Section title={t(lang, "School communication", "学校沟通")} value={report.schoolSummary} />
            <Section title={t(lang, "Life and wellbeing", "生活与状态")} value={report.lifeSummary} />
            <Section title={t(lang, "Risks", "风险与判断")} value={report.riskSummary} />
            <Section title={t(lang, "Actions completed", "已完成行动")} value={report.actionsCompleted} />
            <Section title={t(lang, "Delivery evidence", "交付证据")} value={report.evidenceSummary} />
            <Section title={t(lang, "Next plan", "下一阶段计划")} value={report.nextPlan} />
            <Section title={t(lang, "Student actions", "学生需要完成")} value={report.studentActions} />
            <Section title={t(lang, "Parent actions", "家长需要配合")} value={report.parentActions} />
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2>{t(lang, "Review workflow", "审核流程")}</h2>
        <div className={styles.muted}>{t(lang, "Prepared", "起草")}: {report.preparedBy.name} · {formatBusinessDateTime(report.createdAt)}</div>
        {report.submittedAt ? <div className={styles.muted}>{t(lang, "Submitted", "提交")}: {report.submittedBy?.name ?? "-"} · {formatBusinessDateTime(report.submittedAt)}</div> : null}
        {report.approvedAt ? <div className={styles.muted}>{t(lang, "Approved", "批准")}: {report.approvedBy?.name ?? "-"} · {formatBusinessDateTime(report.approvedAt)}</div> : null}
        {report.publishedAt ? <div className={styles.muted}>{t(lang, "Published", "发布")}: {report.publishedBy?.name ?? "-"} · {formatBusinessDateTime(report.publishedAt)}</div> : null}
        {report.reviewNote ? <div className={styles.noticeError} style={{ marginTop: 8 }}>{t(lang, "Review note", "审核意见")}: {report.reviewNote}</div> : null}
        {(report.status === "DRAFT" || report.status === "RETURNED") ? (
          <form action={statusAction} className={styles.inlineForm} style={{ marginTop: 12 }}>
            <input type="hidden" name="version" value={report.version} /><input type="hidden" name="nextStatus" value="SUBMITTED" />
            <button className={styles.button} type="submit">{t(lang, "Submit for review", "提交审核")}</button>
          </form>
        ) : null}
        {report.status === "SUBMITTED" && canReview ? (
          <div className={styles.layout} style={{ marginTop: 12 }}>
            <form action={statusAction} className={styles.stack}>
              <input type="hidden" name="version" value={report.version} /><input type="hidden" name="nextStatus" value="RETURNED" />
              <textarea className={styles.textarea} name="reviewNote" placeholder={t(lang, "Required return reason", "填写退回原因")} required />
              <button className={styles.buttonSecondary} type="submit">{t(lang, "Return", "退回修改")}</button>
            </form>
            <form action={statusAction} className={styles.stack}>
              <input type="hidden" name="version" value={report.version} /><input type="hidden" name="nextStatus" value="APPROVED" />
              <textarea className={styles.textarea} name="reviewNote" placeholder={t(lang, "Optional review note", "审核意见，可选")} />
              <button className={styles.button} type="submit">{t(lang, "Approve and lock", "批准并锁定")}</button>
            </form>
          </div>
        ) : null}
        {report.status === "APPROVED" && canReview ? (
          <form action={statusAction} className={styles.inlineForm} style={{ marginTop: 12 }}>
            <input type="hidden" name="version" value={report.version} /><input type="hidden" name="nextStatus" value="PUBLISHED" />
            <button className={styles.button} type="submit">{t(lang, "Publish to parents", "发布给家长")}</button>
          </form>
        ) : null}
        {report.status === "PUBLISHED" && canReview ? (
          <form action={statusAction} className={styles.inlineForm} style={{ marginTop: 12 }}>
            <input type="hidden" name="version" value={report.version} /><input type="hidden" name="nextStatus" value="REVOKED" />
            <input className={styles.field} name="reviewNote" placeholder={t(lang, "Required revocation reason", "填写撤回原因")} required />
            <button className={styles.buttonSecondary} type="submit">{t(lang, "Revoke", "撤回报告")}</button>
          </form>
        ) : null}
      </section>

      <div className={styles.layout}>
        <section className={styles.section}>
          <h2>{t(lang, "Source records", "报告来源")}</h2>
          <div className={styles.rows}>
            {report.activityLinks.map((link) => <div className={styles.fileRow} key={link.id}><div><strong>{link.activity.title}</strong><div className={styles.muted}>{formatBusinessDateOnly(link.activity.occurredAt)}</div></div></div>)}
            {report.attachmentLinks.map((link) => <div className={styles.fileRow} key={link.id}><div><strong>{link.attachment.title}</strong><div className={styles.muted}>{link.attachment.category}</div></div></div>)}
            {!report.activityLinks.length && !report.attachmentLinks.length ? <div className={styles.muted}>{t(lang, "Lesson and feedback counts are preserved in the source snapshot.", "课次和老师反馈数量已保存在来源快照中。")}</div> : null}
          </div>
        </section>
        <section className={styles.section}>
          <h2>{t(lang, "Parent receipt", "家长查看记录")}</h2>
          {report.views.map((view) => <div className={styles.taskItem} key={view.id}><strong>{view.parent.name || view.parent.phone || "Parent"}</strong><div className={styles.muted}>{t(lang, "Views", "查看次数")}: {view.viewCount} · {formatBusinessDateTime(view.lastViewedAt)}</div>{view.acknowledgedAt ? <div>{t(lang, "Acknowledged", "已确认")}: {formatBusinessDateTime(view.acknowledgedAt)}</div> : null}{view.acknowledgementNote ? <div>{view.acknowledgementNote}</div> : null}</div>)}
          {!report.views.length ? <div className={styles.muted}>{t(lang, "No parent has opened this report.", "暂无家长查看记录。")}</div> : null}
        </section>
      </div>

      <section className={styles.section} id="questions">
        <div className={styles.timelineHead}>
          <h2>{t(lang, "Parent questions", "家长问答")}</h2>
          <span className={styles.badge}>{report.questions.length}</span>
        </div>
        <div className={styles.rows}>
          {report.questions.map((question) => (
            <article className={styles.timelineItem} key={question.id}>
              <div className={styles.timelineHead}>
                <div>
                  <strong>{question.parent.name || question.parent.phone || "Parent"}</strong>
                  <div className={styles.muted}>{formatBusinessDateTime(question.createdAt)} · {t(lang, "Assigned to", "负责人")}: {question.assignedTo.name}</div>
                </div>
                <span className={styles.badge} data-tone={question.status === "CLOSED" ? "active" : question.status === "OPEN" ? "risk" : "neutral"}>{parentQuestionStatusLabel(question.status)}</span>
              </div>
              <div className={styles.evidence}><strong>{t(lang, "Question", "家长提问")}</strong>{question.question}</div>
              {question.response ? <div className={styles.evidence}><strong>{t(lang, "Response", "正式回复")}</strong>{question.response}<span className={styles.muted}>{question.respondedBy?.name ?? "-"} · {question.respondedAt ? formatBusinessDateTime(question.respondedAt) : "-"}</span></div> : null}
              {question.parentViewedResponseAt ? <div className={styles.muted}>{t(lang, "Parent viewed response", "家长已查看回复")}: {formatBusinessDateTime(question.parentViewedResponseAt)}</div> : null}
              {question.status !== "CLOSED" ? <form action={answerQuestionAction} className={styles.stack}>
                <input type="hidden" name="questionId" value={question.id} />
                <textarea className={styles.textarea} name="response" defaultValue={question.response ?? ""} placeholder={t(lang, "Write the formal response visible to the parent", "填写家长可见的正式回复")} required />
                <button className={styles.button} type="submit">{t(lang, question.response ? "Update response" : "Send response", question.response ? "更新回复" : "发送回复")}</button>
              </form> : null}
            </article>
          ))}
          {!report.questions.length ? <div className={styles.muted}>{t(lang, "No parent questions.", "暂无家长提问。")}</div> : null}
        </div>
      </section>
    </main>
  );
}
