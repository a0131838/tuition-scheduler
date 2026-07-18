import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { listParentCommunicationTasks, syncParentCommunicationCenter } from "@/lib/parent-communication-center";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Communication center permission required", 403);
  const url = new URL(req.url);
  const result = await listParentCommunicationTasks({ status: String(url.searchParams.get("status") ?? "OPEN"), kind: String(url.searchParams.get("kind") ?? "ALL"), limit: 300 });
  return ok(result);
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Communication center permission required", 403);
  const result = await syncParentCommunicationCenter({ id: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role });
  return ok(result);
}
