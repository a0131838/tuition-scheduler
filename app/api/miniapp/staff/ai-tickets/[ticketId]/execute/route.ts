import { bad, ok } from "@/app/api/miniapp/_lib";
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
  const ticket = await prisma.ticket.findUnique({ where: { id: value.ticketId }, select: { id: true, studentId: true, status: true, isArchived: true, updatedAt: true } });
  if (!ticket || ticket.isArchived) throw new Error("工单不存在或已归档。");
  if (ticket.updatedAt.toISOString() !== value.formalUpdatedAt) {
    throw new AiTicketStaleError("工单已有新变化，AI将重新读取最新资料。", ticket.updatedAt.toISOString());
  }
  if (["Completed", "Cancelled"].includes(ticket.status)) throw new Error("工单已经结束，不能重复执行。");
  if (value.commands.some((command) => command.studentId && ticket.studentId && command.studentId !== ticket.studentId)) throw new Error("执行包中的学生与工单不一致。");
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
    const result = commands.length > 1
      ? commands[0].commandType === "CREATE_SESSION"
        ? await applyTicketNewSession(newSessionBatchInput(ticketId, commands), actor(access.auth))
        : await applyMiniappSessionReschedulingBatch(rescheduleBatchInput(commands), actor(access.auth), [ticketId])
      : await applyCommand(ticketId, commands[0], actor(access.auth));
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
