import { bad, ok } from "@/app/api/miniapp/_lib";
import { ticketCommandScopeError } from "@/lib/ticket-command-scope";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import {
  createAiTicketExecutionToken,
  canExecuteAiTicketPackage,
  parseAiTicketExecutionRequest,
  verifyAiTicketExecutionToken,
  type AiTicketCommand,
  type AiTicketExecutionRequest,
} from "@/lib/ai-ticket-execution";
import { applyAiTicketCaseCommand, isAiTicketCaseCommand, previewAiTicketCaseCommand } from "@/lib/ai-ticket-case-execution";
import { applyTicketNewSession, previewTicketNewSession, TicketNewSessionError } from "@/lib/miniapp-ticket-new-session";
import { applyMiniappSessionScheduling, applyMiniappSessionReschedulingBatch, previewMiniappSessionScheduling, previewMiniappSessionReschedulingBatch, MiniappSchedulingError } from "@/lib/miniapp-session-scheduling";
import { applyMiniappSessionCancellation, previewMiniappSessionCancellation, MiniappCancellationError } from "@/lib/miniapp-session-cancellation";
import { applyMiniappTeacherReplacement, previewMiniappTeacherReplacement, MiniappTeacherReplacementError } from "@/lib/miniapp-session-teacher-replacement";
import { applyMiniappSessionLocationChange, previewMiniappSessionLocationChange, MiniappLocationChangeError } from "@/lib/miniapp-session-location-change";
import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { sessionBelongsToStudentWhere } from "@/lib/session-students";

function secret() {
  return String(process.env.AI_TICKET_EXECUTION_SECRET || process.env.CRON_SECRET || "").trim();
}

function actor(auth: Awaited<ReturnType<typeof requireMiniappStaff>> & { ok: true }) {
  return { userId: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role };
}

async function requireAccess(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  return { ok: true as const, auth };
}

function canExecutePackage(user: Awaited<ReturnType<typeof requireMiniappStaff>> & { ok: true }, value: AiTicketExecutionRequest) {
  return canExecuteAiTicketPackage(user.user, value);
}

function newSessionInput(ticketId: string, command: AiTicketCommand) {
  return {
    ticketId, studentId: null, subjectId: command.subjectId!, levelId: command.levelId ?? null,
    teacherId: command.teacherId!, campusId: command.campusId!, roomId: command.roomId ?? null,
    startAt: new Date(command.startAt!), durationMin: command.durationMin!, weeks: command.weeks ?? 1,
  };
}

function newSessionBatchInput(ticketId: string, commands: AiTicketCommand[]) {
  const first = newSessionInput(ticketId, commands[0]);
  return {
    ...first,
    occurrences: commands.map((command) => ({
      subjectId: command.subjectId!, levelId: command.levelId ?? null, teacherId: command.teacherId!,
      campusId: command.campusId!, roomId: command.roomId ?? null, startAt: new Date(command.startAt!), durationMin: command.durationMin!,
    })),
  };
}

function commandTypes(value: AiTicketExecutionRequest) {
  return new Set(value.commands.map((command) => command.commandType));
}

function normalizedCommands(commands: AiTicketCommand[]) {
  const locations = new Map(commands.filter((command) => command.commandType === "CHANGE_SESSION_LOCATION").map((command) => [command.sessionId!, command]));
  const merged = commands.filter((command) => command.commandType !== "CHANGE_SESSION_LOCATION").map((command) => {
    if (command.commandType !== "RESCHEDULE_SESSION") return command;
    const location = locations.get(command.sessionId!);
    if (!location) return command;
    locations.delete(command.sessionId!);
    return { ...command, campusId: location.campusId, roomId: location.roomId ?? null, reason: location.reason };
  });
  return [...merged, ...locations.values()];
}

function rescheduleBatchInput(commands: AiTicketCommand[]) {
  return commands.map((command) => ({ action: "reschedule" as const, sessionId: command.sessionId!, startAt: new Date(command.startAt!), durationMin: command.durationMin!, campusId: command.campusId, roomId: command.roomId, reason: command.reason }));
}

