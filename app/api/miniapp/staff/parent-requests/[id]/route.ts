import { bad, ok } from "@/app/api/miniapp/_lib";
import { getStaffRequestTicket, requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { miniappRequestDto } from "@/lib/miniapp-parent-requests";
import { canTransitionTicketStatus, TICKET_OWNER_OPTIONS, TICKET_STATUS_OPTIONS } from "@/lib/tickets";
import { schedulingActionDto } from "@/lib/ticket-scheduling-actions";

function normalizeOption(v: unknown, options: Array<{ value: string }>) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  return options.some((item) => item.value === s) ? s : null;
}

function cleanString(v: unknown, maxLen = 1000) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, maxLen) : null;
}

const MANAGER_CLOSE_TYPES = new Set(["投诉", "财务问题", "学校事务"]);

function completionCapability(user: { role: string; name: string | null }, ticket: { type: string; owner: string | null }) {
  if (user.role === "ADMIN") return { canComplete: true, completionBlockReason: "" };
  if (user.role !== "CS") {
    return { canComplete: false, completionBlockReason: "只有教务负责人或管理账号可以完成工单。" };
  }
  if (MANAGER_CLOSE_TYPES.has(ticket.type)) {
    return { canComplete: false, completionBlockReason: "投诉、财务问题和学校事务需由 Jasmine 或 Eva 最终完成。" };
  }
  const staffName = String(user.name ?? "").trim().toLowerCase();
  const ownerName = String(ticket.owner ?? "").trim().toLowerCase();
  if (!staffName || staffName !== ownerName) {
    return { canComplete: false, completionBlockReason: "这张工单不是由你负责，请由负责人或管理账号完成。" };
  }
  return { canComplete: true, completionBlockReason: "" };
}

function schedulingCompletionBlock(actions: Array<{ status: string }>) {
  const unresolved = actions.filter((action) => !["APPLIED", "CANCELLED"].includes(action.status)).length;
  return unresolved ? `还有 ${unresolved} 个排课动作未执行，完成真实课表操作后才能关闭工单。` : "";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const includeAllSources = new URL(req.url).searchParams.get("scope") === "all";
  const ticket = await getStaffRequestTicket(id, { includeAllSources });
  if (!ticket) return bad(includeAllSources ? "Ticket not found" : "Parent request not found", 404);
  const capability = completionCapability(auth.user, ticket);
  const schedulingBlock = schedulingCompletionBlock(ticket.schedulingActions);
  return ok({
    request: miniappRequestDto(ticket, { includeInternal: true, attachmentScopeAll: includeAllSources }),
    schedulingActions: ticket.schedulingActions.map(schedulingActionDto),
    capabilities: schedulingBlock ? { canComplete: false, completionBlockReason: schedulingBlock } : capability,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const includeAllSources = new URL(req.url).searchParams.get("scope") === "all";
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const ticket = await getStaffRequestTicket(id, { includeAllSources });
  if (!ticket) return bad(includeAllSources ? "Ticket not found" : "Parent request not found", 404);

  const nextStatus = normalizeOption((body as any).status, TICKET_STATUS_OPTIONS);
  const nextOwner = normalizeOption((body as any).owner, TICKET_OWNER_OPTIONS);
  if ((body as any).status && !nextStatus) return bad("Invalid status", 409);
  if ((body as any).owner && !nextOwner) return bad("Invalid owner", 409);
  if (nextOwner && auth.user.role !== "ADMIN") return bad("Only management can reassign a request", 403);
  if (nextStatus && !canTransitionTicketStatus(ticket.status, nextStatus)) {
    return bad("Invalid status transition", 409, { from: ticket.status, to: nextStatus });
  }

  const nextAction = cleanString((body as any).nextAction, 1000);
  const risksNotes = cleanString((body as any).risksNotes, 2000);
  const completionResultInput = (body as any).completionResult ?? (body as any).finalSchedule;
  const completionResult = cleanString(completionResultInput, 1000);
  const existingCompletionResult = ticket.parentCompletionResult ?? ticket.finalSchedule;
  if (nextStatus === "Completed" && !(completionResult ?? existingCompletionResult)) {
    return bad("Completion result is required before marking the request completed", 409);
  }
  if (nextStatus === "Completed") {
    const schedulingBlock = schedulingCompletionBlock(ticket.schedulingActions);
    if (schedulingBlock) return bad(schedulingBlock, 409);
    const capability = completionCapability(auth.user, ticket);
    if (!capability.canComplete) return bad(capability.completionBlockReason, 403);
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextOwner ? { owner: nextOwner } : {}),
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...(risksNotes !== undefined ? { risksNotes } : {}),
      ...(completionResult !== undefined
        ? ticket.source === "家长小程序"
          ? { finalSchedule: completionResult, parentCompletionResult: completionResult }
          : { finalSchedule: completionResult }
        : {}),
      lastUpdateAt: new Date(),
      ...(nextStatus === "Completed" ? { completedAt: new Date(), completedByUserId: auth.user.id } : {}),
    },
  });

  if (nextStatus && updated.studentId && updated.source === "家长小程序") {
    await queueMiniappNotificationsForStudent({
      studentId: updated.studentId,
      templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
      eventType: "REQUEST_STATUS_CHANGED",
      targetType: "Ticket",
      targetId: `${updated.id}:${updated.updatedAt.toISOString()}`,
      permission: "canCreateRequests",
      payload: {
        ticketNo: updated.ticketNo,
        type: updated.type,
        status: updated.status,
        owner: updated.owner,
        ticketId: updated.id,
        studentName: updated.studentName,
        updatedAt: updated.updatedAt.toISOString(),
      },
    }).catch(() => null);
  }

  return ok({
    request: miniappRequestDto(updated, { includeInternal: true, attachmentScopeAll: includeAllSources }),
    capabilities: completionCapability(auth.user, updated),
    notifyParent: Boolean(nextStatus && updated.studentId && updated.source === "家长小程序"),
  });
}
