import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import { canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";
import {
  applyMiniappTeacherReplacement,
  createMiniappTeacherReplacementToken,
  listMiniappReplacementTeachers,
  MiniappTeacherReplacementError,
  previewMiniappTeacherReplacement,
  verifyMiniappTeacherReplacementToken,
} from "@/lib/miniapp-session-teacher-replacement";

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

async function requireAdminStaff(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  if (!canManageMiniappSchedulingWrites(auth.user)) {
    return { ok: false as const, response: bad("Administrator permission required", 403) };
  }
  return { ok: true as const, auth };
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const access = await requireAdminStaff(req);
  if (!access.ok) return access.response;
  const { sessionId } = await ctx.params;
  try {
    return ok({ teachers: await listMiniappReplacementTeachers(sessionId) });
  } catch (error) {
    if (error instanceof MiniappTeacherReplacementError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const access = await requireAdminStaff(req);
  if (!access.ok) return access.response;
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const mode = clean((body as any).mode, 20) || "preview";
  const input = {
    sessionId,
    newTeacherId: clean((body as any).newTeacherId, 80),
    reason: clean((body as any).reason, 500),
  };
  if (!input.newTeacherId) return bad("New teacher is required", 409);
  if (!input.reason) return bad("Replacement reason is required", 409);
  const signingSecret = secret();
  if (!signingSecret) return bad("Teacher replacement confirmation is not configured", 503);

  try {
    if (mode === "preview") {
      const checked = await previewMiniappTeacherReplacement(input);
      const previewToken = createMiniappTeacherReplacementToken(
        {
          ...input,
          userId: access.auth.user.id,
          ticketIds: checked.preview.tickets.map((ticket) => ticket.id),
        },
        signingSecret
      );
      return ok({ preview: checked.preview, previewToken });
    }
    if (mode !== "apply") return bad("Invalid replacement mode", 409);
    const payload = verifyMiniappTeacherReplacementToken(clean((body as any).previewToken, 5000), signingSecret);
    if (
      !payload ||
      payload.userId !== access.auth.user.id ||
      payload.sessionId !== input.sessionId ||
      payload.newTeacherId !== input.newTeacherId ||
      payload.reason !== input.reason
    ) {
      return bad("换老师预检已失效，请重新检查。", 409, { code: "PREVIEW_REQUIRED" });
    }
    const completeTicketIds = ticketIds((body as any).completeTicketIds);
    const eligibleIds = new Set(payload.ticketIds ?? []);
    if (completeTicketIds.some((ticketId) => !eligibleIds.has(ticketId))) {
      return bad("换老师工单不在本次预检范围内。", 409, { code: "TICKET_PREVIEW_REQUIRED" });
    }
    const applied = await applyMiniappTeacherReplacement(
      input,
      {
        userId: access.auth.user.id,
        email: access.auth.user.email,
        name: access.auth.user.name,
        role: access.auth.user.role,
      },
      completeTicketIds
    );
    await Promise.all(
      applied.completedTickets
        .filter((ticket) => ticket.parentVisible && ticket.studentId)
        .map((ticket) =>
          queueMiniappNotificationsForStudent({
            studentId: ticket.studentId as string,
            templateKey: MINIAPP_TEMPLATE_KEYS.requestStatusChanged,
            eventType: "REQUEST_STATUS_CHANGED",
            targetType: "Ticket",
            targetId: ticket.id,
            permission: "canCreateRequests",
            payload: { ticketNo: ticket.ticketNo, type: "改上课老师", status: "Completed" },
          }).catch(() => null)
        )
    );
    return ok({
      message: "本节课老师已更新。",
      result: applied.preview,
      completedTicketCount: applied.completedTickets.length,
    });
  } catch (error) {
    if (error instanceof MiniappTeacherReplacementError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}