async function previewCommand(ticketId: string, command: AiTicketCommand) {
  if (isAiTicketCaseCommand(command)) return previewAiTicketCaseCommand(ticketId, command);
  if (command.commandType === "CREATE_SESSION") return (await previewTicketNewSession(newSessionInput(ticketId, command))).preview;
  if (command.commandType === "RESCHEDULE_SESSION") return (await previewMiniappSessionScheduling({ action: "reschedule", sessionId: command.sessionId!, startAt: new Date(command.startAt!), durationMin: command.durationMin!, campusId: command.campusId, roomId: command.roomId, reason: command.reason })).preview;
  if (command.commandType === "CANCEL_SESSION") return (await previewMiniappSessionCancellation({ sessionId: command.sessionId!, studentId: command.studentId!, charge: command.charge!, note: command.note! })).preview;
  if (command.commandType === "REPLACE_TEACHER") return (await previewMiniappTeacherReplacement({ sessionId: command.sessionId!, newTeacherId: command.newTeacherId!, reason: command.reason! })).preview;
  return (await previewMiniappSessionLocationChange({ sessionId: command.sessionId!, campusId: command.campusId!, roomId: command.roomId ?? null, reason: command.reason! })).preview;
}

async function applyCommand(ticketId: string, command: AiTicketCommand, executionActor: ReturnType<typeof actor>) {
  if (isAiTicketCaseCommand(command)) return applyAiTicketCaseCommand(ticketId, command, executionActor);
  if (command.commandType === "CREATE_SESSION") return applyTicketNewSession(newSessionInput(ticketId, command), executionActor);
  if (command.commandType === "RESCHEDULE_SESSION") return applyMiniappSessionScheduling({ action: "reschedule", sessionId: command.sessionId!, startAt: new Date(command.startAt!), durationMin: command.durationMin!, campusId: command.campusId, roomId: command.roomId, reason: command.reason }, executionActor, [ticketId]);
  if (command.commandType === "CANCEL_SESSION") return applyMiniappSessionCancellation({ sessionId: command.sessionId!, studentId: command.studentId!, charge: command.charge!, note: command.note! }, executionActor, [ticketId]);
  if (command.commandType === "REPLACE_TEACHER") return applyMiniappTeacherReplacement({ sessionId: command.sessionId!, newTeacherId: command.newTeacherId!, reason: command.reason! }, executionActor, [ticketId]);
  return applyMiniappSessionLocationChange({ sessionId: command.sessionId!, campusId: command.campusId!, roomId: command.roomId ?? null, reason: command.reason! }, executionActor, [ticketId]);
}

