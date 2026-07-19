import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessDateWithWeekday, formatBusinessTimeOnly, parseBusinessDateStart } from "@/lib/date-only";
import { logAudit } from "@/lib/audit-log";
import { queueFirstPublishedFeedback } from "@/lib/miniapp-feedback-notification";
import { getMissingParentFeedbackSections, parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { getVisibleSessionStudents } from "@/lib/session-students";

export type CommunicationActor = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const OPEN_STATUSES = ["PENDING_REVIEW", "READY_TO_SEND", "CLAIMED", "RETURNED", "ATTENTION"];

function fingerprint(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function reminderScheduleLines(value: string) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\b/.test(line));
}

function hasSameReminderSchedule(existingText: string, nextText: string) {
  const existingLines = reminderScheduleLines(existingText);
  const nextLines = reminderScheduleLines(nextText);
  return existingLines.length > 0 && JSON.stringify(existingLines) === JSON.stringify(nextLines);
}

function compact(value: string, max = 260) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function courseLabel(session: any) {
  return [session.class.course?.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
}

function teacherSalutation(name: string) {
  const value = name.trim();
  return value.endsWith("老师") ? value : `${value}老师`;
}

function locationLabel(session: any) {
  if (session.class.campus?.isOnline) return "线上课程 / Online";
  return [session.class.campus?.name, session.class.room?.name].filter(Boolean).join(" · ") || "待确认 / To confirm";
}

async function primaryParentLink(studentId: string) {
  return prisma.parentStudentLink.findFirst({
    where: { studentId, parent: { status: "ACTIVE" } },
    include: { parent: { select: { id: true, name: true, phone: true } } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

async function upsertCommunicationTask(input: {
  taskKey: string;
  kind: string;
  status: string;
  priority?: string;
  studentId?: string | null;
  sessionId?: string | null;
  feedbackId?: string | null;
  teacherId?: string | null;
  parentId?: string | null;
  title: string;
  messageText: string;
  dueAt?: Date | null;
  ownerName?: string | null;
  wechatGroupName?: string | null;
  presentationOnlyIfBodyUnchanged?: boolean;
}) {
  const { presentationOnlyIfBodyUnchanged = false, ...taskData } = input;
  const contentFingerprint = fingerprint(input.messageText);
  const existing = await prisma.parentCommunicationTask.findUnique({ where: { taskKey: input.taskKey } });
  if (!existing) {
    return prisma.parentCommunicationTask.create({
      data: { ...taskData, priority: input.priority ?? "NORMAL", contentFingerprint },
    });
  }
  if (existing.contentFingerprint === contentFingerprint) {
    if (!existing.manualSentAt && existing.status !== input.status) {
      return prisma.parentCommunicationTask.update({ where: { id: existing.id }, data: { status: input.status, note: input.status === "PENDING_REVIEW" ? null : existing.note } });
    }
    return existing;
  }

  if (
    presentationOnlyIfBodyUnchanged &&
    hasSameReminderSchedule(existing.messageText, input.messageText)
  ) {
    return prisma.parentCommunicationTask.update({
      where: { id: existing.id },
      data: { title: input.title, messageText: input.messageText, contentFingerprint, dueAt: input.dueAt ?? existing.dueAt },
    });
  }

  if (existing.manualSentAt || existing.status === "COMPLETED") {
    const correctionKey = `${input.taskKey}:correction:${contentFingerprint.slice(0, 12)}`;
    const feedbackRevision = input.kind === "FEEDBACK";
    await prisma.parentCommunicationTask.update({
      where: { id: existing.id },
      data: { supersededAt: existing.supersededAt ?? new Date() },
    });
    return prisma.parentCommunicationTask.upsert({
      where: { taskKey: correctionKey },
      create: {
        ...taskData,
        taskKey: correctionKey,
        kind: feedbackRevision ? "FEEDBACK" : "COURSE_CHANGE",
        status: feedbackRevision ? input.status : "ATTENTION",
        priority: "HIGH",
        title: feedbackRevision ? `【反馈修订】${input.title}` : `【更正通知】${input.title}`,
        messageText: feedbackRevision ? input.messageText : `【课程安排有更新，请以本条为准】\n${input.messageText}`,
        contentFingerprint,
        correctionOfTaskId: existing.id,
      },
      update: {
        messageText: feedbackRevision ? input.messageText : `【课程安排有更新，请以本条为准】\n${input.messageText}`,
        contentFingerprint,
        status: feedbackRevision ? input.status : "ATTENTION",
        priority: "HIGH",
      },
    });
  }

  return prisma.parentCommunicationTask.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      messageText: input.messageText,
      contentFingerprint,
      dueAt: input.dueAt ?? existing.dueAt,
      parentId: input.parentId ?? existing.parentId,
      wechatGroupName: input.wechatGroupName ?? existing.wechatGroupName,
      ownerName: existing.ownerName ?? input.ownerName ?? null,
      status: existing.status === "RETURNED" && input.status === "RETURNED" ? existing.status : input.status,
    },
  });
}

export async function ensureFeedbackCommunicationTasks(feedbackId: string) {
  const feedback = await prisma.sessionFeedback.findUnique({
    where: { id: feedbackId },
    include: {
      teacher: { select: { name: true } },
      session: {
        include: {
          student: true,
          attendances: { select: { studentId: true, status: true } },
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              campus: true,
              room: true,
              oneOnOneStudent: true,
              enrollments: { include: { student: true } },
            },
          },
        },
      },
    },
  });
  if (!feedback || feedback.isProxyDraft || feedback.status === "PROXY_DRAFT") return [];

  const students = getVisibleSessionStudents(feedback.session);
  const messageContent = feedback.reviewStatus === "PENDING_REVIEW" ? feedback.content : feedback.parentContent || feedback.content;
  return Promise.all(students.map(async (student) => {
    const link = await primaryParentLink(student.id);
    const messageText = [
      `${link?.parent.name || "家长"}您好，${student.name || "孩子"}本次课程的课后反馈已经更新。`,
      `课程 / Course：${courseLabel(feedback.session)}`,
      `时间 / Time：${formatBusinessDateTime(feedback.session.startAt)}`,
      `老师 / Teacher：${feedback.teacher.name}`,
      `反馈摘要 / Summary：${compact(messageContent)}`,
      "详细课堂表现与作业请在家长小程序中查看。 / Please open the parent miniapp for the full feedback and homework.",
    ].join("\n");
    return upsertCommunicationTask({
      taskKey: `FEEDBACK:${feedback.id}:${student.id}`,
      kind: "FEEDBACK",
      status: feedback.reviewStatus === "RETURNED" ? "RETURNED" : feedback.reviewStatus === "PUBLISHED" && feedback.publishedAt ? "READY_TO_SEND" : "PENDING_REVIEW",
      studentId: student.id,
      sessionId: feedback.sessionId,
      feedbackId: feedback.id,
      teacherId: feedback.teacherId,
      parentId: link?.parentId ?? null,
      title: `${student.name || "学员"} · ${courseLabel(feedback.session)}课后反馈`,
      messageText,
      dueAt: new Date(feedback.submittedAt.getTime() + 24 * 60 * 60 * 1000),
      ownerName: link?.communicationOwner ?? null,
      wechatGroupName: link?.wechatGroupName ?? null,
    });
  }));
}

