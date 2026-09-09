import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { linkTicketResults, ticketResultCandidates } from "@/lib/ticket-existing-results";

export async function GET(req: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Scheduling permission required", 403);
  const { ticketId } = await params;
  const sp = new URL(req.url).searchParams;
  try { return ok(await ticketResultCandidates(ticketId, sp.get("actionId"), sp.get("date"), Number(sp.get("page") ?? 0))); }
  catch (error) { return bad(error instanceof Error ? error.message : "课程读取失败", 400); }
}

export async function POST(req: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Scheduling permission required", 403);
  const { ticketId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.actionId !== "string") return bad("Missing action", 400);
  try {
    return ok(await linkTicketResults({ ticketId, actionId: body.actionId, user: auth.user,
      resultSessionIds: Array.isArray(body.resultSessionIds) ? body.resultSessionIds.filter((id: unknown): id is string => typeof id === "string").slice(0, 101) : [],
      note: String(body.note ?? "").slice(0, 1000), verified: body.verified === true, confirmedChange: body.confirmedChange === true,
    }));
  } catch (error) { return bad(error instanceof Error ? error.message : "核验失败", 409); }
}
