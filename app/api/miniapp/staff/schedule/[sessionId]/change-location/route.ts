import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";
import {
  applyMiniappSessionLocationChange,
  createMiniappLocationChangeToken,
  listMiniappSessionLocations,
  MiniappLocationChangeError,
  previewMiniappSessionLocationChange,
  verifyMiniappLocationChangeToken,
} from "@/lib/miniapp-session-location-change";

function secret() {
  return String(process.env.CRON_SECRET || process.env.WECHAT_MINIAPP_SECRET || "").trim();
}

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

async function requireAdmin(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  if (!canManageMiniappSchedulingWrites(auth.user)) {
    return { ok: false as const, response: bad("Administrator scheduling permission required", 403) };
  }
  return { ok: true as const, auth };
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const access = await requireAdmin(req);
  if (!access.ok) return access.response;
  const { sessionId } = await ctx.params;
  try {
    return ok(await listMiniappSessionLocations(sessionId));
  } catch (error) {
    if (error instanceof MiniappLocationChangeError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const access = await requireAdmin(req);
  if (!access.ok) return access.response;
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const mode = clean((body as any).mode, 20) || "preview";
  const input = {
    sessionId,
    campusId: clean((body as any).campusId, 80),
    roomId: clean((body as any).roomId, 80) || null,
    reason: clean((body as any).reason, 500),
  };
  if (!input.campusId || !input.reason) return bad("Campus and reason are required", 409);
  const signingSecret = secret();
  if (!signingSecret) return bad("Location confirmation is not configured", 503);
  try {
    if (mode === "preview") {
      const checked = await previewMiniappSessionLocationChange(input);
      const previewToken = createMiniappLocationChangeToken({ ...input, userId: access.auth.user.id }, signingSecret);
      return ok({ preview: checked.preview, previewToken });
    }
    if (mode !== "apply") return bad("Invalid location mode", 409);
    const payload = verifyMiniappLocationChangeToken(clean((body as any).previewToken, 5000), signingSecret);
    if (
      !payload || payload.userId !== access.auth.user.id || payload.sessionId !== input.sessionId ||
      payload.campusId !== input.campusId || payload.roomId !== input.roomId || payload.reason !== input.reason
    ) {
      return bad("地点变更预检已失效，请重新检查。", 409, { code: "PREVIEW_REQUIRED" });
    }
    const applied = await applyMiniappSessionLocationChange(input, {
      userId: access.auth.user.id,
      email: access.auth.user.email,
      name: access.auth.user.name,
      role: access.auth.user.role,
    });
    return ok({ message: "本节课地点已更新。", result: applied.preview });
  } catch (error) {
    if (error instanceof MiniappLocationChangeError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}
