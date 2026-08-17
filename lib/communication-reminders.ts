import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/date-only";

export const COMMUNICATION_REMINDER_MODULE = "COMMUNICATION_REMINDERS";
export const COMMUNICATION_REMINDER_ENTITY = "CommunicationReminder";

export type CommunicationReminderStatus =
  | "READY"
  | "COPIED"
  | "SENT"
  | "WAITING_REPLY"
  | "REPLIED"
  | "COMPLETED"
  | "SNOOZED"
  | "ESCALATED";

export type CommunicationReminderPriority = "P0" | "P1" | "P2" | "P3";
export type CommunicationReminderGroup = "COURSE" | "TEACHING" | "REPORT" | "TICKET";

export type CommunicationReminderItem = {
  key: string;
  category: string;
  categoryLabel: string;
  title: string;
  subject: string;
  recipientType: "PARENT" | "TEACHER" | "INTERNAL";
  recipientName: string;
  recipientPhone?: string;
  studentName?: string;
  teacherName?: string;
  dueAt: string;
  dueText: string;
  urgency: "OVERDUE" | "TODAY" | "UPCOMING";
  status: CommunicationReminderStatus;
  statusLabel: string;
  sourceHref: string;
  sourceLabel: string;
  copyZh: string;
  copyEn: string;
  copyBilingual: string;
  snoozedUntil?: string;
  priority: CommunicationReminderPriority;
  priorityLabel: string;
  priorityReason: string;
  group: CommunicationReminderGroup;
  groupLabel: string;
};

const STATUS_LABELS: Record<CommunicationReminderStatus, string> = {
  READY: "待处理",
  COPIED: "已复制",
  SENT: "已发送",
  WAITING_REPLY: "等待回复",
  REPLIED: "已回复",
  COMPLETED: "已完成",
  SNOOZED: "已稍后提醒",
  ESCALATED: "已升级",
};

const DAY = 24 * 60 * 60 * 1000;

const GROUP_META: Record<string, { group: CommunicationReminderGroup; groupLabel: string }> = {
  CLASS_REMINDER: { group: "COURSE", groupLabel: "课程提醒" },
  TEACHER_CLASS_REMINDER: { group: "COURSE", groupLabel: "课程提醒" },
  ATTENDANCE: { group: "TEACHING", groupLabel: "教学跟进" },
  FEEDBACK: { group: "TEACHING", groupLabel: "教学跟进" },
  FEEDBACK_FORWARD: { group: "TEACHING", groupLabel: "教学跟进" },
  MIDTERM_REPORT: { group: "REPORT", groupLabel: "学习报告" },
  FINAL_REPORT: { group: "REPORT", groupLabel: "学习报告" },
  TICKET: { group: "TICKET", groupLabel: "工单确认" },
  TEACHER_CONFIRM: { group: "TICKET", groupLabel: "工单确认" },
};

export function classifyCommunicationReminder(input: Pick<CommunicationReminderItem, "category" | "urgency" | "status">) {
  const group = GROUP_META[input.category] ?? { group: "TICKET" as const, groupLabel: "工单确认" };
  if (input.status === "WAITING_REPLY") return { ...group, priority: "P2" as const, priorityLabel: "等待回复", priorityReason: "已经联系，等待对方回复" };
  if (input.status === "SNOOZED") return { ...group, priority: "P3" as const, priorityLabel: "后续跟进", priorityReason: "已经安排稍后提醒" };
  if (input.status === "ESCALATED") return { ...group, priority: "P0" as const, priorityLabel: "立即处理", priorityReason: "已经升级，需要立即接手" };
  if (input.status === "REPLIED") return { ...group, priority: "P0" as const, priorityLabel: "立即处理", priorityReason: "已经收到回复，需要继续处理" };
  if (input.urgency === "OVERDUE") return { ...group, priority: "P0" as const, priorityLabel: "立即处理", priorityReason: "已经超过计划处理时间" };
  if (input.urgency === "TODAY") return { ...group, priority: "P1" as const, priorityLabel: "今天处理", priorityReason: "需要在今天完成" };
  return { ...group, priority: "P3" as const, priorityLabel: "后续跟进", priorityReason: "尚未到处理截止时间" };
}

