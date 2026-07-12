import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { MINIAPP_TEMPLATE_KEYS, queueMiniappNotificationsForStudent } from "@/lib/miniapp-notifications";
import {
  applyMiniappSessionCancellation,
  createMiniappCancellationPreviewToken,
  MiniappCancellationError,
  previewMiniappSessionCancellation,
  verifyMiniappCancellationPreviewToken,
} from "@/lib/miniapp-session-cancellation";
import { canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";

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

function sameInput(payload: NonNullable<ReturnType<typeof verifyMiniappCancellationPreviewToken>>, input: {
  userId: string;
  sessionId: string;
  studentId: string;
  charge: boolean;
  note: string;
}) {
  return (
    payload.userId === input.userId &&
    payload.sessionId === input.sessionId &&
    payload.studentId === input.studentId &&
    payload.charge === input.charge &&
    payload.note === input.note
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingWrites(auth.user)) return bad("Administrator permission required", 403);
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const mode = clean((body as any).mode, 20) || "preview";
  const input = {
    sessionId,
    studentId: clean((body as any).studentId, 80),
    charge: Boolean((body as any).charge),
    note: clean((body as any).note, 500),
  };
  if (!input.studentId) return bad("Student is required", 409);
  if (!input.note) return bad("Cancellation note is required", 409);
  const signingSecret = secret();
  if (!signingSecret) return bad("Cancellation confirmation is not configured", 503);

  try {
    if (mode === "preview") {
      const checked = await previewMiniappSessionCancellation(input);
      const previewToken = createMiniappCancellationPreviewToken(
        {
          ...input,
          userId: auth.user.id,
          ticketIds: checked.preview.tickets.map((ticket) => ticket.id),
        },
        signingSecret
      );
      return ok({ preview: checked.preview, previewToken });
    }
    if (mode !== "apply") return bad("Invalid cancellation mode", 409);
    const payload = verifyMiniappCancellationPreviewToken(clean((body as any).previewToken, 5000), signingSecret);
    if (!payload || !sameInput(payload, { ...input, userId: auth.user.id })) {
      return bad("请假/取消预检已失效，请重新检查。", 409, { code: "PREVIEW_REQUIRED" });
    }
    const completeTicketIds = ticketIds((body as any).completeTicketIds);
    const eligibleIds = new Set(payload.ticketIds ?? []);
    if (completeTicketIds.some((ticketId) => !eligibleIds.has(ticketId))) {
      return bad("请假工单不在本次预检范围内。", 409, { code: "TICKET_PREVIEW_REQUIRED" });
    }
    const applied = await applyMiniappSessionCancellation(
      input,
      { userId: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role },
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
            targetId: `${ticket.id}:${ticket.updatedAt.toISOString()}`,
            permission: "canCreateRequests",
            payload: {
              ticketNo: ticket.ticketNo, type: "临时取消&请假课程", status: "Completed",
              ticketId: ticket.id, studentName: ticket.studentName, updatedAt: ticket.updatedAt.toISOString(),
            },
          }).catch(() => null)
        )
    );
    return ok({
      message: input.charge ? "请假已处理并扣除课时。" : "请假已处理，不扣课时。",
      result: applied.preview,
      completedTicketCount: applied.completedTickets.length,
    });
  } catch (error) {
    if (error instanceof MiniappCancellationError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}
