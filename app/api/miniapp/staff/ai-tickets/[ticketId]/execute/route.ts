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
import { applyMiniappSessionScheduling, previewMiniappSessionScheduling, MiniappSchedulingError } from "@/lib/miniapp-session-scheduling";
import { applyMiniappSessionCancellation, previewMiniappSessionCancellation, MiniappCancellationError } from "@/lib/miniapp-session-cancellation";
import { applyMiniappTeacherReplacement, previewMiniappTeacherReplacement, MiniappTeacherReplacementError } from "@/lib/miniapp-session-teacher-replacement";
import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";

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

async function previewCommand(ticketId: string, command: AiTicketCommand) {
  if (isAiTicketCaseCommand(command)) return previewAiTicketCaseCommand(ticketId, command);
  if (command.commandType === "CREATE_SESSION") return (await previewTicketNewSession(newSessionInput(ticketId, command))).preview;
  if (command.commandType === "RESCHEDULE_SESSION") return (await previewMiniappSessionScheduling({ action: "reschedule", sessionId: command.sessionId!, startAt: new Date(command.startAt!), durationMin: command.durationMin! })).preview;
  if (command.commandType === "CANCEL_SESSION") return (await previewMiniappSessionCancellation({ sessionId: command.sessionId!, studentId: command.studentId!, charge: command.charge!, note: command.note! })).preview;
  return (await previewMiniappTeacherReplacement({ sessionId: command.sessionId!, newTeacherId: command.newTeacherId!, reason: command.reason! })).preview;
}

async function applyCommand(ticketId: string, command: AiTicketCommand, executionActor: ReturnType<typeof actor>) {
  if (isAiTicketCaseCommand(command)) return applyAiTicketCaseCommand(ticketId, command, executionActor);
  if (command.commandType === "CREATE_SESSION") return applyTicketNewSession(newSessionInput(ticketId, command), executionActor);
  if (command.commandType === "RESCHEDULE_SESSION") return applyMiniappSessionScheduling({ action: "reschedule", sessionId: command.sessionId!, startAt: new Date(command.startAt!), durationMin: command.durationMin! }, executionActor, [ticketId]);
  if (command.commandType === "CANCEL_SESSION") return applyMiniappSessionCancellation({ sessionId: command.sessionId!, studentId: command.studentId!, charge: command.charge!, note: command.note! }, executionActor, [ticketId]);
  return applyMiniappTeacherReplacement({ sessionId: command.sessionId!, newTeacherId: command.newTeacherId!, reason: command.reason! }, executionActor, [ticketId]);
}

async function assertAiTicketReady(value: AiTicketExecutionRequest) {
  const ticket = await prisma.ticket.findUnique({ where: { id: value.ticketId }, select: { id: true, studentId: true, status: true, isArchived: true, updatedAt: true } });
  if (!ticket || ticket.isArchived) throw new Error("工单不存在或已归档。");
  if (ticket.updatedAt.toISOString() !== value.formalUpdatedAt) throw new Error("工单已有新变化，请让 AI 重新读取后再确认。");
  if (["Completed", "Cancelled"].includes(ticket.status)) throw new Error("工单已经结束，不能重复执行。");
  if (value.commands.some((command) => command.studentId && ticket.studentId && command.studentId !== ticket.studentId)) throw new Error("执行包中的学生与工单不一致。");
  const commandTypes = new Set(value.commands.map((command) => command.commandType));
  // Monthly new scheduling is explicitly supported as one serializable transaction.
  // Other mixed/multi-operation packages remain blocked until the corresponding domain
  // functions can participate in the same transaction boundary.
  if (value.commands.length > 1 && (commandTypes.size !== 1 || !commandTypes.has("CREATE_SESSION"))) {
    throw new Error("该整批操作尚未达到全部成功或全部回滚的安全标准，暂不允许写入。");
  }
  return ticket;
}

function knownError(error: unknown) {
  if (error instanceof TicketNewSessionError || error instanceof MiniappSchedulingError || error instanceof MiniappCancellationError || error instanceof MiniappTeacherReplacementError) {
    return { message: error.message, status: error.status, code: error.code };
  }
  return { message: error instanceof Error ? error.message : "执行失败，请重新预检。", status: 409, code: "AI_TICKET_EXECUTION_BLOCKED" };
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
    await assertAiTicketReady(value);
    if (mode === "preview") {
      const previews = value.commands.length > 1
        ? [(await previewTicketNewSession(newSessionBatchInput(ticketId, value.commands))).preview]
        : [await previewCommand(ticketId, value.commands[0])];
      return ok({ preview: { workflowKey: value.workflowKey, commandCount: value.commands.length, items: previews }, previewToken: createAiTicketExecutionToken(value, access.auth.user.id, secret()) });
    }
    if (mode !== "apply") return bad("执行模式无效。", 400);
    if (!verifyAiTicketExecutionToken(String(body?.previewToken ?? ""), value, access.auth.user.id, secret())) return bad("预检已失效或内容已变化，请重新确认。", 409, { code: "PREVIEW_REQUIRED" });
    const result = value.commands.length > 1
      ? await applyTicketNewSession(newSessionBatchInput(ticketId, value.commands), actor(access.auth))
      : await applyCommand(ticketId, value.commands[0], actor(access.auth));
    const completedTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, ticketNo: true, type: true, status: true, studentId: true, studentName: true, parentVisible: true, updatedAt: true },
    });
    if (completedTicket?.parentVisible && completedTicket.studentId) {
      await queueMiniappNotificationsForStudent({
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
      }).catch(() => null);
    }
    return ok({ message: "已按 AI 方案完成正式操作，工单处理结果已保存。", result });
  } catch (error) {
    const known = knownError(error);
    return bad(known.message, known.status, { code: known.code });
  }
}