function bilingual(zh: string, en: string) {
  return `${zh}\n\nEnglish:\n${en}`;
}

function urgencyFor(dueAt: Date, now: Date): CommunicationReminderItem["urgency"] {
  if (dueAt.getTime() < now.getTime()) return "OVERDUE";
  const sgDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return sgDay(dueAt) === sgDay(now) ? "TODAY" : "UPCOMING";
}

function reminder(input: Omit<CommunicationReminderItem, "dueAt" | "dueText" | "urgency" | "status" | "statusLabel" | "copyBilingual" | "priority" | "priorityLabel" | "priorityReason" | "group" | "groupLabel"> & { dueAt: Date; now: Date }): CommunicationReminderItem {
  const { dueAt, now, ...base } = input;
  const urgency = urgencyFor(dueAt, now);
  const classified = classifyCommunicationReminder({ category: input.category, urgency, status: "READY" });
  return {
    ...base,
    dueAt: dueAt.toISOString(),
    dueText: formatBusinessDateTime(dueAt),
    urgency,
    status: "READY" as const,
    statusLabel: STATUS_LABELS.READY,
    copyBilingual: bilingual(input.copyZh, input.copyEn),
    ...classified,
  };
}

function sessionStudents(session: any) {
  const byId = new Map<string, { id: string; name: string; parentLinks: any[] }>();
  for (const student of [session.student, session.class.oneOnOneStudent, ...(session.class.enrollments ?? []).map((row: any) => row.student)]) {
    if (student?.id) byId.set(student.id, student);
  }
  return [...byId.values()];
}

function courseLabel(row: any) {
  return [row.class?.course?.name, row.class?.subject?.name, row.class?.level?.name].filter(Boolean).join(" / ") || "课程";
}

function reportMetaForwarded(reportJson: unknown) {
  if (!reportJson || typeof reportJson !== "object" || Array.isArray(reportJson)) return false;
  const row = reportJson as Record<string, unknown>;
  const meta = row._meta && typeof row._meta === "object" && !Array.isArray(row._meta)
    ? row._meta as Record<string, unknown>
    : {};
  return Boolean(row.forwardedAt || row.deliveredAt || row.parentForwardedAt || meta.forwardedAt || meta.deliveredAt || meta.lockedAfterForwarded);
}