async function assertAiTicketReady(value: AiTicketExecutionRequest) {
  const ticket = await prisma.ticket.findUnique({ where: { id: value.ticketId }, select: { id: true, studentId: true, type: true, course: true, status: true, isArchived: true, createdAt: true, updatedAt: true } });
  if (!ticket || ticket.isArchived) throw new Error("工单不存在或已归档。");
  if (ticket.updatedAt.toISOString() !== value.formalUpdatedAt) {
    throw new AiTicketStaleError("工单已有新变化，AI将重新读取最新资料。", ticket.updatedAt.toISOString());
  }
  if (["Completed", "Cancelled"].includes(ticket.status)) throw new Error("工单已经结束，不能重复执行。");
  if (value.commands.some((command) => command.studentId && ticket.studentId && command.studentId !== ticket.studentId)) throw new Error("执行包中的学生与工单不一致。");
  const groupedIds = new Set(value.caseGroup?.members.map((item) => item.ticketId) ?? [ticket.id]);
  if (value.caseGroup) {
    const grouped = await prisma.ticket.findMany({
      where: { id: { in: value.caseGroup.members.map((item) => item.ticketId) }, studentId: ticket.studentId, isArchived: false },
      select: { id: true, status: true, updatedAt: true },
    });
    if (grouped.length !== value.caseGroup.members.length) throw new Error("关联工单组已有变化，请重新读取后处理。");
    for (const member of value.caseGroup.members) {
      const current = grouped.find((item) => item.id === member.ticketId);
      if (!current || current.updatedAt.toISOString() !== member.formalUpdatedAt || ["Completed", "Cancelled"].includes(current.status)) throw new Error("关联工单组已有变化，请重新读取后处理。");
    }
  }
  const actions = await prisma.ticketSchedulingAction.findMany({ where: { ticketId: { in: [...groupedIds] } } });
  const scopeError = ticketCommandScopeError(actions, value.commands);
  if (scopeError) throw new Error(scopeError);
  const targetSessionIds = value.commands.map((command) => command.sessionId).filter((id): id is string => Boolean(id));
  const competing = ticket.studentId ? await prisma.ticket.findFirst({
    where: {
      id: { notIn: [...groupedIds] }, studentId: ticket.studentId, isArchived: false,
      createdAt: { gt: ticket.createdAt },
      status: { notIn: ["Completed", "Cancelled"] },
      OR: targetSessionIds.length
        ? [{ schedulingActions: { some: { sourceSessionId: { in: targetSessionIds }, status: { notIn: ["APPLIED", "CANCELLED"] } } } }]
        : [{ type: ticket.type, course: ticket.course }],
    },
    select: { id: true, ticketNo: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  }) : null;
  if (competing) throw new Error(`同一学生还有关联工单 ${competing.ticketNo} 正在处理相同课程或课次，请先合并并确认最终要求。`);
  const normalized = normalizedCommands(value.commands);
  const batchCommandTypes = new Set(normalized.map((command) => command.commandType));
  // Monthly new scheduling is explicitly supported as one serializable transaction.
  // Other mixed/multi-operation packages remain blocked until the corresponding domain
  // functions can participate in the same transaction boundary.
  if (normalized.length > 1 && (batchCommandTypes.size !== 1 || (!batchCommandTypes.has("CREATE_SESSION") && !batchCommandTypes.has("RESCHEDULE_SESSION")))) {
    throw new Error("该整批操作尚未达到全部成功或全部回滚的安全标准，暂不允许写入。");
  }
  return ticket;
}

async function acquireExecutionLocks(value: AiTicketExecutionRequest) {
  const keys = [...new Set(value.commands.map((command) => command.sessionId ? `session:${command.sessionId}` : command.studentId ? `student:${command.studentId}:${value.workflowKey}` : `ticket:${value.ticketId}`))]
    .sort().map((key) => `ai-ticket-active:${key}`);
  const now = Date.now();
  try {
    await prisma.$transaction(async (tx) => {
      for (const key of keys) {
        const existing = await tx.appSetting.findUnique({ where: { key } });
        if (existing) {
          const lockedAt = Number(JSON.parse(existing.value || "{}").lockedAt || 0);
          if (now - lockedAt < 15 * 60_000) throw new Error("同一学生或课次正在由另一位员工处理，请稍后刷新。");
          await tx.appSetting.delete({ where: { key } });
        }
        await tx.appSetting.create({ data: { key, value: JSON.stringify({ ticketId: value.ticketId, lockedAt: now }) } });
      }
    });
    return keys;
  } catch (error) {
    await prisma.appSetting.deleteMany({ where: { key: { in: keys }, value: { contains: value.ticketId } } }).catch(() => undefined);
    throw error;
  }
}

async function releaseExecutionLocks(keys: string[], ticketId: string) {
  if (!keys.length) return;
  await prisma.appSetting.deleteMany({ where: { key: { in: keys }, value: { contains: ticketId } } }).catch(() => undefined);
}

async function studentChangeCalendar(studentId: string | null, value: AiTicketExecutionRequest) {
  if (!studentId) return [];
  const sessionIds = value.commands.map((command) => command.sessionId).filter((id): id is string => Boolean(id));
  const sourceRows = sessionIds.length ? await prisma.session.findMany({
    where: { id: { in: sessionIds } }, select: { id: true, startAt: true, endAt: true },
  }) : [];
  const dates = [
    ...sourceRows.flatMap((row) => [row.startAt, row.endAt]),
    ...value.commands.flatMap((command) => command.startAt ? [new Date(command.startAt)] : []),
  ].filter((date) => !Number.isNaN(date.getTime()));
  if (!dates.length) return [];
  const first = new Date(Math.min(...dates.map((date) => date.getTime())));
  const last = new Date(Math.max(...dates.map((date) => date.getTime())));
  const singaporeMonth = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore", year: "numeric", month: "numeric",
  }).formatToParts(date).map((part) => [part.type, Number(part.value)]));
  const firstMonth = singaporeMonth(first);
  const lastMonth = singaporeMonth(last);
  const singaporeMonthStart = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 1) - 8 * 60 * 60 * 1000);
  const from = singaporeMonthStart(firstMonth.year, firstMonth.month - 1);
  const to = singaporeMonthStart(lastMonth.year, lastMonth.month);
  const rows = await prisma.session.findMany({
    where: { AND: [sessionBelongsToStudentWhere(studentId), { startAt: { gte: from, lt: to } }] },
    select: {
      id: true, startAt: true, endAt: true,
      teacher: { select: { name: true } },
      class: { select: { course: { select: { name: true } }, teacher: { select: { name: true } } } },
    },
    orderBy: { startAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString(),
    courseName: row.class.course.name, teacherName: row.teacher?.name ?? row.class.teacher.name,
  }));
}

