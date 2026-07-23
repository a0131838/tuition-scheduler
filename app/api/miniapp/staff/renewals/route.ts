import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappAcademicDesk } from "@/lib/miniapp-staff-action-center";
import {
  listRenewalTasks,
  renewalTaskDto,
  syncRenewalTasks,
} from "@/lib/renewal-management";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Renewal center permission required", 403);
  const url = new URL(req.url);
  const rows = await listRenewalTasks({
    status: String(url.searchParams.get("status") ?? "OPEN"),
    limit: Number(url.searchParams.get("limit") ?? 300),
  });
  return ok({ tasks: rows.map(renewalTaskDto) });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Renewal center permission required", 403);
  const result = await syncRenewalTasks(auth.user);
  return ok({ sync: { created: result.created, updated: result.updated, resolved: result.resolved } });
}
