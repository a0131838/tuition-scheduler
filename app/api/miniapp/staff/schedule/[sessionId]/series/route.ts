import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";
import {
  applyMiniappSessionSeries,
  createMiniappSeriesSchedulingToken,
  MiniappSchedulingError,
  previewMiniappSessionSeries,
  verifyMiniappSeriesSchedulingToken,
} from "@/lib/miniapp-session-scheduling";

function secret() {
  return String(process.env.CRON_SECRET || process.env.WECHAT_MINIAPP_SECRET || "").trim();
}

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

function ticketIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => clean(item, 80)).filter(Boolean))).slice(0, 20);
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingWrites(auth.user)) return bad("Administrator scheduling permission required", 403);
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const mode = clean((body as any).mode, 20) || "preview";
  const startAt = new Date(clean((body as any).startAt, 80));
  const input = { sessionId, startAt, durationMin: Number((body as any).durationMin), weeks: Number((body as any).weeks) };
  if (Number.isNaN(startAt.getTime()) || !Number.isFinite(input.durationMin) || !Number.isFinite(input.weeks)) {
    return bad("Invalid series scheduling input", 409);
  }
  const signingSecret = secret();
  if (!signingSecret) return bad("Scheduling confirmation is not configured", 503);
  try {
    if (mode === "preview") {
      const checked = await previewMiniappSessionSeries(input);
      const previewToken = createMiniappSeriesSchedulingToken({
        userId: auth.user.id, sessionId, startAt: startAt.toISOString(), durationMin: input.durationMin,
        weeks: input.weeks, coordinationTicketIds: checked.preview.coordinationTickets.map((ticket) => ticket.id),
      }, signingSecret);
      return ok({ preview: checked.preview, previewToken });
    }
    if (mode !== "apply") return bad("Invalid scheduling mode", 409);
    const payload = verifyMiniappSeriesSchedulingToken(clean((body as any).previewToken, 5000), signingSecret);
    if (!payload || payload.userId !== auth.user.id || payload.sessionId !== sessionId || payload.startAt !== startAt.toISOString() || payload.durationMin !== input.durationMin || payload.weeks !== input.weeks) {
      return bad("连续排课预检已失效，请重新检查。", 409, { code: "PREVIEW_REQUIRED" });
    }
    const completeCoordinationTicketIds = ticketIds((body as any).completeCoordinationTicketIds);
    const eligibleIds = new Set(payload.coordinationTicketIds ?? []);
    if (completeCoordinationTicketIds.some((ticketId) => !eligibleIds.has(ticketId))) {
      return bad("排课工单不在本次整批预检范围内。", 409, { code: "COORDINATION_PREVIEW_REQUIRED" });
    }
    const applied = await applyMiniappSessionSeries(input, {
      userId: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role,
    }, completeCoordinationTicketIds);
    await Promise.all(applied.completedCoordinationTickets.filter((ticket) => ticket.parentVisible && ticket.studentId).map((ticket) =>
      queueMiniappNotificationsForStudent({
        studentId: ticket.studentId as string, templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
        eventType: "REQUEST_STATUS_CHANGED", targetType: "Ticket", targetId: ticket.id,
        permission: "canCreateRequests", payload: { ticketNo: ticket.ticketNo, type: "排课协调", status: "Completed" },
      }).catch(() => null)
    ));
    return ok({ message: `已连续排入 ${applied.sessionIds.length} 节课程。`, sessionIds: applied.sessionIds, completedCoordinationCount: applied.completedCoordinationTickets.length });
  } catch (error) {
    if (error instanceof MiniappSchedulingError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}
