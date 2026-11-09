import { randomUUID } from "node:crypto";
import type { ParentCommunicationTask, Prisma } from "@prisma/client";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessTimeOnly } from "@/lib/date-only";
import { getVisibleSessionStudents } from "@/lib/session-students";
import { prisma } from "@/lib/prisma";
import { requireCommunicationWriteAccess } from "@/lib/communication-write-access";

export const RESCHEDULE_NOTICE_PREFIX = "RESCHEDULE_NOTICE:";
export const RESCHEDULE_WAITING_PARENT = "WAITING_PARENT";
const MINUTE = 60_000;
const pair = ["Eva", "Emily"] as const;

export class StaleRescheduleError extends Error {}

type Actor = { id: string; name: string | null; email?: string };
type Times = { startAt: Date; endAt: Date };
type NoticeData = { beforeStart: string; beforeEnd: string; afterStart: string; afterEnd: string; studentIds: string[]; beforeLine: string; afterLine: string };
type NoticeRow = Pick<ParentCommunicationTask, "taskKey" | "templateVariables" | "createdAt" | "manualSentAt" | "ownerUserId" | "status" | "claimedAt">;

export function isRescheduleNotice(task: { taskKey: string }) {
  return task.taskKey.startsWith(RESCHEDULE_NOTICE_PREFIX);
}

export function noticeData(task: Pick<NoticeRow, "taskKey" | "templateVariables">): NoticeData | null {
  if (!isRescheduleNotice(task) || !task.templateVariables || typeof task.templateVariables !== "object" || Array.isArray(task.templateVariables)) return null;
  const data = task.templateVariables as unknown as NoticeData;
  return [data.beforeStart, data.beforeEnd, data.afterStart, data.afterEnd].every(t => typeof t === "string" && Number.isFinite(Date.parse(t))) ? data : null;
}

export function noticeTiming(row: NoticeRow, now = new Date()) {
  const data = noticeData(row);
  if (!data) return null;
  const t = now.getTime();
  const age = t - row.createdAt.getTime();
  const sent = row.manualSentAt?.getTime();
  const earlier = Math.min(Date.parse(data.beforeStart), Date.parse(data.afterStart));
  const closed = ["COMPLETED", "SUPERSEDED", "WAIVED"].includes(row.status);
  return {
    overdue: !closed && !sent && t < Date.parse(data.afterStart) && age >= 5 * MINUTE,
    handoffDue: !closed && !sent && !row.claimedAt && age >= 10 * MINUTE,
    callDue: !closed && Date.parse(data.afterStart) > t && (earlier - t <= 120 * MINUTE ||
      Boolean(sent && t - sent >= 15 * MINUTE && formatBusinessDateOnly(now) === formatBusinessDateOnly(new Date(earlier)))),
    past: !closed && t >= Date.parse(data.afterStart),
    sendDueAt: new Date(row.createdAt.getTime() + 5 * MINUTE).toISOString(),
  };
}

export async function getRescheduleDutyPair(db: Prisma.TransactionClient = prisma) {
  const rows = await db.user.findMany({
    where: { isObserver: false, role: { in: ["ADMIN", "CS"] }, OR: pair.map(name => ({ name: { equals: name, mode: "insensitive" as const } })) },
    select: { id: true, name: true },
  });
  return pair.flatMap(name => {
    const matches = rows.filter(row => row.name.toLowerCase() === name.toLowerCase());
    return matches.length === 1 ? matches : [];
  });
}

export async function lockCurrentRescheduleNotice(tx: Prisma.TransactionClient, id: string, sessionId: string | null) {
  const schedule = sessionId ? (await tx.$queryRaw<Times[]>`SELECT "startAt","endAt" FROM "Session" WHERE id=${sessionId} FOR UPDATE`)[0] : null;
  await tx.$queryRaw`SELECT id FROM "ParentCommunicationTask" WHERE id=${id} FOR UPDATE`;
  const task = await tx.parentCommunicationTask.findUniqueOrThrow({ where: { id } });
  const data = noticeData(task);
  if (!schedule || !data || task.supersededAt ||
      schedule.startAt.toISOString() !== data.afterStart || schedule.endAt.toISOString() !== data.afterEnd) {
    throw new Error("此通知已不是当前改课版本，请刷新后处理最新任务。");
  }
  return task;
}

