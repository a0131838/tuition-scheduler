import { Prisma } from "@prisma/client";
import { formatBusinessDateTime } from "@/lib/date-only";

type DbClient = Prisma.TransactionClient;

export async function createTicketTeacherConfirmation(
  tx: DbClient,
  input: {
    ticketId: string;
    teacherId: string;
    managerUserId: string;
    sessionId?: string | null;
    title: string;
    detail: string;
  }
) {
  const existing = await tx.managerTeacherFeedback.findFirst({
    where: {
      ticketId: input.ticketId,
      teacherId: input.teacherId,
      sessionId: input.sessionId || null,
      category: "ACTION_REQUIRED",
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
      category: "ACTION_REQUIRED",
      body: `${input.title}\n${input.detail}`,
      requiresAck: true,
    },
    select: { id: true },
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
      nextAction: "正式课程已更新，系统正在等待老师确认；确认后自动完成工单。",
      nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      risksNotes: input.risksNotes ? `${input.risksNotes}\n\n${log}` : log,
      lastUpdateAt: now,
      completedAt: null,
      completedByUserId: null,
    },
  });
}