async function syncFeedbackTasks() {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.sessionFeedback.findMany({
    where: { submittedAt: { gte: since }, isProxyDraft: false, status: { not: "PROXY_DRAFT" }, reviewStatus: { in: ["PENDING_REVIEW", "RETURNED"] } },
    select: { id: true },
    orderBy: { submittedAt: "desc" },
    take: 1000,
  });
  for (const row of rows) await ensureFeedbackCommunicationTasks(row.id);
  return rows.length;
}

function tomorrowRange(now = new Date()) {
  const today = formatBusinessDateOnly(now);
  const startToday = parseBusinessDateStart(today)!;
  const start = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1), date: formatBusinessDateOnly(start) };
}

async function syncTomorrowReminderTasks() {
  const range = tomorrowRange();
  const sessions = await prisma.session.findMany({
    where: { startAt: { gte: range.start, lte: range.end } },
    include: {
      teacher: { select: { id: true, name: true } },
      student: true,
      attendances: { select: { studentId: true, status: true } },
      class: {
        include: {
          teacher: { select: { id: true, name: true } }, course: true, subject: true, level: true,
          campus: true, room: true, oneOnOneStudent: true, enrollments: { include: { student: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 1500,
  });

  const byStudent = new Map<string, { student: { id: string; name: string | null }; sessions: any[] }>();
  const byTeacher = new Map<string, { teacher: { id: string; name: string }; sessions: any[] }>();
  for (const session of sessions) {
    for (const student of getVisibleSessionStudents(session)) {
      const entry = byStudent.get(student.id) ?? { student, sessions: [] };
      entry.sessions.push(session);
      byStudent.set(student.id, entry);
    }
    const teacher = session.teacher ?? session.class.teacher;
    const teacherEntry = byTeacher.get(teacher.id) ?? { teacher, sessions: [] };
    teacherEntry.sessions.push(session);
    byTeacher.set(teacher.id, teacherEntry);
  }

  let count = 0;
  const activeParentKeys = new Set<string>();
  for (const { student, sessions: studentSessions } of byStudent.values()) {
    const link = await primaryParentLink(student.id);
    if (link?.manualReminderEnabled === false) continue;
    const fullDateLabel = formatBusinessDateWithWeekday(studentSessions[0].startAt);
    const shortDateLabel = formatBusinessDateWithWeekday(studentSessions[0].startAt, { short: true });
    const lines = studentSessions.map((session) =>
      `${formatBusinessTimeOnly(session.startAt)}–${formatBusinessTimeOnly(session.endAt)} ${courseLabel(session)} · ${session.teacher?.name || session.class.teacher.name} · ${locationLabel(session)}`
    );
    const messageText = [
      `${link?.parent.name || "家长"}您好，温馨提醒，${student.name || "孩子"}在${fullDateLabel}的课程如下，请进入家长小程序查看完整课表：`,
      ...lines,
      "如时间或安排有变化，请及时联系我们。 / Please contact us promptly if anything changes.",
    ].join("\n");
    const taskKey = `COURSE_PARENT:${range.date}:${student.id}`;
    activeParentKeys.add(taskKey);
    await upsertCommunicationTask({
      taskKey,
      kind: "COURSE_REMINDER_PARENT",
      status: "READY_TO_SEND",
      studentId: student.id,
      sessionId: studentSessions.length === 1 ? studentSessions[0].id : null,
      parentId: link?.parentId ?? null,
      title: `${student.name || "学员"} · ${shortDateLabel}家长课程提醒`,
      messageText,
      dueAt: range.start,
      ownerName: link?.communicationOwner ?? null,
      wechatGroupName: link?.wechatGroupName ?? null,
      presentationOnlyIfBodyUnchanged: true,
    });
    count += 1;
  }

  const activeTeacherKeys = new Set<string>();
  for (const { teacher, sessions: teacherSessions } of byTeacher.values()) {
    const fullDateLabel = formatBusinessDateWithWeekday(teacherSessions[0].startAt);
    const shortDateLabel = formatBusinessDateWithWeekday(teacherSessions[0].startAt, { short: true });
    const lines = teacherSessions.map((session) => {
      const names = getVisibleSessionStudents(session).map((item) => item.name).filter(Boolean).join("、") || "待确认学生";
      return `${formatBusinessTimeOnly(session.startAt)}–${formatBusinessTimeOnly(session.endAt)} ${courseLabel(session)} · ${names} · ${locationLabel(session)}`;
    });
    const taskKey = `COURSE_TEACHER:${range.date}:${teacher.id}`;
    activeTeacherKeys.add(taskKey);
    await upsertCommunicationTask({
      taskKey,
      kind: "COURSE_REMINDER_TEACHER",
      status: "READY_TO_SEND",
      teacherId: teacher.id,
      title: `${teacher.name} · ${shortDateLabel}课程确认`,
      messageText: [
        `${teacherSalutation(teacher.name)}您好，${fullDateLabel}的课程如下，请进入员工小程序或网页版老师端核对并确认：`,
        "https://sgtmanage.com/teacher",
        ...lines,
        "如有时间、学生或地点问题，请立即联系教务。 / Please contact Academic Operations immediately if any detail is incorrect.",
      ].join("\n"),
      dueAt: range.start,
      presentationOnlyIfBodyUnchanged: true,
    });
    count += 1;
  }

  const priorTasks = await prisma.parentCommunicationTask.findMany({
    where: { OR: [{ taskKey: { startsWith: `COURSE_PARENT:${range.date}:` } }, { taskKey: { startsWith: `COURSE_TEACHER:${range.date}:` } }], correctionOfTaskId: null },
  });
  for (const prior of priorTasks) {
    const active = prior.kind === "COURSE_REMINDER_PARENT" ? activeParentKeys.has(prior.taskKey) : activeTeacherKeys.has(prior.taskKey);
    if (active) continue;
    if (prior.manualSentAt) {
      await upsertCommunicationTask({
        taskKey: prior.taskKey,
        kind: prior.kind,
        status: "ATTENTION",
        priority: "HIGH",
        studentId: prior.studentId,
        teacherId: prior.teacherId,
        parentId: prior.parentId,
        title: prior.title,
        messageText: "原定明日课程已经取消、改期或不再适用，请忽略上一条提醒。新的课程安排请以家长/员工小程序为准。 / The previous reminder is no longer valid. Please refer to the latest schedule in the miniapp.",
        dueAt: prior.dueAt,
        ownerName: prior.ownerName,
        wechatGroupName: prior.wechatGroupName,
      });
    } else {
      await prisma.parentCommunicationTask.update({ where: { id: prior.id }, data: { status: "WAIVED", note: "原课程已取消、改期或不再属于明日提醒范围。", completedAt: new Date(), supersededAt: new Date() } });
    }
  }
  return count;
}

export async function syncParentCommunicationCenter(actor?: CommunicationActor) {
  const [feedbackCount, reminderCount] = await Promise.all([syncFeedbackTasks(), syncTomorrowReminderTasks()]);
  if (actor) {
    await logAudit({
      actor,
      module: "COMMUNICATION",
      action: "SYNC_COMMUNICATION_TASKS",
      entityType: "ParentCommunicationTask",
      meta: { feedbackCount, reminderCount },
    });
  }
  return { feedbackCount, reminderCount };
}

export async function listParentCommunicationTasks(input: { status?: string; kind?: string; limit?: number }) {
  const where: Prisma.ParentCommunicationTaskWhereInput = {};
  if (input.status && input.status !== "ALL") {
    where.status = input.status === "OPEN" ? { in: OPEN_STATUSES } : input.status;
  }
  if (input.kind && input.kind !== "ALL") where.kind = input.kind;
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
  const [rows, summaryRows, kindStatusRows, staff] = await Promise.all([
    prisma.parentCommunicationTask.findMany({ where, orderBy: [{ priority: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }], take: limit }),
    prisma.parentCommunicationTask.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.parentCommunicationTask.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CS"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const studentIds = Array.from(new Set(rows.map((row) => row.studentId).filter((id): id is string => Boolean(id))));
  const teacherIds = Array.from(new Set(rows.map((row) => row.teacherId).filter((id): id is string => Boolean(id))));
  const feedbackIds = Array.from(new Set(rows.map((row) => row.feedbackId).filter((id): id is string => Boolean(id))));
  const sessionIds = Array.from(new Set(rows.map((row) => row.sessionId).filter((id): id is string => Boolean(id))));
  const [students, teachers, sessions, feedbacks, auditRows, notificationRows] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, school: true, grade: true } }),
    prisma.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } }),
    prisma.session.findMany({ where: { id: { in: sessionIds } }, select: { id: true, startAt: true, endAt: true } }),
    prisma.sessionFeedback.findMany({ where: { id: { in: feedbackIds } }, select: { id: true, content: true, parentContent: true, classPerformance: true, homework: true, previousHomeworkDone: true, actualStartAt: true, actualEndAt: true, reviewStatus: true, reviewNote: true, publishedAt: true, submittedAt: true } }),
    prisma.auditLog.findMany({ where: { entityType: "ParentCommunicationTask", entityId: { in: rows.map((row) => row.id) } }, select: { entityId: true, action: true, actorName: true, actorEmail: true, actorRole: true, createdAt: true, meta: true }, orderBy: { createdAt: "desc" }, take: 1500 }),
    prisma.miniappNotificationOutbox.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        OR: [{ targetType: "SessionFeedback", studentId: { in: studentIds } }, { studentId: { in: studentIds }, templateKey: "course_reminder_24h" }],
      },
      select: { id: true, studentId: true, targetId: true, templateKey: true, status: true, scheduledAt: true, sentAt: true, error: true, payloadJson: true },
      take: 3000,
    }),
  ]);
  const studentMap = new Map(students.map((row) => [row.id, row]));
  const teacherMap = new Map(teachers.map((row) => [row.id, row]));
  const sessionMap = new Map(sessions.map((row) => [row.id, row]));
  const feedbackMap = new Map(feedbacks.map((row) => [row.id, row]));
  const historyMap = new Map<string, typeof auditRows>();
  for (const audit of auditRows) {
    if (!audit.entityId) continue;
    const list = historyMap.get(audit.entityId) ?? [];
    if (list.length < 20) list.push(audit);
    historyMap.set(audit.entityId, list);
  }
  function automaticSummary(row: (typeof rows)[number]) {
    const matches = notificationRows.filter((notification) => {
      if (row.feedbackId) return notification.targetId === row.feedbackId || notification.targetId?.startsWith(`${row.feedbackId}:revision:`) === true;
      if (row.kind !== "COURSE_REMINDER_PARENT" || !row.studentId || notification.studentId !== row.studentId || !row.dueAt) return false;
      const payload = notification.payloadJson && typeof notification.payloadJson === "object" ? notification.payloadJson as any : {};
      const startAt = payload.startAt ? new Date(String(payload.startAt)) : null;
      return Boolean(startAt && !Number.isNaN(startAt.getTime()) && formatBusinessDateOnly(startAt) === formatBusinessDateOnly(row.dueAt));
    });
    const counts = matches.reduce<Record<string, number>>((acc, notification) => { acc[notification.status] = (acc[notification.status] || 0) + 1; return acc; }, {});
    const status = counts.FAILED ? "FAILED" : counts.SENT ? "SENT" : counts.PENDING ? "PENDING" : counts.PROCESSING ? "PROCESSING" : counts.SKIPPED ? "SKIPPED" : "NOT_QUEUED";
    return { status, counts, total: matches.length };
  }
  return {
    tasks: rows.map((row) => {
      const session = row.sessionId ? sessionMap.get(row.sessionId) ?? null : null;
      const taskDate = session?.startAt ?? row.dueAt;
      const feedback = row.feedbackId ? feedbackMap.get(row.feedbackId) ?? null : null;
      const sections = feedback ? parseParentFeedbackSections(feedback.classPerformance || feedback.content) : null;
      const missingSections = feedback ? getMissingParentFeedbackSections(feedback.parentContent || feedback.content) : [];
      const homeworkMissing = Boolean(feedback && !String(feedback.homework ?? "").trim());
      const previousHomeworkMissing = Boolean(feedback && feedback.previousHomeworkDone === null);
      return ({
      ...row,
      dateLabel: taskDate ? formatBusinessDateWithWeekday(taskDate) : null,
      shortDateLabel: taskDate ? formatBusinessDateWithWeekday(taskDate, { short: true }) : null,
      dueAt: row.dueAt?.toISOString() ?? null,
      claimedAt: row.claimedAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      copiedAt: row.copiedAt?.toISOString() ?? null,
      manualSentAt: row.manualSentAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      student: row.studentId ? studentMap.get(row.studentId) ?? null : null,
      teacher: row.teacherId ? teacherMap.get(row.teacherId) ?? null : null,
      feedback: feedback ? {
        ...feedback,
        actualStartAt: feedback.actualStartAt?.toISOString() ?? null,
        actualEndAt: feedback.actualEndAt?.toISOString() ?? null,
        sections,
        completeness: {
          complete: missingSections.length === 0 && !homeworkMissing && !previousHomeworkMissing,
          completed: 7 - missingSections.length - (homeworkMissing ? 1 : 0) - (previousHomeworkMissing ? 1 : 0),
          total: 7,
          missing: [...missingSections, ...(homeworkMissing ? ["课后作业 / Homework"] : []), ...(previousHomeworkMissing ? ["上次作业完成情况 / Previous homework"] : [])],
        },
      } : null,
      history: (historyMap.get(row.id) ?? []).map((audit) => ({ ...audit, createdAt: audit.createdAt.toISOString() })),
      automaticNotification: automaticSummary(row),
    });}),
    summary: summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
    kindSummary: kindStatusRows.reduce<Record<string, number>>((acc, row) => {
      if (OPEN_STATUSES.includes(row.status)) acc[row.kind] = (acc[row.kind] || 0) + row._count._all;
      return acc;
    }, {}),
    kindStatusSummary: kindStatusRows.reduce<Record<string, Record<string, number>>>((acc, row) => {
      acc[row.kind] = acc[row.kind] || {};
      acc[row.kind][row.status] = row._count._all;
      return acc;
    }, {}),
    staff,
  };
}