export async function attachRescheduleEvidence(task: Pick<ParentCommunicationTask, "id" | "sessionId">, actorId: string, path: string) {
  return prisma.$transaction(async tx => {
    const actor = await requireCommunicationWriteAccess(tx, actorId);
    const current = await lockCurrentRescheduleNotice(tx, task.id, task.sessionId);
    if (current.ownerUserId !== actor.id || current.manualSentAt ||
        !["READY_TO_SEND", "CLAIMED"].includes(current.status) ||
        !(await getRescheduleDutyPair(tx)).some(person => person.id === actor.id)) {
      throw new Error("请由当前负责人上传这一次改课的发送截图。");
    }
    const updated = await tx.parentCommunicationTask.update({ where: { id: task.id }, data: { evidenceUrl: path } });
    await tx.auditLog.create({ data: { actorEmail: actor.email, actorName: actor.name, actorRole: actor.role,
      module: "COMMUNICATION", action: "UPLOAD_WECHAT_EVIDENCE", entityType: "ParentCommunicationTask", entityId: task.id, meta: { evidenceUrl: path } } });
    return updated;
  });
}

function scheduleRange(start: Date, end: Date) {
  return `${formatBusinessDateTime(start)}–${formatBusinessDateOnly(start) === formatBusinessDateOnly(end) ? formatBusinessTimeOnly(end) : formatBusinessDateTime(end)}`;
}

