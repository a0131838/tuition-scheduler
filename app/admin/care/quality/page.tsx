import { isManagerUser } from "@/lib/auth";
import { requireCareStaff } from "@/lib/care-access";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "../care.module.css";

type QueueItem = {
  id: string;
  engagementId: string;
  studentName: string;
  title: string;
  detail: string;
  tone?: "risk" | "active" | "neutral";
  href: string;
};

function Queue({ title, items, empty, open }: { title: string; items: QueueItem[]; empty: string; open: string }) {
  if (!items.length) return null;
  const risk = items.some((item) => item.tone === "risk");
  return <section className={styles.queueSection} data-tone={risk ? "risk" : "neutral"}>
    <div className={styles.queueHeader}><h2>{title}</h2><span className={styles.badge} data-tone={risk ? "risk" : "neutral"}>{items.length}</span></div>
    <div className={styles.queueList}>
      {items.map((item) => <article className={styles.queueItem} key={item.id}><div><div className={styles.queueItemTitle}>{item.studentName} · {item.title}</div><div className={styles.muted}>{item.detail}</div></div><Link className={styles.buttonSecondary} href={item.href}>{open}</Link></article>)}
      {!items.length ? <div className={styles.muted}>{empty}</div> : null}
    </div>
  </section>;
}

export default async function CareQualityPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; queue?: string; urgency?: string }>;
}) {
  const actor = await requireCareStaff();
  const lang = await getLang();
  const sp = await searchParams;
  const query = String(sp?.q ?? "").trim().toLowerCase();
  const selectedQueue = String(sp?.queue ?? "ALL").toUpperCase();
  const urgency = String(sp?.urgency ?? "ALL").toUpperCase();
  const broadAccess = actor.role === "ADMIN" || actor.operationsAdmin || await isManagerUser(actor);
  const accessWhere = broadAccess ? {} : { members: { some: { userId: actor.id, isActive: true } } };
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const engagements = await prisma.careEngagement.findMany({
    where: accessWhere,
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      caseOwnerUserId: true,
      nextReportDueAt: true,
      student: { select: { name: true } },
      plans: { select: { id: true }, take: 1 },
      members: { where: { isActive: true, role: { in: ["REVIEWER", "EXECUTIVE_OWNER"] } }, select: { id: true }, take: 1 },
      tasks: {
        where: { status: { notIn: ["DONE", "CANCELLED"] }, dueAt: { lt: now } },
        select: { id: true, title: true, dueAt: true, assignedTo: { select: { name: true } } },
        orderBy: { dueAt: "asc" },
      },
      reports: {
        where: {
          OR: [
            { status: "SUBMITTED" },
            { status: "PUBLISHED", publishedAt: { lt: threeDaysAgo } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          submittedAt: true,
          publishedAt: true,
          views: { select: { acknowledgedAt: true } },
        },
        orderBy: { updatedAt: "asc" },
      },
      parentQuestions: {
        where: { status: { in: ["OPEN", "ANSWERED"] } },
        select: { id: true, reportId: true, question: true, status: true, createdAt: true, respondedAt: true, parentViewedResponseAt: true },
        orderBy: { createdAt: "asc" },
      },
      riskCases: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED", "MONITORING"] } },
        select: { id: true, title: true, riskLevel: true, status: true, responseDueAt: true, owner: { select: { name: true } } },
        orderBy: { responseDueAt: "asc" },
      },
      coveragePeriods: {
        where: {
          OR: [
            { status: "ACTIVE" },
            { status: "SCHEDULED", startAt: { lte: sevenDaysAhead } },
          ],
        },
        select: { id: true, status: true, startAt: true, endAt: true, backup: { select: { name: true } } },
        orderBy: { startAt: "asc" },
      },
      serviceReviews: {
        where: { status: "SUBMITTED" },
        select: { id: true, periodLabel: true, submittedAt: true },
        orderBy: { submittedAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  const reportQueue: QueueItem[] = [];
  const receiptQueue: QueueItem[] = [];
  const taskQueue: QueueItem[] = [];
  const riskQueue: QueueItem[] = [];
  const questionQueue: QueueItem[] = [];
  const coverageQueue: QueueItem[] = [];
  const reviewQueue: QueueItem[] = [];
  const configQueue: QueueItem[] = [];
  const renewalQueue: QueueItem[] = [];

  for (const engagement of engagements) {
    const studentName = engagement.student.name;
    if (engagement.status === "ACTIVE") {
      const gaps = [
        !engagement.startDate ? t(lang, "service start", "服务开始日") : null,
        !engagement.endDate ? t(lang, "service end", "服务结束日") : null,
        !engagement.caseOwnerUserId ? t(lang, "case owner", "负责人") : null,
        engagement.members.length === 0 ? t(lang, "reviewer", "复核人") : null,
        engagement.plans.length === 0 ? t(lang, "initial plan", "首期计划") : null,
        !engagement.nextReportDueAt ? t(lang, "next report date", "下次报告日") : null,
      ].filter(Boolean);
      if (gaps.length) configQueue.push({
        id: `config-${engagement.id}`,
        engagementId: engagement.id,
        studentName,
        title: t(lang, "Launch configuration incomplete", "上线配置不完整"),
        detail: `${t(lang, "Missing", "缺少")}: ${gaps.join("、")}`,
        tone: "risk",
        href: `/admin/care/${engagement.id}`,
      });
      if (engagement.endDate) {
        const daysLeft = Math.ceil((engagement.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysLeft <= 60) renewalQueue.push({
          id: `renewal-${engagement.id}`,
          engagementId: engagement.id,
          studentName,
          title: daysLeft < 0 ? t(lang, "Service expired", "服务已到期") : t(lang, "Renewal follow-up", "续约跟进"),
          detail: daysLeft < 0 ? `${Math.abs(daysLeft)} ${t(lang, "days overdue", "天前到期")}` : `${daysLeft} ${t(lang, "days remaining", "天后到期")} · ${formatBusinessDateOnly(engagement.endDate)}`,
          tone: daysLeft <= 14 ? "risk" : "neutral",
          href: `/admin/care/${engagement.id}`,
        });
      }
    }
    if (engagement.status === "ACTIVE" && engagement.nextReportDueAt && engagement.nextReportDueAt < now) {
      reportQueue.push({ id: `due-${engagement.id}`, engagementId: engagement.id, studentName, title: t(lang, "Report overdue", "报告逾期"), detail: formatBusinessDateOnly(engagement.nextReportDueAt), tone: "risk", href: `/admin/care/${engagement.id}` });
    }
    for (const report of engagement.reports) {
      const href = `/admin/care/${engagement.id}/reports/${report.id}`;
      if (report.status === "SUBMITTED") {
        reportQueue.push({ id: report.id, engagementId: engagement.id, studentName, title: report.title, detail: `${t(lang, "Awaiting review since", "等待审核")}: ${report.submittedAt ? formatBusinessDateTime(report.submittedAt) : "-"}`, href });
      } else if (report.status === "PUBLISHED") {
        const publishedAt = report.publishedAt;
        const noViews = report.views.length === 0;
        const noAcknowledgement = !report.views.some((view) => view.acknowledgedAt);
        if (noViews || (publishedAt && publishedAt < sevenDaysAgo && noAcknowledgement)) {
          receiptQueue.push({ id: report.id, engagementId: engagement.id, studentName, title: report.title, detail: noViews ? t(lang, "Published but not opened after 3 days", "发布超过3天仍未查看") : t(lang, "Not acknowledged after 7 days", "发布超过7天仍未确认"), tone: "risk", href });
        }
      }
    }
    for (const task of engagement.tasks) taskQueue.push({ id: task.id, engagementId: engagement.id, studentName, title: task.title, detail: `${task.assignedTo.name} · ${formatBusinessDateTime(task.dueAt)}`, tone: "risk", href: `/admin/care/${engagement.id}` });
    for (const risk of engagement.riskCases) riskQueue.push({ id: risk.id, engagementId: engagement.id, studentName, title: risk.title, detail: `${risk.riskLevel} · ${risk.status} · ${risk.owner.name} · SLA ${formatBusinessDateTime(risk.responseDueAt)}`, tone: risk.status === "OPEN" && risk.responseDueAt < now ? "risk" : "neutral", href: `/admin/care/${engagement.id}/operations#risks` });
    for (const question of engagement.parentQuestions) {
      const overdue = question.status === "OPEN" && question.createdAt < new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const awaitingRead = question.status === "ANSWERED" && !question.parentViewedResponseAt;
      questionQueue.push({ id: question.id, engagementId: engagement.id, studentName, title: question.question.slice(0, 80), detail: overdue ? t(lang, "Parent question overdue", "家长提问超过24小时未回复") : awaitingRead ? t(lang, "Answered, waiting for parent to read", "已回复，等待家长查看") : question.status, tone: overdue ? "risk" : "neutral", href: `/admin/care/${engagement.id}/reports/${question.reportId}#questions` });
    }
    for (const coverage of engagement.coveragePeriods) coverageQueue.push({ id: coverage.id, engagementId: engagement.id, studentName, title: `${t(lang, "Backup", "代班")}: ${coverage.backup.name}`, detail: `${coverage.status} · ${formatBusinessDateTime(coverage.startAt)} - ${formatBusinessDateTime(coverage.endAt)}`, tone: coverage.status === "ACTIVE" ? "active" : "neutral", href: `/admin/care/${engagement.id}/operations#coverage` });
    for (const review of engagement.serviceReviews) reviewQueue.push({ id: review.id, engagementId: engagement.id, studentName, title: review.periodLabel, detail: `${t(lang, "Submitted", "已提交")}: ${review.submittedAt ? formatBusinessDateTime(review.submittedAt) : "-"}`, href: `/admin/care/${engagement.id}/operations#reviews` });
  }

  const matches = (item: QueueItem) => {
    const text = `${item.studentName} ${item.title} ${item.detail}`.toLowerCase();
    return (!query || text.includes(query)) && (urgency !== "OVERDUE" || item.tone === "risk");
  };
  const visible = (key: string, items: QueueItem[]) => (selectedQueue === "ALL" || selectedQueue === key) ? items.filter(matches) : [];
  const visibleRiskQueue = visible("RISKS", riskQueue);
  const visibleTaskQueue = visible("TASKS", taskQueue);
  const visibleQuestionQueue = visible("QUESTIONS", questionQueue);
  const visibleReportQueue = visible("REPORTS", reportQueue);
  const visibleReceiptQueue = visible("RECEIPTS", receiptQueue);
  const visibleCoverageQueue = visible("COVERAGE", coverageQueue);
  const visibleReviewQueue = visible("REVIEWS", reviewQueue);
  const visibleConfigQueue = visible("CONFIG", configQueue);
  const visibleRenewalQueue = visible("RENEWALS", renewalQueue);
  const visibleItems = [...visibleConfigQueue, ...visibleRenewalQueue, ...visibleRiskQueue, ...visibleTaskQueue, ...visibleQuestionQueue, ...visibleReportQueue, ...visibleReceiptQueue, ...visibleCoverageQueue, ...visibleReviewQueue];
  const total = visibleItems.length;
  const urgent = visibleItems.filter((item) => item.tone === "risk").length;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <div className={styles.eyebrow}>{t(lang, "Exception management", "异常管理")}</div>
        <h1>{t(lang, "Quality desk", "质量工作台")}</h1>
        <div className={styles.muted}>{t(lang, "Prioritized items that need a person to act.", "这里只保留需要负责人处理的事项，并按风险优先。")}</div>
      </div>
      <div className={styles.headerActions}>
        <Link className={styles.buttonSecondary} href="/admin/care">{t(lang, "Student projects", "学生项目")}</Link>
      </div>
    </header>
    <nav className={styles.moduleNav} aria-label={t(lang, "Care navigation", "全托管导航")}>
      <Link href="/admin/care">{t(lang, "Students", "学生项目")}</Link>
      <Link data-active="true" href="/admin/care/quality">{t(lang, "Quality", "质量工作台")}</Link>
    </nav>
    <form className={styles.filterBar} method="get">
      <label className={styles.label}>{t(lang, "Search student or item", "搜索学生或事项")}<input className={styles.field} name="q" defaultValue={String(sp?.q ?? "")} placeholder={t(lang, "Student name, task, risk...", "学生姓名、待办、风险……")} /></label>
      <label className={styles.label}>{t(lang, "Queue", "事项类型")}<select className={styles.select} name="queue" defaultValue={selectedQueue}><option value="ALL">{t(lang, "All queues", "全部类型")}</option><option value="CONFIG">{t(lang, "Launch configuration", "上线配置")}</option><option value="RENEWALS">{t(lang, "Renewals", "续约")}</option><option value="RISKS">{t(lang, "Risks", "风险")}</option><option value="TASKS">{t(lang, "Tasks", "待办")}</option><option value="QUESTIONS">{t(lang, "Parent questions", "家长问答")}</option><option value="REPORTS">{t(lang, "Reports", "报告")}</option><option value="RECEIPTS">{t(lang, "Parent receipt", "家长查看")}</option><option value="COVERAGE">{t(lang, "Coverage", "代班")}</option><option value="REVIEWS">{t(lang, "Reviews", "复盘")}</option></select></label>
      <label className={styles.label}>{t(lang, "Urgency", "紧急程度")}<select className={styles.select} name="urgency" defaultValue={urgency}><option value="ALL">{t(lang, "All items", "全部事项")}</option><option value="OVERDUE">{t(lang, "Overdue only", "仅已超时")}</option></select></label>
      <button className={styles.button} type="submit">{t(lang, "Apply", "筛选")}</button>
      <Link className={styles.buttonSecondary} href="/admin/care/quality">{t(lang, "Reset", "重置")}</Link>
    </form>
    <div className={styles.metrics}>
      <div className={styles.metric}><strong>{total}</strong><span className={styles.muted}>{t(lang, "Action items", "待处理")}</span></div>
      <div className={styles.metric} data-tone={urgent ? "risk" : "active"}><strong>{urgent}</strong><span className={styles.muted}>{t(lang, "Overdue", "已超时")}</span></div>
      <div className={styles.metric} data-tone={visibleRiskQueue.length ? "risk" : "active"}><strong>{visibleRiskQueue.length}</strong><span className={styles.muted}>{t(lang, "Open risks", "未结风险")}</span></div>
      <div className={styles.metric}><strong>{visibleQuestionQueue.length}</strong><span className={styles.muted}>{t(lang, "Parent questions", "家长问答")}</span></div>
    </div>
    {total ? <div className={styles.queueGrid}>
      <Queue title={t(lang, "Launch configuration", "上线配置缺口")} items={visibleConfigQueue} empty={t(lang, "No configuration gaps.", "上线配置完整。")} open={t(lang, "Complete", "补齐")} />
      <Queue title={t(lang, "Expiry and renewal", "到期与续约")} items={visibleRenewalQueue} empty={t(lang, "No renewal action required.", "暂无续约事项。")} open={t(lang, "Follow up", "跟进")} />
      <Queue title={t(lang, "Risk and SLA", "风险与响应时限")} items={visibleRiskQueue} empty={t(lang, "No open risks.", "暂无未结风险。")} open={t(lang, "Handle", "处理")} />
      <Queue title={t(lang, "Overdue tasks", "逾期待办")} items={visibleTaskQueue} empty={t(lang, "No overdue tasks.", "暂无逾期待办。")} open={t(lang, "Open", "打开")} />
      <Queue title={t(lang, "Parent questions", "家长问答")} items={visibleQuestionQueue} empty={t(lang, "No open questions.", "暂无待闭环提问。")} open={t(lang, "Reply", "回复")} />
      <Queue title={t(lang, "Reports awaiting action", "报告待处理")} items={visibleReportQueue} empty={t(lang, "No report exceptions.", "报告无异常。")} open={t(lang, "Open", "打开")} />
      <Queue title={t(lang, "Parent receipt", "家长查看与确认")} items={visibleReceiptQueue} empty={t(lang, "No receipt exceptions.", "家长查看确认无异常。")} open={t(lang, "Open", "打开")} />
      <Queue title={t(lang, "Coverage handover", "代班交接")} items={visibleCoverageQueue} empty={t(lang, "No active or upcoming coverage.", "暂无进行中或即将开始的代班。")} open={t(lang, "Open", "打开")} />
      <Queue title={t(lang, "Service review approval", "服务复盘审核")} items={visibleReviewQueue} empty={t(lang, "No reviews awaiting approval.", "暂无待审核复盘。")} open={t(lang, "Review", "审核")} />
    </div> : <section className={styles.section}><div className={styles.emptyState}><strong>{t(lang, "Everything is clear", "目前没有异常")}</strong><span>{t(lang, "No overdue reports, risks, questions or tasks require action.", "没有逾期报告、风险、家长问题或待办需要处理。")}</span></div></section>}
  </main>;
}
