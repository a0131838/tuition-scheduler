import { requireRenewalCenterUser } from "@/lib/renewal-access";
import {
  listRenewalTasks,
  renewalTaskDto,
  syncRenewalTasks,
} from "@/lib/renewal-management";

export async function GET(req: Request) {
  await requireRenewalCenterUser();
  const url = new URL(req.url);
  const rows = await listRenewalTasks({
    status: String(url.searchParams.get("status") ?? "OPEN"),
    limit: Number(url.searchParams.get("limit") ?? 300),
  });
  return Response.json({ ok: true, tasks: rows.map(renewalTaskDto) });
}

export async function POST() {
  const user = await requireRenewalCenterUser();
  const result = await syncRenewalTasks(user);
  const rows = await listRenewalTasks({ status: "OPEN", limit: 300 });
  return Response.json({
    ok: true,
    sync: { created: result.created, updated: result.updated, resolved: result.resolved },
    tasks: rows.map(renewalTaskDto),
  });
}
