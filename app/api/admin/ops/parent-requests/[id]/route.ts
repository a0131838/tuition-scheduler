import { prisma } from "@/lib/prisma";
import { guardOpsReadAccess } from "@/lib/ops-auth";
import { miniappRequestDto } from "@/lib/miniapp-parent-requests";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { canTransitionTicketStatus, TICKET_OWNER_OPTIONS, TICKET_STATUS_OPTIONS } from "@/lib/tickets";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.source !== "家长小程序") return bad("Parent request not found", 404);

  return Response.json({ ok: true, request: miniappRequestDto(ticket, { includeInternal: true }) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket || ticket.source !== "家长小程序") return bad("Parent request not found", 404);

  const nextStatus = normalizeOption((body as any).status, TICKET_STATUS_OPTIONS);
  const nextOwner = normalizeOption((body as any).owner, TICKET_OWNER_OPTIONS);
  if ((body as any).status && !nextStatus) return bad("Invalid status", 409);
  if ((body as any).owner && !nextOwner) return bad("Invalid owner", 409);
  if (nextStatus && !canTransitionTicketStatus(ticket.status, nextStatus)) {
    return bad("Invalid status transition", 409, { from: ticket.status, to: nextStatus });
  }

  const nextAction = cleanString((body as any).nextAction, 1000);
  const risksNotes = cleanString((body as any).risksNotes, 2000);
  const finalSchedule = cleanString((body as any).finalSchedule, 1000);
  const nextActionDueRaw = typeof (body as any).nextActionDue === "string" ? (body as any).nextActionDue.trim() : "";
  const nextActionDue = nextActionDueRaw ? new Date(nextActionDueRaw) : undefined;
  if (nextActionDue && Number.isNaN(nextActionDue.getTime())) return bad("Invalid nextActionDue", 409);

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextOwner ? { owner: nextOwner } : {}),
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...(risksNotes !== undefined ? { risksNotes } : {}),
      ...(finalSchedule !== undefined ? { finalSchedule } : {}),
      ...(nextActionDue !== undefined ? { nextActionDue } : {}),
      lastUpdateAt: new Date(),
      ...(nextStatus === "Completed" ? { completedAt: new Date() } : {}),
    },
  });

  if (nextStatus && updated.studentId) {
    await queueMiniappNotificationsForStudent({
      studentId: updated.studentId,
      templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
      eventType: "REQUEST_STATUS_CHANGED",
      targetType: "Ticket",
      targetId: updated.id,
      permission: "canCreateRequests",
      payload: {
        ticketNo: updated.ticketNo,
        type: updated.type,
        status: updated.status,
        owner: updated.owner,
      },
    }).catch(() => null);
  }

  return Response.json({
    ok: true,
    request: miniappRequestDto(updated, { includeInternal: true }),
    notifyParent: Boolean(nextStatus),
    notifyReason: nextStatus ? "请求状态已更新，第一版规则为全部状态变化提醒家长。" : null,
  });
}
