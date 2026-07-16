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
  return <section className={styles.section}>
    <div className={styles.timelineHead}><h2>{title}</h2><span className={styles.badge} data-tone={items.some((item) => item.tone === "risk") ? "risk" : "neutral"}>{items.length}</span></div>
    <div className={styles.rows}>
      {items.map((item) => <article className={styles.fileRow} key={item.id}><div><strong>{item.studentName} · {item.title}</strong><div className={styles.muted}>{item.detail}</div></div><Link className={styles.buttonSecondary} href={item.href}>{open}</Link></article>)}
      {!items.length ? <div className={styles.muted}>{empty}</div> : null}
    </div>
  </section>;
}

export default async function CareQualityPage() {
  const actor = await requireCareStaff();
  const lang = await getLang();
  const broadAccess = actor.role === "ADMIN" || await isManagerUser(actor);
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
      nextReportDueAt: true,
      student: { select: { name: true } },
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

  for (const engagement of engagements) {
    const studentName = engagement.student.name;
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

  const total = reportQueue.length + receiptQueue.length + taskQueue.length + riskQueue.length + questionQueue.length + coverageQueue.length + reviewQueue.length;
  const urgent = [...reportQueue, ...receiptQueue, ...taskQueue, ...riskQueue, ...questionQueue].filter((item) => item.tone === "risk").length;

  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.toolbar}><Link className={styles.buttonSecondary} href="/admin/care">{t(lang, "Back", "返回全托管")}</Link></div><h1 style={{ marginTop: 10 }}>{t(lang, "Care quality dashboard", "全托管质量工作台")}</h1><div className={styles.muted}>{t(lang, "Only exceptions and items requiring action are shown.", "只显示异常和需要处理的事项。")}</div></div></header>
    <div className={styles.metrics}><div className={styles.metric}><strong>{total}</strong><span className={styles.muted}>{t(lang, "Action items", "待处理")}</span></div><div className={styles.metric}><strong>{urgent}</strong><span className={styles.muted}>{t(lang, "Overdue", "已超时")}</span></div><div className={styles.metric}><strong>{riskQueue.length}</strong><span className={styles.muted}>{t(lang, "Open risks", "未结风险")}</span></div><div className={styles.metric}><strong>{questionQueue.length}</strong><span className={styles.muted}>{t(lang, "Parent questions", "家长问答")}</span></div></div>
    <Queue title={t(lang, "Reports awaiting action", "报告待处理")} items={reportQueue} empty={t(lang, "No report exceptions.", "报告无异常。")} open={t(lang, "Open", "打开")} />
    <Queue title={t(lang, "Parent receipt", "家长查看与确认")} items={receiptQueue} empty={t(lang, "No receipt exceptions.", "家长查看确认无异常。")} open={t(lang, "Open", "打开")} />
    <Queue title={t(lang, "Risk and SLA", "风险与响应时限")} items={riskQueue} empty={t(lang, "No open risks.", "暂无未结风险。")} open={t(lang, "Handle", "处理")} />
    <Queue title={t(lang, "Parent questions", "家长问答")} items={questionQueue} empty={t(lang, "No open questions.", "暂无待闭环提问。")} open={t(lang, "Reply", "回复")} />
    <Queue title={t(lang, "Overdue tasks", "逾期待办")} items={taskQueue} empty={t(lang, "No overdue tasks.", "暂无逾期待办。")} open={t(lang, "Open", "打开")} />
    <Queue title={t(lang, "Coverage handover", "代班交接")} items={coverageQueue} empty={t(lang, "No active or upcoming coverage.", "暂无进行中或即将开始的代班。")} open={t(lang, "Open", "打开")} />
    <Queue title={t(lang, "Service review approval", "服务复盘审核")} items={reviewQueue} empty={t(lang, "No reviews awaiting approval.", "暂无待审核复盘。")} open={t(lang, "Review", "审核")} />
  </main>;
}