class AiTicketStaleError extends Error {
  constructor(message: string, public currentUpdatedAt: string) { super(message); }
}

function knownError(error: unknown) {
  if (error instanceof AiTicketStaleError) {
    return { message: error.message, status: 409, code: "AI_TICKET_STALE", currentUpdatedAt: error.currentUpdatedAt };
  }
  if (error instanceof TicketNewSessionError || error instanceof MiniappSchedulingError || error instanceof MiniappCancellationError || error instanceof MiniappTeacherReplacementError || error instanceof MiniappLocationChangeError) {
    return { message: error.message, status: error.status, code: error.code, currentUpdatedAt: undefined };
  }
  return { message: error instanceof Error ? error.message : "执行失败，请重新预检。", status: 409, code: "AI_TICKET_EXECUTION_BLOCKED", currentUpdatedAt: undefined };
}

export async function POST(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const access = await requireAccess(req);
  if (!access.ok) return access.response;
  const { ticketId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const mode = String(body?.mode ?? "preview").trim();
  let value: AiTicketExecutionRequest;
  try { value = parseAiTicketExecutionRequest(body?.package, ticketId); }
  catch (error) { return bad(error instanceof Error ? error.message : "执行包无效。", 400); }
  if (!canExecutePackage(access.auth, value)) return bad("当前账号没有这类工单的最终执行权限。", 403);
  try {
    const ticket = await assertAiTicketReady(value);
    const commands = normalizedCommands(value.commands);
    if (mode === "preview") {
      const previews = commands.length > 1
        ? commands[0].commandType === "CREATE_SESSION"
          ? [(await previewTicketNewSession(newSessionBatchInput(ticketId, commands))).preview]
          : [(await previewMiniappSessionReschedulingBatch(rescheduleBatchInput(commands))).preview]
        : [await previewCommand(ticketId, commands[0])];
      const calendarSessions = await studentChangeCalendar(ticket.studentId, value);
      return ok({ preview: { workflowKey: value.workflowKey, commandCount: commands.length, items: previews, calendarSessions }, previewToken: createAiTicketExecutionToken(value, access.auth.user.id, secret()) });
    }
    if (mode !== "apply") return bad("执行模式无效。", 400);
    if (!verifyAiTicketExecutionToken(String(body?.previewToken ?? ""), value, access.auth.user.id, secret())) return bad("预检已失效或内容已变化，请重新确认。", 409, { code: "PREVIEW_REQUIRED" });
    const executionTicketIds = value.caseGroup?.members.map((item) => item.ticketId) ?? [ticketId];
    const locks = await acquireExecutionLocks(value);
    let result;
    try {
      result = commands.length > 1
        ? commands[0].commandType === "CREATE_SESSION"
          ? await applyTicketNewSession(newSessionBatchInput(ticketId, commands), actor(access.auth), executionTicketIds)
          : await applyMiniappSessionReschedulingBatch(rescheduleBatchInput(commands), actor(access.auth), executionTicketIds)
        : isAiTicketCaseCommand(commands[0]) || commands[0].commandType === "CREATE_SESSION"
          ? commands[0].commandType === "CREATE_SESSION"
            ? await applyTicketNewSession(newSessionInput(ticketId, commands[0]), actor(access.auth), executionTicketIds)
            : await applyCommand(ticketId, commands[0], actor(access.auth))
          : commands[0].commandType === "RESCHEDULE_SESSION"
            ? await applyMiniappSessionScheduling({ action: "reschedule", sessionId: commands[0].sessionId!, startAt: new Date(commands[0].startAt!), durationMin: commands[0].durationMin!, campusId: commands[0].campusId, roomId: commands[0].roomId, reason: commands[0].reason }, actor(access.auth), executionTicketIds)
            : commands[0].commandType === "CANCEL_SESSION"
              ? await applyMiniappSessionCancellation({ sessionId: commands[0].sessionId!, studentId: commands[0].studentId!, charge: commands[0].charge!, note: commands[0].note! }, actor(access.auth), executionTicketIds)
              : commands[0].commandType === "REPLACE_TEACHER"
                ? await applyMiniappTeacherReplacement({ sessionId: commands[0].sessionId!, newTeacherId: commands[0].newTeacherId!, reason: commands[0].reason! }, actor(access.auth), executionTicketIds)
                : await applyMiniappSessionLocationChange({ sessionId: commands[0].sessionId!, campusId: commands[0].campusId!, roomId: commands[0].roomId ?? null, reason: commands[0].reason! }, actor(access.auth), executionTicketIds);
    } finally {
      await releaseExecutionLocks(locks, value.ticketId);
    }
    if (isAiTicketCaseCommand(commands[0]) && executionTicketIds.length > 1) {
      const head = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true, nextAction: true, finalSchedule: true, parentCompletionResult: true, completedAt: true, completedByUserId: true },
      });
      if (head) await prisma.$transaction(async (tx) => {
        const linkedIds = executionTicketIds.filter((id) => id !== ticketId);
        await tx.ticket.updateMany({
          where: { id: { in: linkedIds }, studentId: ticket.studentId, status: { notIn: ["Completed", "Cancelled"] } },
          data: {
            status: head.status, nextAction: `已与主工单统一处理：${head.nextAction || "处理完成"}`,
            finalSchedule: head.finalSchedule, parentCompletionResult: head.parentCompletionResult,
            completedAt: head.completedAt, completedByUserId: head.completedByUserId,
          },
        });
        await tx.auditLog.createMany({ data: linkedIds.map((id) => ({
          actorEmail: access.auth.user.email, actorName: access.auth.user.name, actorRole: access.auth.user.role,
          module: "TICKETS", action: "AI_GROUPED_TICKET_COMPLETED", entityType: "Ticket", entityId: id,
          meta: { headTicketId: ticketId, groupId: value.caseGroup?.groupId },
        })) });
      });
    }
    const completedTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticketNo: true, type: true, status: true, studentId: true, studentName: true, parentVisible: true, updatedAt: true },
    });
    if (completedTicket?.status === "Completed" && completedTicket.parentVisible && completedTicket.studentId) {
      try { await queueMiniappNotificationsForStudent({
        studentId: completedTicket.studentId,
        templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
        eventType: "REQUEST_STATUS_CHANGED",
        targetType: "Ticket",
        targetId: `${completedTicket.id}:${completedTicket.updatedAt.toISOString()}`,
        permission: "canCreateRequests",
        payload: {
          ticketNo: completedTicket.ticketNo, type: completedTicket.type, status: completedTicket.status,
          ticketId: completedTicket.id, studentName: completedTicket.studentName, updatedAt: completedTicket.updatedAt.toISOString(),
        },
      }); } catch (error) {
        await prisma.ticket.update({ where: { id: completedTicket.id }, data: { status: "Exception", nextAction: "正式操作已完成，但家长通知排队失败；请在通知中心重试后再关闭工单。", completedAt: null, completedByUserId: null, risksNotes: `家长通知排队失败：${error instanceof Error ? error.message : "未知错误"}` } });
        throw new Error("正式操作已完成，但家长通知未成功排队；工单已转为异常待处理。请勿重复执行正式操作。", { cause: error });
      }
    }
    return ok({ message: "已按 AI 方案完成正式操作，工单处理结果已保存。", result });
  } catch (error) {
    const known = knownError(error);
    return bad(known.message, known.status, { code: known.code, currentUpdatedAt: known.currentUpdatedAt });
  }
}
