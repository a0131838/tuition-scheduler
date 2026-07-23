import { requireRenewalCenterUser } from "@/lib/renewal-access";
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
  await requireRenewalCenterUser();
  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") ?? "OPEN");
  const cohort = cohortFrom(url.searchParams.get("cohort"));
  const rows = await listRenewalTasks({
    status,
    cohort,
    limit: Number(url.searchParams.get("limit") ?? 300),
  });
  return Response.json({ ok: true, tasks: rows.map(renewalTaskDto), cohortCounts: await getRenewalCohortCounts(status) });
}

export async function POST(req: Request) {
  const user = await requireRenewalCenterUser();
  const url = new URL(req.url);
  const cohort = cohortFrom(url.searchParams.get("cohort"));
  const result = await syncRenewalTasks(user);
  const rows = await listRenewalTasks({ status: "OPEN", cohort, limit: 300 });
  return Response.json({
    ok: true,
    sync: { created: result.created, updated: result.updated, resolved: result.resolved },
    tasks: rows.map(renewalTaskDto),
    cohortCounts: await getRenewalCohortCounts("OPEN"),
  });
}
