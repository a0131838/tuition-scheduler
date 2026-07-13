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
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const result = await listMiniappFirstSchedulingCandidates({ query, limit });
  return ok({ ...result, capabilities: { canSchedule: canManageMiniappSchedulingWrites(auth.user) } });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Scheduling coordination permission required", 403);
  const body = await req.json().catch(() => null);
  const studentId = clean((body as any)?.studentId, 80);
  if (!studentId) return bad("Student is required", 409);
  try {
    const result = await ensureMiniappFirstSchedulingTicket(studentId, auth.user);
    return ok({
      message: result.created ? "首次排课工单已创建。" : "已打开现有排课工单。",
      ticketId: result.ticket.id,
      created: result.created,
      canSchedule: canManageMiniappSchedulingWrites(auth.user),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "STUDENT_NOT_FOUND") return bad("Student not found", 404);
    if (code === "ALREADY_SCHEDULED") return bad("该学生已经有未来课程，请从课程详情继续排课或改课。", 409);
    if (code === "NO_ACTIVE_PACKAGE") return bad("该学生没有可用于排课的有效课包。", 409);
    throw error;
  }
}
