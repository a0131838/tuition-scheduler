import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildStudentParentIntakeAbsoluteUrl, buildStudentParentIntakePath } from "@/lib/student-parent-intake";
import { canTransitionTicketStatus } from "@/lib/tickets";
import type { AiTicketCommand } from "@/lib/ai-ticket-execution";

type ExecutionActor = { userId: string; email: string; name: string; role: string };

const CASE_COMMANDS = new Set([
  "CREATE_ASSESSMENT_TASK",
  "PACKAGE_ACTIVATION_REVIEW",
  "ACADEMIC_CASE_HANDOFF",
  "SERVICE_CASE_HANDOFF",
  "OPERATION_CORRECTION_REVIEW",
]);

function targetStatus(command: AiTicketCommand) {
  if (command.commandType === "CREATE_ASSESSMENT_TASK" || command.commandType === "ACADEMIC_CASE_HANDOFF") return "Waiting Teacher";
  if (command.commandType === "PACKAGE_ACTIVATION_REVIEW" || command.commandType === "SERVICE_CASE_HANDOFF") return "Waiting Parent";
  return "Exception";
}

function commandLabel(command: AiTicketCommand) {
  const labels: Record<string, string> = {
    CREATE_ASSESSMENT_TASK: "建立评估安排与结果回收流程",
    PACKAGE_ACTIVATION_REVIEW: "建立家长资料与财务核对流程",
    ACADEMIC_CASE_HANDOFF: "建立学术核对与老师反馈流程",
    SERVICE_CASE_HANDOFF: "建立客服处理与家长回访流程",
    OPERATION_CORRECTION_REVIEW: "建立受控纠正与管理审批流程",
  };
  return labels[command.commandType] || command.commandType;
}

export function isAiTicketCaseCommand(command: AiTicketCommand) {
  return CASE_COMMANDS.has(command.commandType);
}

export async function previewAiTicketCaseCommand(ticketId: string, command: AiTicketCommand) {
  if (!isAiTicketCaseCommand(command)) throw new Error("不支持的工单流程。");
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, ticketNo: true, status: true, studentId: true } });
  if (!ticket) throw new Error("工单不存在。");
  const status = targetStatus(command);
  if (!canTransitionTicketStatus(ticket.status, status)) throw new Error(`工单当前状态不能进入“${status}”。`);
  return {
    ticketNo: ticket.ticketNo,
    action: commandLabel(command),
    fromStatus: ticket.status,
    toStatus: status,
    parentWillSeeUpdate: Boolean(ticket.studentId),
    createsParentIntake: command.commandType === "PACKAGE_ACTIVATION_REVIEW",
    correctionScope: command.commandType === "OPERATION_CORRECTION_REVIEW" ? command.correctionTarget : null,
  };
}

export async function applyAiTicketCaseCommand(ticketId: string, command: AiTicketCommand, actor: ExecutionActor) {
  if (!isAiTicketCaseCommand(command)) throw new Error("不支持的工单流程。");
  const idempotencySettingKey = `ai-ticket-command:${command.idempotencyKey}`;
  try {
    return await prisma.$transaction(async (tx) => {
    const previous = await tx.appSetting.findUnique({ where: { key: idempotencySettingKey } });
    if (previous) return { ...JSON.parse(previous.value), alreadyExecuted: true };

    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.isArchived) throw new Error("工单不存在或已归档。");
    const status = targetStatus(command);
    if (!canTransitionTicketStatus(ticket.status, status)) throw new Error(`工单当前状态不能进入“${status}”。`);

    let intake: { id: string; path: string; url: string; expiresAt: string } | null = null;
    if (command.commandType === "PACKAGE_ACTIVATION_REVIEW") {
      const token = crypto.randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const created = await tx.studentParentIntake.create({
        data: {
          token,
          label: command.label,
          expiresAt,
          studentId: ticket.studentId,
          createdByUserId: actor.userId,
        },
      });
      intake = {
        id: created.id,
        path: buildStudentParentIntakePath(token),
        url: buildStudentParentIntakeAbsoluteUrl(token),
        expiresAt: expiresAt.toISOString(),
      };
    }

    const now = new Date();
    const correctionEvidence = command.commandType === "OPERATION_CORRECTION_REVIEW"
      ? `AI纠正审批：${command.correctionTarget}\n${command.beforeAfter}\n依据：${command.evidence}`
      : null;
    const previousNotes = String(ticket.risksNotes || "").trim();
    const notes = correctionEvidence ? (previousNotes ? `${previousNotes}\n\n${correctionEvidence}` : correctionEvidence) : ticket.risksNotes;
    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        nextAction: command.nextAction || commandLabel(command),
        parentPublicSummary: command.parentPublicSummary,
        parentVisible: Boolean(ticket.studentId),
        risksNotes: notes,
        lastUpdateAt: now,
      },
      select: { id: true, ticketNo: true, status: true, studentId: true, studentName: true, parentVisible: true, updatedAt: true },
    });
    const result = { ticket: updated, intake, action: commandLabel(command), alreadyExecuted: false };
    await tx.auditLog.create({
      data: {
        actorEmail: actor.email.trim().toLowerCase(), actorName: actor.name || null, actorRole: actor.role,
        module: "TICKETS", action: `AI_${command.commandType}`, entityType: "Ticket", entityId: ticketId,
        meta: { idempotencyKey: command.idempotencyKey, fromStatus: ticket.status, toStatus: status, intakeId: intake?.id || null, correctionTarget: command.correctionTarget || null },
      },
    });
    await tx.appSetting.create({ data: { key: idempotencySettingKey, value: JSON.stringify(result) } });
    return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const previous = await prisma.appSetting.findUnique({ where: { key: idempotencySettingKey } });
      if (previous) return { ...JSON.parse(previous.value), alreadyExecuted: true };
    }
    throw error;
  }
}
