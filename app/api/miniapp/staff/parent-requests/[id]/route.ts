import { bad, ok } from "@/app/api/miniapp/_lib";
import { getParentRequestTicket, requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { prisma } from "@/lib/prisma";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { miniappRequestDto } from "@/lib/miniapp-parent-requests";
import { canTransitionTicketStatus, TICKET_OWNER_OPTIONS, TICKET_STATUS_OPTIONS } from "@/lib/tickets";

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
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const ticket = await getParentRequestTicket(id);
  if (!ticket) return bad("Parent request not found", 404);
  return ok({ request: miniappRequestDto(ticket) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const ticket = await getParentRequestTicket(id);
  if (!ticket) return bad("Parent request not found", 404);

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

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextOwner ? { owner: nextOwner } : {}),
      ...(nextAction !== undefined ? { nextAction } : {}),
      ...(risksNotes !== undefined ? { risksNotes } : {}),
      ...(finalSchedule !== undefined ? { finalSchedule } : {}),
      lastUpdateAt: new Date(),
      ...(nextStatus === "Completed" ? { completedAt: new Date(), completedByUserId: auth.user.id } : {}),
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

  return ok({
    request: miniappRequestDto(updated),
    notifyParent: Boolean(nextStatus),
  });
}
