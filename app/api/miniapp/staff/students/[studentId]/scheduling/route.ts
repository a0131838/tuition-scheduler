import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canManageMiniappSchedulingCoordination, canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";
import {
  applyTicketNewSession,
  createTicketNewSessionToken,
  getStudentNewSessionOptions,
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

function parseInput(body: any, studentId: string) {
  return {
    ticketId: null,
    studentId,
    subjectId: clean(body?.subjectId, 80),
    levelId: clean(body?.levelId, 80) || null,
    teacherId: clean(body?.teacherId, 80),
    campusId: clean(body?.campusId, 80),
    roomId: clean(body?.roomId, 80) || null,
    startAt: new Date(clean(body?.startAt, 80)),
    durationMin: Number(body?.durationMin),
    weeks: Number(body?.weeks || 1),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ studentId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Scheduling coordination permission required", 403);
  const { studentId } = await ctx.params;
  const options = await getStudentNewSessionOptions(studentId);
  if (!options) return bad("Student not found", 404);
  return ok({
    options,
    capabilities: {
      canSchedule: canManageMiniappSchedulingWrites(auth.user),
      canCreateCoordination: true,
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ studentId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingWrites(auth.user)) return bad("Administrator scheduling permission required", 403);
  const { studentId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const mode = clean((body as any).mode, 20) || "preview";
  const input = parseInput(body, studentId);
  if (!input.subjectId || !input.teacherId || !input.campusId || Number.isNaN(input.startAt.getTime()) || !Number.isFinite(input.durationMin)) {
    return bad("Invalid new scheduling input", 409);
  }
  const signingSecret = secret();
  if (!signingSecret) return bad("Scheduling confirmation is not configured", 503);

  try {
    if (mode === "preview") {
      const checked = await previewTicketNewSession(input);
      const previewToken = createTicketNewSessionToken({
        userId: auth.user.id,
        ticketId: null,
        studentId,
        subjectId: input.subjectId,
        levelId: input.levelId,
        teacherId: input.teacherId,
        campusId: input.campusId,
        roomId: input.roomId,
        startAt: input.startAt.toISOString(),
        durationMin: input.durationMin,
        weeks: input.weeks ?? 1,
      }, signingSecret);
      return ok({ preview: checked.preview, previewToken });
    }
    if (mode !== "apply") return bad("Invalid scheduling mode", 409);
    const payload = verifyTicketNewSessionToken(clean((body as any).previewToken, 5000), signingSecret);
    if (
      !payload ||
      payload.userId !== auth.user.id ||
      payload.ticketId !== null ||
      payload.studentId !== studentId ||
      payload.subjectId !== input.subjectId ||
      payload.levelId !== input.levelId ||
      payload.teacherId !== input.teacherId ||
      payload.campusId !== input.campusId ||
      payload.roomId !== input.roomId ||
      payload.startAt !== input.startAt.toISOString() ||
      payload.durationMin !== input.durationMin ||
      payload.weeks !== (input.weeks ?? 1)
    ) {
      return bad("新排课预检已失效，请重新检查。", 409, { code: "PREVIEW_REQUIRED" });
    }
    const applied = await applyTicketNewSession(input, {
      userId: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role,
    });
    return ok({
      message: "课程已排入系统。本次直接排课未创建工单。",
      sessionId: applied.sessionId,
      sessionIds: applied.sessionIds,
      result: applied.preview,
    });
  } catch (error) {
    if (error instanceof TicketNewSessionError) return bad(error.message, error.status, { code: error.code });
    throw error;
  }
}