async function auditTask(actor: CommunicationActor, action: string, taskId: string, meta?: Prisma.JsonValue) {
  await logAudit({ actor, module: "COMMUNICATION", action, entityType: "ParentCommunicationTask", entityId: taskId, meta });
}

export async function updateParentCommunicationTask(input: {
  id: string;
  action: string;
  actor: CommunicationActor;
  data?: Record<string, unknown>;
}) {
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id: input.id } });
  if (!task) throw new Error("Communication task not found");
  const now = new Date();
  const data = input.data ?? {};

  if (input.action === "claim") {
    const updated = await prisma.parentCommunicationTask.update({
      where: { id: task.id },
      data: { ownerUserId: input.actor.id, ownerName: input.actor.name, claimedAt: now, status: task.status === "PENDING_REVIEW" ? task.status : "CLAIMED" },
    });
    await auditTask(input.actor, "CLAIM_TASK", task.id, { previousOwner: task.ownerName });
    return updated;
  }

  if (input.action === "transfer") {
    const ownerUserId = String(data.ownerUserId ?? "").trim();
    const owner = await prisma.user.findFirst({ where: { id: ownerUserId, role: { in: ["ADMIN", "CS"] } }, select: { id: true, name: true } });
    if (!owner) throw new Error("Invalid communication owner");
    const updated = await prisma.parentCommunicationTask.update({ where: { id: task.id }, data: { ownerUserId: owner.id, ownerName: owner.name, claimedAt: now } });
    await auditTask(input.actor, "TRANSFER_TASK", task.id, { from: task.ownerName, to: owner.name, note: String(data.note ?? "").slice(0, 500) });
    return updated;
  }

  if (input.action === "return_feedback") {
    if (!task.feedbackId) throw new Error("Feedback task required");
    const note = String(data.note ?? "").trim();
    if (!note) throw new Error("Return reason is required");
    await prisma.$transaction([
      prisma.sessionFeedback.update({ where: { id: task.feedbackId }, data: { reviewStatus: "RETURNED", reviewNote: note, reviewedAt: now, reviewedByUserId: input.actor.id, reviewedByName: input.actor.name } }),
      prisma.parentCommunicationTask.updateMany({ where: { feedbackId: task.feedbackId, manualSentAt: null }, data: { status: "RETURNED", note } }),
    ]);
    await auditTask(input.actor, "RETURN_FEEDBACK", task.id, { note });
    return prisma.parentCommunicationTask.findUnique({ where: { id: task.id } });
  }

  if (input.action === "publish_feedback") {
    if (!task.feedbackId) throw new Error("Feedback task required");
    const feedback = await prisma.sessionFeedback.findUnique({ where: { id: task.feedbackId } });
    if (!feedback) throw new Error("Feedback not found");
    const parentContent = String(data.parentContent ?? feedback.parentContent ?? feedback.content).trim();
    if (!parentContent) throw new Error("Parent-facing feedback is required");
    const missingSections = getMissingParentFeedbackSections(parentContent);
    if (missingSections.length) throw new Error(`家长展示版还缺少：${missingSections.join("、")}`);
    if (!String(feedback.homework ?? "").trim()) throw new Error("家长展示版还缺少：课后作业 / Homework");
    if (feedback.previousHomeworkDone === null) throw new Error("家长展示版还缺少：上次作业完成情况 / Previous homework");
    await prisma.$transaction([
      prisma.sessionFeedback.update({
        where: { id: feedback.id },
        data: {
          parentContent, reviewStatus: "PUBLISHED", reviewNote: null,
          reviewedAt: now, reviewedByUserId: input.actor.id, reviewedByName: input.actor.name,
          publishedAt: feedback.publishedAt ?? now, publishedByUserId: input.actor.id, publishedByName: input.actor.name,
        },
      }),
      prisma.parentCommunicationTask.updateMany({
        where: { feedbackId: feedback.id, manualSentAt: null },
        data: { status: "READY_TO_SEND", publishedAt: now, publishedByUserId: input.actor.id, publishedByName: input.actor.name },
      }),
    ]);
    if (feedback.reviewStatus !== "PUBLISHED") {
      await queueFirstPublishedFeedback({
        sessionId: feedback.sessionId,
        feedbackId: feedback.id,
        submittedAt: feedback.submittedAt,
        notificationTargetId: feedback.publishedAt ? `${feedback.id}:revision:${now.getTime()}` : feedback.id,
      }).catch(() => null);
    }
    await ensureFeedbackCommunicationTasks(feedback.id);
    await auditTask(input.actor, "PUBLISH_FEEDBACK", task.id, { before: feedback.parentContent, after: parentContent });
    return prisma.parentCommunicationTask.findUnique({ where: { id: task.id } });
  }

  if (input.action === "copy") {
    const updated = await prisma.parentCommunicationTask.update({ where: { id: task.id }, data: { copiedAt: now, copiedByUserId: input.actor.id, copiedByName: input.actor.name } });
    await auditTask(input.actor, "COPY_WECHAT_MESSAGE", task.id, { group: task.wechatGroupName });
    return updated;
  }

  if (input.action === "manual_sent") {
    const groupName = String(data.wechatGroupName ?? task.wechatGroupName ?? "").trim();
    const note = String(data.note ?? "").trim().slice(0, 1000);
    const channel = String(data.channel ?? (task.kind === "COURSE_REMINDER_TEACHER" ? "WECHAT_DIRECT" : "WECHAT_GROUP")).trim();
    const updated = await prisma.parentCommunicationTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED", manualSentAt: now, manualSentByUserId: input.actor.id, manualSentByName: input.actor.name,
        manualChannel: channel, wechatGroupName: groupName || null, note: note || task.note, completedAt: now,
      },
    });
    if (task.studentId && task.parentId && groupName) {
      await prisma.parentStudentLink.updateMany({ where: { studentId: task.studentId, parentId: task.parentId }, data: { wechatGroupName: groupName, communicationOwner: input.actor.name } });
    }
    if (task.kind === "COURSE_REMINDER_PARENT" && task.studentId && task.dueAt) {
      await prisma.todoReminderConfirm.createMany({ data: [{ type: "STUDENT_TOMORROW", targetId: task.studentId, date: task.dueAt }], skipDuplicates: true });
    }
    if (task.kind === "COURSE_REMINDER_TEACHER" && task.teacherId && task.dueAt) {
      await prisma.todoReminderConfirm.createMany({ data: [{ type: "TEACHER_TOMORROW", targetId: task.teacherId, date: task.dueAt }], skipDuplicates: true });
    }
    if (task.feedbackId) {
      const remaining = await prisma.parentCommunicationTask.count({ where: { feedbackId: task.feedbackId, manualSentAt: null, status: { not: "WAIVED" } } });
      if (remaining === 0) {
        await prisma.sessionFeedback.update({ where: { id: task.feedbackId }, data: { forwardedAt: now, forwardedBy: input.actor.name, forwardChannel: channel, forwardNote: note || null } });
      }
    }
    await auditTask(input.actor, "MARK_MANUAL_SENT", task.id, { channel, groupName, note });
    return updated;
  }

  if (input.action === "waive") {
    const note = String(data.note ?? "").trim();
    if (!note) throw new Error("Waive reason is required");
    const updated = await prisma.parentCommunicationTask.update({ where: { id: task.id }, data: { status: "WAIVED", note, completedAt: now } });
    await auditTask(input.actor, "WAIVE_COMMUNICATION_TASK", task.id, { note });
    return updated;
  }

  if (input.action === "retry_auto") {
    const where: Prisma.MiniappNotificationOutboxWhereInput = task.feedbackId
      ? { targetType: "SessionFeedback", targetId: task.feedbackId, status: { in: ["FAILED", "SKIPPED"] } }
      : task.sessionId
        ? { targetType: "Session", targetId: { startsWith: `${task.sessionId}:` }, status: { in: ["FAILED", "SKIPPED"] } }
        : { id: "__none__" };
    const result = await prisma.miniappNotificationOutbox.updateMany({ where, data: { status: "PENDING", scheduledAt: now, sentAt: null, error: null } });
    await auditTask(input.actor, "RETRY_AUTOMATIC_NOTIFICATION", task.id, { count: result.count });
    return { ...task, retryCount: result.count };
  }

  throw new Error("Unsupported communication action");
}

export function communicationTaskStatusLabel(status: string) {
  return ({
    PENDING_REVIEW: "待审核 / Review",
    READY_TO_SEND: "待发微信群 / Send",
    CLAIMED: "处理中 / In progress",
    RETURNED: "已退回老师 / Returned",
    ATTENTION: "需更正 / Correction",
    COMPLETED: "已人工发送 / Sent manually",
    WAIVED: "无需发送 / Waived",
  } as Record<string, string>)[status] || status;
}
