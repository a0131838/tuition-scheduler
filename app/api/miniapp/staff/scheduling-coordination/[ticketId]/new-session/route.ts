import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";
import {
  applyTicketNewSession,
  createTicketNewSessionToken,
  getTicketNewSessionOptions,
  previewTicketNewSession,
  TicketNewSessionError,
  verifyTicketNewSessionToken,
} from "@/lib/miniapp-ticket-new-session";

function secret() {
  return String(process.env.CRON_SECRET || process.env.WECHAT_MINIAPP_SECRET || "").trim();
}

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function parseInput(body: any, ticketId: string) {
  const startAt = new Date(clean(body?.startAt, 80));
  return {
    ticketId,
    subjectId: clean(body?.subjectId, 80),
    levelId: clean(body?.levelId, 80) || null,
    teacherId: clean(body?.teacherId, 80),
    campusId: clean(body?.campusId, 80),
    roomId: clean(body?.roomId, 80) || null,
    startAt,
    durationMin: Number(body?.durationMin),
  };
}

async function requireAdmin(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  if (!canManageMiniappSchedulingWrites(auth.user)) {
    return { ok: false as const, response: bad("Administrator scheduling permission required", 403) };
  }
  return { ok: true as const, auth };
}

export async function GET(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const access = await requireAdmin(req);
  if (!access.ok) return access.response;
  const { ticketId } = await ctx.params;
  const options = await getTicketNewSessionOptions(ticketId);
  if (!options) return bad("New scheduling ticket not found", 404);
  return ok({ options });
}

export async function POST(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const access = await requireAdmin(req);
  if (!access.ok) return access.response;
  const { ticketId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const mode = clean((body as any).mode, 20) || "preview";
  const input = parseInput(body, ticketId);
  if (!input.subjectId || !input.teacherId || !input.campusId || Number.isNaN(input.startAt.getTime()) || !Number.isFinite(input.durationMin)) {
    return bad("Invalid new scheduling input", 409);
  }
  const signingSecret = secret();
  if (!signingSecret) return bad("Scheduling confirmation is not configured", 503);

  try {
    if (mode === "preview") {
      const checked = await previewTicketNewSession(input);
      const previewToken = createTicketNewSessionToken(
        {
          userId: access.auth.user.id,
          ticketId,
          subjectId: input.subjectId,
          levelId: input.levelId,
          teacherId: input.teacherId,
          campusId: input.campusId,
          roomId: input.roomId,
          startAt: input.startAt.toISOString(),
          durationMin: input.durationMin,
        },
        signingSecret
      );
      return ok({ preview: checked.preview, previewToken });
    }
    if (mode !== "apply") return bad("Invalid scheduling mode", 409);
    const payload = verifyTicketNewSessionToken(clean((body as any).previewToken, 5000), signingSecret);
    if (
      !payload ||
      payload.userId !== access.auth.user.id ||
      payload.ticketId !== ticketId ||
      payload.subjectId !== input.subjectId ||
      payload.levelId !== input.levelId ||
      payload.teacherId !== input.teacherId ||
      payload.campusId !== input.campusId ||
      payload.roomId !== input.roomId ||
      payload.startAt !== input.startAt.toISOString() ||
      payload.durationMin !== input.durationMin
    ) {
      return bad("新排课预检已失效，请重新检查。", 409, { code: "PREVIEW_REQUIRED" });
    }
    const applied = await applyTicketNewSession(input, {
      userId: access.auth.user.id,
      email: access.auth.user.email,
      name: access.auth.user.name,
      role: access.auth.user.role,
    });
    if (applied.ticket.parentVisible && applied.ticket.studentId) {
      await queueMiniappNotificationsForStudent({
        studentId: applied.ticket.studentId,
        templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
        eventType: "REQUEST_STATUS_CHANGED",
        targetType: "Ticket",
        targetId: `${applied.ticket.id}:${applied.ticket.updatedAt.toISOString()}`,
        permission: "canCreateRequests",
        payload: {
          ticketNo: applied.ticket.ticketNo, type: applied.ticket.type, status: "Completed",
          ticketId: applied.ticket.id, studentName: applied.ticket.studentName,
          updatedAt: applied.ticket.updatedAt.toISOString(),
        },
      }).catch(() => null);
    }
    return ok({ message: "课程已排入系统，工单已完成。", sessionId: applied.sessionId, result: applied.preview });
  } catch (error) {
    if (error instanceof TicketNewSessionError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}
