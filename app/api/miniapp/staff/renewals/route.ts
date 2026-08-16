import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappRenewalDesk } from "@/lib/miniapp-staff-action-center";
import {
  getRenewalCohortCounts,
  listRenewalTasks,
  RenewalCohort,
  renewalTaskDto,
  syncRenewalTasks,
} from "@/lib/renewal-management";

function cohortFrom(value: string | null): RenewalCohort {
  return value === "XDF" ? "XDF" : "BOSS_OTHER";
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappRenewalDesk(auth.user)) return bad("Renewal center permission required", 403);
  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") ?? "OPEN");
  const cohort = cohortFrom(url.searchParams.get("cohort"));
  const rows = await listRenewalTasks({
    status,
    cohort,
    limit: Number(url.searchParams.get("limit") ?? 300),
  });
  return ok({ tasks: rows.map(renewalTaskDto), cohortCounts: await getRenewalCohortCounts(status) });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappRenewalDesk(auth.user)) return bad("Renewal center permission required", 403);
  const result = await syncRenewalTasks(auth.user);
  return ok({ sync: { created: result.created, updated: result.updated, resolved: result.resolved } });
}
