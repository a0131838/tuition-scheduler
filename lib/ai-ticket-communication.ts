import { Prisma } from "@prisma/client";
import { formatBusinessDateTime } from "@/lib/date-only";

type DbClient = Prisma.TransactionClient;

export type TeacherConfirmationMode = "NOTICE" | "CONSENT";

export function urgentTeacherConsentRequired(startAt: Date, now = new Date()) {
  return startAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
}

export function teacherConsentRequired(
  input: { startAt: Date; isHome: boolean; isFirstTeacher: boolean },
  now = new Date()
) {
  return input.isHome || input.isFirstTeacher || urgentTeacherConsentRequired(input.startAt, now);
}

export async function isFirstTeacherForStudents(
  tx: DbClient,
  input: { teacherId: string; studentIds: string[]; before: Date }
) {
  const studentIds = Array.from(new Set(input.studentIds.filter(Boolean)));
  if (!studentIds.length) return true;
  const previous = await tx.session.findFirst({
    where: {
      endAt: { lt: input.before },
      OR: [{ teacherId: input.teacherId }, { teacherId: null, class: { teacherId: input.teacherId } }],
      AND: [{
        OR: [
          { studentId: { in: studentIds } },
          { class: { oneOnOneStudentId: { in: studentIds } } },
          { class: { enrollments: { some: { studentId: { in: studentIds } } } } },
          { attendances: { some: { studentId: { in: studentIds } } } },
        ],
      }],
    },
    select: { id: true },
  });
  return !previous;
}

export async function createTicketTeacherConfirmation(
  tx: DbClient,
  input: {
    ticketId: string;
    teacherId: string;
    managerUserId: string;
    sessionId?: string | null;
    title: string;
    detail: string;
    mode?: TeacherConfirmationMode;
  }
) {
  const category = input.mode === "NOTICE" ? "ARRANGEMENT_NOTICE" : "ACTION_REQUIRED";
  const existing = await tx.managerTeacherFeedback.findFirst({
    where: {
      ticketId: input.ticketId,
      teacherId: input.teacherId,
      sessionId: input.sessionId || null,
      category,
      archivedAt: null,
    },
    select: { id: true },
  });
  if (existing) return existing;
  return tx.managerTeacherFeedback.create({
    data: {
      ticketId: input.ticketId,
      teacherId: input.teacherId,
      managerUserId: input.managerUserId,
      sessionId: input.sessionId || null,
      category,
      body: `${input.title}\n${input.detail}`,
      requiresAck: true,
    },
    select: { id: true },
  });
}

export async function finishTicketAfterFormalExecution(
  tx: DbClient,
  input: {
    ticketId: string;
    resultText: string;
    actorUserId: string;
    risksNotes?: string | null;
    logLabel: string;
    requiresTeacherConsent: boolean;
  }
) {
  if (input.requiresTeacherConsent) return markTicketWaitingForTeacher(tx, input);
  const now = new Date();
  const log = `[${formatBusinessDateTime(now)}] ${input.logLabel}\n${input.resultText}`;
  return tx.ticket.update({
    where: { id: input.ticketId },
    data: {
      status: "Completed",
      systemUpdated: "Y",
      finalSchedule: input.resultText,
      parentCompletionResult: input.resultText,
      nextAction: "正式课程和家长结果已更新；老师可在下课后确认已知悉。",
      nextActionDue: null,
      risksNotes: input.risksNotes ? `${input.risksNotes}\n\n${log}` : log,
      lastUpdateAt: now,
      completedAt: now,
      completedByUserId: input.actorUserId,
    },
  });
}

export async function markTicketWaitingForTeacher(
  tx: DbClient,
  input: {
    ticketId: string;
    resultText: string;
    actorUserId: string;
    risksNotes?: string | null;
    logLabel: string;
  }
) {
  const now = new Date();
  const log = `[${formatBusinessDateTime(now)}] ${input.logLabel}\n${input.resultText}`;
  return tx.ticket.update({
    where: { id: input.ticketId },
    data: {
      status: "Waiting Teacher",
      systemUpdated: "Y",
      finalSchedule: input.resultText,
      parentCompletionResult: input.resultText,
      nextAction: "课程方案已通过正式规则检查并暂存；等待老师同意后向家长确认最终安排。",
      nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      risksNotes: input.risksNotes ? `${input.risksNotes}\n\n${log}` : log,
      lastUpdateAt: now,
      completedAt: null,
      completedByUserId: null,
    },
  });
}