/** Run with the existing validated schedule write. Failure rolls back both records. */
export async function updateSessionTimeWithNotice(tx: Prisma.TransactionClient, input: {
  sessionId: string; before: Times; after: Times & { classId?: string }; actor: Actor;
}) {
  const locked = await tx.$queryRaw<Times[]>`SELECT "startAt","endAt" FROM "Session" WHERE id=${input.sessionId} FOR UPDATE`;
  const before = locked[0];
  if (!before || before.startAt.getTime() !== input.before.startAt.getTime() || before.endAt.getTime() !== input.before.endAt.getTime()) {
    throw new StaleRescheduleError("课程时间已被其他操作更新，请刷新后再改课。");
  }
  const session = await tx.session.update({ where: { id: input.sessionId }, data: input.after, include: {
    student: { select: { id: true, name: true } }, teacher: { select: { name: true } },
    attendances: { select: { studentId: true, status: true } },
    class: { include: {
      oneOnOneStudent: { select: { id: true, name: true } }, enrollments: { include: { student: { select: { id: true, name: true } } } },
      campus: { select: { name: true, isOnline: true } }, room: { select: { name: true } },
      course: { select: { name: true } }, subject: { select: { name: true } }, level: { select: { name: true } }, teacher: { select: { name: true } },
    } },
  } });
  const ids: string[] = [];
  if (+before.startAt === +session.startAt && +before.endAt === +session.endAt) return { session, noticeIds: ids };

  const now = new Date();
  // Every true change invalidates the earlier version, including one already acknowledged.
  await tx.parentCommunicationTask.updateMany({
    where: { sessionId: session.id, taskKey: { startsWith: RESCHEDULE_NOTICE_PREFIX }, supersededAt: null },
    data: { status: "SUPERSEDED", supersededAt: now },
  });
  const students = getVisibleSessionStudents(session);
  if (!students.length) return { session, noticeIds: ids };
  const [links, team] = await Promise.all([
    tx.parentStudentLink.findMany({
      where: { studentId: { in: students.map(s => s.id) }, parent: { status: "ACTIVE" }, canViewSchedule: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { studentId: true, parentId: true, wechatGroupName: true },
    }),
    getRescheduleDutyPair(tx),
  ]);
  const owner = team.find(u => u.id === input.actor.id) ?? team.find(u => u.name.toLowerCase() === "eva") ?? team[0];
  const families = new Map<string, { parentId: string | null; group: string | null; students: typeof students }>();
  for (const student of students) {
    const link = links.find(l => l.studentId === student.id);
    const group = link?.wechatGroupName?.trim() || null;
    const key = link ? JSON.stringify([link.parentId, group]) : student.id;
    const family = families.get(key) ?? { parentId: link?.parentId ?? null, group, students: [] };
    family.students.push(student);
    families.set(key, family);
  }
  const cls = session.class;
  const location = cls.campus?.isOnline ? "线上课程 / Online" : [cls.campus?.name, cls.room?.name].filter(Boolean).join(" · ") || "待教务核对 / To confirm";
  const course = [cls.course.name, cls.subject?.name, cls.level?.name].filter(Boolean).join(" / ");
  const tail = `${course} · ${session.teacher?.name || cls.teacher.name} · ${location}`;
  const line = (times: Times) => `${formatBusinessTimeOnly(times.startAt)}–${formatBusinessTimeOnly(times.endAt)} ${tail}`;
  for (const family of families.values()) {
    const names = family.students.map(s => s.name || "学员").join("、");
    const data: NoticeData = {
      beforeStart: before.startAt.toISOString(), beforeEnd: before.endAt.toISOString(),
      afterStart: session.startAt.toISOString(), afterEnd: session.endAt.toISOString(),
      studentIds: family.students.map(s => s.id), beforeLine: line(before), afterLine: line(session),
    };
    const messageText = [
      "【课程时间更正｜旧安排作废】 Class time updated",
      `学生 / Student: ${names}`,
      `原时间 / Previous (Singapore): ${scheduleRange(before.startAt, before.endAt)}`,
      `新时间 / New (Singapore): ${scheduleRange(session.startAt, session.endAt)}`,
      `地点 / Location: ${location}`,
      `请以此通知及小程序最新课表为准。请实际接送的家长回复「已确认 ${formatBusinessDateTime(session.startAt)}」。`,
      "Please follow this update and the latest timetable in the mini program. The parent arranging pickup or drop-off, please reply to confirm the new date and time.",
    ].join("\n");
    const row = await tx.parentCommunicationTask.create({ data: {
      taskKey: `${RESCHEDULE_NOTICE_PREFIX}${session.id}:${randomUUID()}`,
      kind: "COURSE_CHANGE", status: "READY_TO_SEND", priority: "HIGH", sessionId: session.id,
      studentId: family.students[0].id, parentId: family.parentId, wechatGroupName: family.group,
      ownerUserId: owner?.id ?? null, ownerName: owner?.name ?? null,
      title: `${names} · 改课通知`, messageText, templateVariables: data,
      createdAt: now, dueAt: new Date(now.getTime() + 5 * MINUTE),
    }, select: { id: true } });
    ids.push(row.id);
  }
  return { session, noticeIds: ids };
}

/** A small read endpoint can refresh while the employee miniapp is in the foreground. */
export async function getRescheduleInbox(actorId: string, now = new Date()) {
  const team = await getRescheduleDutyPair();
  if (!team.some(u => u.id === actorId)) return { mine: 0, overdue: 0, takeover: 0, waiting: 0, urgent: 0, firstTaskId: null };
  const rows = await prisma.parentCommunicationTask.findMany({
    where: { taskKey: { startsWith: RESCHEDULE_NOTICE_PREFIX }, supersededAt: null,
      status: { in: ["READY_TO_SEND", "CLAIMED", RESCHEDULE_WAITING_PARENT] },
      OR: [{ ownerUserId: { in: team.map(u => u.id) } }, { ownerUserId: null }] },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { taskKey: true, templateVariables: true, createdAt: true, manualSentAt: true, ownerUserId: true, status: true, claimedAt: true, id: true },
  });
  let mine = 0, overdue = 0, takeover = 0, waiting = 0, urgent = 0;
  let firstTaskId: string | null = null, priority = 0;
  for (const row of rows) {
    const timing = noticeTiming(row, now);
    if (!timing) continue;
    let score = 0;
    if (row.ownerUserId === actorId) {
      if (row.manualSentAt) { waiting++; score = 1; }
      else if (!timing.past) { mine++; score = 2; }
      if (timing.overdue) { overdue++; score = 3; }
      if (timing.past || (row.manualSentAt && timing.callDue)) { urgent++; score = 4; }
    } else if (!row.manualSentAt && (!row.ownerUserId || timing.handoffDue)) {
      takeover++; score = 5;
    }
    if (score > priority) { firstTaskId = row.id; priority = score; }
  }
  return { mine, overdue, takeover, waiting, urgent, firstTaskId };
}
