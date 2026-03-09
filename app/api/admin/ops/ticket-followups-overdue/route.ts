import { guardOpsReadAccess } from "@/lib/ops-auth";
import { getOverdueTicketFollowupGroups } from "@/lib/ticket-followups";

function toInt(v: string | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

export async function GET(req: Request) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const perOwnerLimit = Math.min(Math.max(toInt(url.searchParams.get("perOwnerLimit"), 6), 1), 20);
  const totalLimit = Math.min(Math.max(toInt(url.searchParams.get("totalLimit"), 60), 1), 200);
  const groups = await getOverdueTicketFollowupGroups({ perOwnerLimit, totalLimit });

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    query: { perOwnerLimit, totalLimit },
    totalOwners: groups.length,
    totalTickets: groups.reduce((sum, group) => sum + group.count, 0),
    groups,
  });
}
