import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { ensureMiniappFirstSchedulingTicket, listMiniappFirstSchedulingCandidates } from "@/lib/miniapp-first-scheduling";
import { canManageMiniappSchedulingCoordination, canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Scheduling coordination permission required", 403);
  const url = new URL(req.url);
  const query = clean(url.searchParams.get("q"), 80);
  const scope = clean(url.searchParams.get("scope"), 30);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const result = await listMiniappFirstSchedulingCandidates({ query, limit, scope });
  return ok({ ...result, capabilities: { canSchedule: canManageMiniappSchedulingWrites(auth.user) } });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Scheduling coordination permission required", 403);
  const body = await req.json().catch(() => null);
  const studentId = clean((body as any)?.studentId, 80);
  const intent = clean((body as any)?.intent, 30);
  const courseId = clean((body as any)?.courseId, 80);
  const coordinationSummary = clean((body as any)?.coordinationSummary, 500);
  if (!studentId) return bad("Student is required", 409);
  if (intent !== "coordination" || !courseId || !coordinationSummary) {
    return bad("请选择课程并填写需要协调的事项，确认后再创建工单。", 409, { code: "EXPLICIT_COORDINATION_REQUIRED" });
  }
  try {
    const result = await ensureMiniappFirstSchedulingTicket(studentId, auth.user, { courseId, coordinationSummary });
    return ok({
      message: result.created ? "首次排课工单已创建。" : "已打开现有排课工单。",
      ticketId: result.ticket.id,
      created: result.created,
      canSchedule: canManageMiniappSchedulingWrites(auth.user),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "STUDENT_NOT_FOUND") return bad("Student not found", 404);
    if (code === "COURSE_NOT_AVAILABLE") return bad("该学生没有可用于此课程的有效课包。", 409);
    throw error;
  }
}
