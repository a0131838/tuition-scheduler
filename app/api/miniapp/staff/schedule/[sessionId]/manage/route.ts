import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import {
  applyMiniappSessionScheduling,
  createMiniappSchedulingPreviewToken,
  MiniappSchedulingError,
  previewMiniappSessionScheduling,
  type MiniappSchedulingAction,
  verifyMiniappSchedulingPreviewToken,
} from "@/lib/miniapp-session-scheduling";
import {
  canAccessMiniappStaffSession,
  canManageMiniappSchedulingWrites,
  getMiniappStaffSessionContext,
} from "@/lib/miniapp-staff-session";

function schedulingSecret() {
  return String(process.env.CRON_SECRET || process.env.WECHAT_MINIAPP_SECRET || "").trim();
}

function parseAction(value: unknown): MiniappSchedulingAction | null {
  const raw = String(value ?? "").trim();
  return raw === "create" || raw === "reschedule" ? raw : null;
}

function parseStartAt(value: unknown) {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameTokenPayload(
  payload: NonNullable<ReturnType<typeof verifyMiniappSchedulingPreviewToken>>,
  input: { userId: string; action: MiniappSchedulingAction; sessionId: string; startAt: Date; durationMin: number }
) {
  return (
    payload.userId === input.userId &&
    payload.action === input.action &&
    payload.sessionId === input.sessionId &&
    payload.startAt === input.startAt.toISOString() &&
    payload.durationMin === input.durationMin
  );
}

async function requireSchedulingAccess(req: Request, sessionId: string) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  const session = await getMiniappStaffSessionContext(sessionId);
  if (!session || !canAccessMiniappStaffSession(auth.user, session)) {
    return { ok: false as const, response: bad("Session not found or no permission", 404) };
  }
  if (!canManageMiniappSchedulingWrites(auth.user)) {
    return { ok: false as const, response: bad("Administrator scheduling permission required", 403) };
  }
  return { ok: true as const, auth, session };
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const access = await requireSchedulingAccess(req, sessionId);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const mode = String((body as any).mode ?? "preview").trim();
  const action = parseAction((body as any).action);
  const startAt = parseStartAt((body as any).startAt);
  const durationMin = Number((body as any).durationMin);
  if (!action || !startAt || !Number.isFinite(durationMin)) return bad("Invalid scheduling input", 409);

  const input = { action, sessionId, startAt, durationMin };
  const secret = schedulingSecret();
  if (!secret) return bad("Scheduling confirmation is not configured", 503);

  try {
    if (mode === "preview") {
      const checked = await previewMiniappSessionScheduling(input);
      const previewToken = createMiniappSchedulingPreviewToken(
        {
          userId: access.auth.user.id,
          action,
          sessionId,
          startAt: startAt.toISOString(),
          durationMin,
        },
        secret
      );
      return ok({ preview: checked.preview, previewToken });
    }

    if (mode !== "apply") return bad("Invalid scheduling mode", 409);
    const tokenPayload = verifyMiniappSchedulingPreviewToken(String((body as any).previewToken ?? ""), secret);
    if (!tokenPayload || !sameTokenPayload(tokenPayload, { ...input, userId: access.auth.user.id })) {
      return bad("排课预览已失效，请重新检查冲突。", 409, { code: "PREVIEW_REQUIRED" });
    }

    const applied = await applyMiniappSessionScheduling(input, {
      email: access.auth.user.email,
      name: access.auth.user.name,
      role: access.auth.user.role,
    });

    return ok({
      message: action === "create" ? "课程已排入系统。" : "课程时间已更新。",
      sessionId: applied.writtenSessionId,
      result: applied.preview,
    });
  } catch (error) {
    if (error instanceof MiniappSchedulingError) {
      return bad(error.message, error.status, { code: error.code });
    }
    throw error;
  }
}