export async function listCommunicationReminders(now = new Date(), limit = 300) {
  const from = new Date(now.getTime() - 7 * DAY);
  const to = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const studentInclude = {
    parentLinks: { include: { parent: { select: { name: true, phone: true } } } },
  } as const;

  const [sessions, midterms, finals, tickets, managerFeedbacks] = await Promise.all([
    prisma.session.findMany({
      where: { startAt: { gte: from, lte: to } },
      include: {
        teacher: { select: { name: true } },
        student: { include: studentInclude },
        attendances: { select: { studentId: true, status: true } },
        feedbacks: { select: { id: true, teacherId: true, forwardedAt: true, isProxyDraft: true, status: true } },
        class: {
          include: {
            teacher: { select: { name: true } },
            course: { select: { name: true } },
            subject: { select: { name: true } },
            level: { select: { name: true } },
            campus: { select: { name: true, isOnline: true } },
            room: { select: { name: true } },
            oneOnOneStudent: { include: studentInclude },
            enrollments: { include: { student: { include: studentInclude } } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 1200,
    }),
    prisma.midtermReport.findMany({
      where: { archivedAt: null, status: { in: ["ASSIGNED", "SUBMITTED"] }, assignedAt: { gte: new Date(now.getTime() - 120 * DAY) } },
      include: { student: true, teacher: true, course: true, subject: true },
      orderBy: { assignedAt: "asc" },
      take: 300,
    }),
    prisma.finalReport.findMany({
      where: { archivedAt: null, status: { in: ["ASSIGNED", "SUBMITTED", "FORWARDED"] }, assignedAt: { gte: new Date(now.getTime() - 180 * DAY) } },
      include: { student: true, teacher: true, course: true, subject: true },
      orderBy: { assignedAt: "asc" },
      take: 300,
    }),
    prisma.ticket.findMany({
      where: { isArchived: false, status: { notIn: ["Completed", "Closed", "Cancelled"] }, nextActionDue: { not: null } },
      orderBy: { nextActionDue: "asc" },
      take: 300,
    }),
    prisma.managerTeacherFeedback.findMany({
      where: { requiresAck: true, acknowledgedAt: null, archivedAt: null },
      include: { teacher: { select: { name: true } }, ticket: { select: { ticketNo: true, studentName: true } } },
      orderBy: { createdAt: "asc" },
      take: 300,
    }),
  ]);

  const items: CommunicationReminderItem[] = [];
  for (const session of sessions) {
    const teacherName = session.teacher?.name ?? session.class.teacher.name;
    const label = courseLabel(session);
    const time = `${formatBusinessDateTime(session.startAt)}–${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hour12: false }).format(session.endAt)}`;
    const location = session.class.campus.isOnline ? "线上" : [session.class.campus.name, session.class.room?.name].filter(Boolean).join(" · ");
    const students = sessionStudents(session);

    if (session.startAt > now && session.startAt.getTime() - now.getTime() <= 30 * 60 * 60 * 1000) {
      for (const student of students) {
        const primary = student.parentLinks?.find((row: any) => row.isPrimary) ?? student.parentLinks?.[0];
        const parentName = primary?.parent?.name || `${student.name}家长`;
        const zh = `${parentName}您好，提醒您：${student.name}的${label}将于${time}上课，老师${teacherName}，${location}。如需调整，请尽快联系我们，谢谢。`;
        const en = `Hello ${parentName}, a reminder that ${student.name}'s ${label} lesson is scheduled for ${time}, with ${teacherName}, at ${location}. Please contact us as soon as possible if any change is needed. Thank you.`;
        items.push(reminder({ key: `SESSION_PARENT_24H:${session.id}:${student.id}`, category: "CLASS_REMINDER", categoryLabel: "上课提醒", title: `${student.name} · 明日课程`, subject: `${label} · ${time}`, recipientType: "PARENT", recipientName: parentName, recipientPhone: primary?.parent?.phone || "", studentName: student.name, teacherName, dueAt: new Date(session.startAt.getTime() - DAY), now, sourceHref: `/admin/sessions?focusSessionId=${session.id}`, sourceLabel: "课次", copyZh: zh, copyEn: en }));
      }
      const studentText = students.map((student) => student.name).join("、");
      const zh = `${teacherName}老师您好，提醒您：${time}有${studentText}的${label}课程，上课地点：${location}。请确认课程安排，谢谢。`;
      const en = `Hello ${teacherName}, a reminder that you have a ${label} lesson with ${studentText} at ${time}, ${location}. Please confirm the arrangement. Thank you.`;
      items.push(reminder({ key: `SESSION_TEACHER_24H:${session.id}`, category: "TEACHER_CLASS_REMINDER", categoryLabel: "老师上课提醒", title: `${teacherName} · 明日课程`, subject: `${studentText} · ${time}`, recipientType: "TEACHER", recipientName: teacherName, studentName: studentText, teacherName, dueAt: new Date(session.startAt.getTime() - DAY), now, sourceHref: `/admin/sessions?focusSessionId=${session.id}`, sourceLabel: "课次", copyZh: zh, copyEn: en }));
    }

    if (session.endAt < now) {
      const studentText = students.map((student) => student.name).join("、");
      const attendanceMissing = students.some((student) => !session.attendances.some((a) => a.studentId === student.id && a.status !== "UNMARKED"));
      if (attendanceMissing && session.endAt.getTime() >= now.getTime() - 2 * DAY) {
        const dueAt = new Date(session.endAt.getTime() + 2 * 60 * 60 * 1000);
        const zh = `${teacherName}老师您好，${studentText}于${time}的${label}课程尚未完成考勤，请尽快补充。`;
        const en = `Hello ${teacherName}, attendance is still missing for ${studentText}'s ${label} lesson at ${time}. Please complete it as soon as possible.`;
        items.push(reminder({ key: `ATTENDANCE_MISSING:${session.id}`, category: "ATTENDANCE", categoryLabel: "考勤提醒", title: `${teacherName} · 未点名`, subject: `${studentText} · ${time}`, recipientType: "TEACHER", recipientName: teacherName, studentName: studentText, teacherName, dueAt, now, sourceHref: `/admin/sessions?focusSessionId=${session.id}`, sourceLabel: "考勤", copyZh: zh, copyEn: en }));
      }
      const finalFeedback = session.feedbacks.find((row) => !row.isProxyDraft && row.status !== "PROXY_DRAFT");
      if (!finalFeedback) {
        const dueAt = new Date(session.endAt.getTime() + DAY);
        const zh = `${teacherName}老师您好，${studentText}于${time}的${label}课程尚未填写课后反馈，请尽快完成，便于家长及时了解学习情况。`;
        const en = `Hello ${teacherName}, the lesson feedback for ${studentText}'s ${label} lesson at ${time} is still missing. Please complete it so the parent can receive a timely update.`;
        items.push(reminder({ key: `FEEDBACK_MISSING:${session.id}`, category: "FEEDBACK", categoryLabel: "课后反馈", title: `${teacherName} · 待填反馈`, subject: `${studentText} · ${time}`, recipientType: "TEACHER", recipientName: teacherName, studentName: studentText, teacherName, dueAt, now, sourceHref: `/admin/feedbacks?focusSessionId=${session.id}`, sourceLabel: "课后反馈", copyZh: zh, copyEn: en }));
      } else if (!finalFeedback.forwardedAt) {
        const primaryStudent = students[0];
        const primary = primaryStudent?.parentLinks?.find((row: any) => row.isPrimary) ?? primaryStudent?.parentLinks?.[0];
        const dueAt = new Date(finalFeedback.id ? session.endAt.getTime() + 30 * 60 * 60 * 1000 : session.endAt.getTime() + DAY);
        const zh = `${primary?.parent?.name || "家长"}您好，${primaryStudent?.name || studentText}的${label}课后反馈已准备好，请查收。如有问题，欢迎随时联系我们。`;
        const en = `Hello ${primary?.parent?.name || "Parent"}, the lesson feedback for ${primaryStudent?.name || studentText}'s ${label} lesson is ready. Please review it, and feel free to contact us if you have any questions.`;
        items.push(reminder({ key: `FEEDBACK_FORWARD:${finalFeedback.id}`, category: "FEEDBACK_FORWARD", categoryLabel: "反馈转发", title: `${primaryStudent?.name || studentText} · 反馈待发`, subject: `${label} · ${time}`, recipientType: "PARENT", recipientName: primary?.parent?.name || "家长", recipientPhone: primary?.parent?.phone || "", studentName: primaryStudent?.name || studentText, teacherName, dueAt, now, sourceHref: `/admin/feedbacks?focusFeedbackId=${finalFeedback.id}`, sourceLabel: "课后反馈", copyZh: zh, copyEn: en }));
      }
    }
  }

  for (const report of midterms) {
    const isFill = report.status === "ASSIGNED";
    const activityAt = isFill ? report.assignedAt : report.submittedAt ?? report.updatedAt;
    if (activityAt.getTime() < now.getTime() - (isFill ? 30 : 14) * DAY) continue;
    const dueAt = new Date((isFill ? report.assignedAt : report.submittedAt ?? report.updatedAt).getTime() + (isFill ? 7 : 2) * DAY);
    if (!isFill && reportMetaForwarded(report.reportJson)) continue;
    const label = [report.course.name, report.subject?.name].filter(Boolean).join(" / ");
    const zh = isFill ? `${report.teacher.name}老师您好，${report.student.name}的${label}中期报告尚未填写，请尽快完成，谢谢。` : `${report.student.name}的${label}中期报告已提交，请完成审核并发送家长。`;
    const en = isFill ? `Hello ${report.teacher.name}, ${report.student.name}'s ${label} midterm report is still pending. Please complete it as soon as possible. Thank you.` : `${report.student.name}'s ${label} midterm report has been submitted. Please review and send it to the parent.`;
    items.push(reminder({ key: `${isFill ? "MIDTERM_FILL" : "MIDTERM_DELIVER"}:${report.id}`, category: "MIDTERM_REPORT", categoryLabel: isFill ? "中期报告填写" : "中期报告发放", title: `${report.student.name} · 中期报告`, subject: label, recipientType: isFill ? "TEACHER" : "INTERNAL", recipientName: isFill ? report.teacher.name : "Emily", studentName: report.student.name, teacherName: report.teacher.name, dueAt, now, sourceHref: "/admin/reports/midterm", sourceLabel: "中期报告", copyZh: zh, copyEn: en }));
  }

  for (const report of finals) {
    const isFill = report.status === "ASSIGNED";
    if (!isFill && report.deliveredAt) continue;
    const activityAt = isFill ? report.assignedAt : report.submittedAt ?? report.forwardedAt ?? report.updatedAt;
    if (activityAt.getTime() < now.getTime() - (isFill ? 30 : 14) * DAY) continue;
    const dueAt = new Date((isFill ? report.assignedAt : report.submittedAt ?? report.forwardedAt ?? report.updatedAt).getTime() + (isFill ? 7 : 2) * DAY);
    const label = [report.course.name, report.subject?.name].filter(Boolean).join(" / ");
    const zh = isFill ? `${report.teacher.name}老师您好，${report.student.name}的${label}期末报告尚未填写，请尽快完成，谢谢。` : `${report.student.name}的${label}期末报告已准备好，请完成审核并发送家长。`;
    const en = isFill ? `Hello ${report.teacher.name}, ${report.student.name}'s ${label} final report is still pending. Please complete it as soon as possible. Thank you.` : `${report.student.name}'s ${label} final report is ready. Please review and send it to the parent.`;
    items.push(reminder({ key: `${isFill ? "FINAL_FILL" : "FINAL_DELIVER"}:${report.id}`, category: "FINAL_REPORT", categoryLabel: isFill ? "期末报告填写" : "期末报告发放", title: `${report.student.name} · 期末报告`, subject: label, recipientType: isFill ? "TEACHER" : "INTERNAL", recipientName: isFill ? report.teacher.name : "Emily", studentName: report.student.name, teacherName: report.teacher.name, dueAt, now, sourceHref: "/admin/reports/final", sourceLabel: "期末报告", copyZh: zh, copyEn: en }));
  }

  for (const ticket of tickets) {
    if (!ticket.nextActionDue) continue;
    if (/\btest\b|MiniappOperation/i.test(ticket.studentName)) continue;
    const waitingParent = /parent|家长/i.test(ticket.status) || /parent|家长|回复/i.test(ticket.nextAction || "");
    const recipientName = waitingParent ? `${ticket.studentName}家长` : "Emily";
    const zh = waitingParent ? `${recipientName}您好，关于${ticket.studentName}的「${ticket.type}」请求，我们正在跟进。当前需要：${ticket.nextAction || "请您确认相关信息"}。请有空时回复，谢谢。` : `工单 ${ticket.ticketNo}（${ticket.studentName} · ${ticket.type}）需要跟进：${ticket.nextAction || "请查看工单下一步"}。`;
    const en = waitingParent ? `Hello, regarding ${ticket.studentName}'s ${ticket.type} request, we are following up. We currently need: ${ticket.nextAction || "your confirmation of the relevant information"}. Please reply when convenient. Thank you.` : `Ticket ${ticket.ticketNo} (${ticket.studentName} · ${ticket.type}) needs follow-up: ${ticket.nextAction || "please review the next action"}.`;
    items.push(reminder({ key: `TICKET_FOLLOWUP:${ticket.id}`, category: "TICKET", categoryLabel: "工单跟进", title: `${ticket.studentName} · ${ticket.type}`, subject: ticket.nextAction || ticket.summary || "待跟进", recipientType: waitingParent ? "PARENT" : "INTERNAL", recipientName, studentName: ticket.studentName, dueAt: ticket.nextActionDue, now, sourceHref: `/admin/tickets/${ticket.id}`, sourceLabel: `工单 ${ticket.ticketNo}`, copyZh: zh, copyEn: en }));
  }

  for (const feedback of managerFeedbacks) {
    const dueAt = new Date(feedback.createdAt.getTime() + DAY);
    const studentName = feedback.ticket?.studentName || "";
    const zh = `${feedback.teacher.name}老师您好，您有一条${studentName ? `关于${studentName}的` : ""}课程安排需要确认：${feedback.body}。请确认后回复，谢谢。`;
    const en = `Hello ${feedback.teacher.name}, you have a ${studentName ? `${studentName} ` : ""}course arrangement to confirm: ${feedback.body}. Please reply after checking. Thank you.`;
    items.push(reminder({ key: `TEACHER_CONFIRM:${feedback.id}`, category: "TEACHER_CONFIRM", categoryLabel: "老师确认", title: `${feedback.teacher.name} · 待确认`, subject: feedback.body, recipientType: "TEACHER", recipientName: feedback.teacher.name, studentName, teacherName: feedback.teacher.name, dueAt, now, sourceHref: feedback.ticketId ? `/admin/tickets/${feedback.ticketId}` : "/admin/teacher-notices", sourceLabel: feedback.ticket?.ticketNo ? `工单 ${feedback.ticket.ticketNo}` : "老师确认", copyZh: zh, copyEn: en }));
  }

  const keys = items.map((item) => item.key);
  const logs = keys.length ? await prisma.auditLog.findMany({ where: { module: COMMUNICATION_REMINDER_MODULE, entityType: COMMUNICATION_REMINDER_ENTITY, entityId: { in: keys } }, orderBy: { createdAt: "desc" }, take: Math.min(keys.length * 4, 2000) }) : [];
  const latest = new Map<string, (typeof logs)[number]>();
  for (const log of logs) if (log.entityId && !latest.has(log.entityId)) latest.set(log.entityId, log);
  const visible = items.map((item) => {
    const log = latest.get(item.key);
    const meta = log?.meta && typeof log.meta === "object" && !Array.isArray(log.meta) ? log.meta as Record<string, unknown> : {};
    const rawStatus = String(meta.status || "READY");
    let status = (rawStatus in STATUS_LABELS ? rawStatus : "READY") as CommunicationReminderStatus;
    const snoozedUntil = typeof meta.snoozedUntil === "string" ? meta.snoozedUntil : undefined;
    if (status === "SNOOZED" && (!snoozedUntil || new Date(snoozedUntil).getTime() <= now.getTime())) status = "READY";
    const classified = classifyCommunicationReminder({ category: item.category, urgency: item.urgency, status });
    return { ...item, status, statusLabel: STATUS_LABELS[status], snoozedUntil, ...classified };
  }).filter((item) => item.status !== "COMPLETED");

  visible.sort((a, b) => {
    const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const groupRank = { TICKET: 0, COURSE: 1, TEACHING: 2, REPORT: 3 };
    return priorityRank[a.priority] - priorityRank[b.priority]
      || groupRank[a.group] - groupRank[b.group]
      || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
  return visible.slice(0, limit);
}

export function communicationReminderSummary(items: CommunicationReminderItem[], now = new Date()) {
  return {
    total: items.length,
    overdue: items.filter((item) => item.urgency === "OVERDUE").length,
    today: items.filter((item) => item.urgency === "TODAY").length,
    waitingReply: items.filter((item) => item.status === "WAITING_REPLY").length,
    escalated: items.filter((item) => item.status === "ESCALATED").length,
    priority: {
      P0: items.filter((item) => item.priority === "P0").length,
      P1: items.filter((item) => item.priority === "P1").length,
      P2: items.filter((item) => item.priority === "P2").length,
      P3: items.filter((item) => item.priority === "P3").length,
    },
    groups: {
      COURSE: items.filter((item) => item.group === "COURSE").length,
      TEACHING: items.filter((item) => item.group === "TEACHING").length,
      REPORT: items.filter((item) => item.group === "REPORT").length,
      TICKET: items.filter((item) => item.group === "TICKET").length,
    },
    generatedAt: now.toISOString(),
  };
}

export function normalizeCommunicationReminderStatus(value: unknown): CommunicationReminderStatus | null {
  const status = String(value ?? "").trim().toUpperCase();
  return status in STATUS_LABELS ? status as CommunicationReminderStatus : null;
}
