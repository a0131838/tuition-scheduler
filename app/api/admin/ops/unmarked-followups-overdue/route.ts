import { guardOpsReadAccess } from "@/lib/ops-auth";
import { getOverdueUnmarkedFollowupGroups } from "@/lib/unmarked-followups";

function toInt(v: string | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

export async function GET(req: Request) {
  const access = await guardOpsReadAccess(req);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const thresholdHours = Math.min(Math.max(toInt(url.searchParams.get("thresholdHours"), 3), 1), 24);
  const lookbackDays = Math.min(Math.max(toInt(url.searchParams.get("lookbackDays"), 7), 1), 30);
  const perTeacherLimit = Math.min(Math.max(toInt(url.searchParams.get("perTeacherLimit"), 5), 1), 20);
  const totalLimit = Math.min(Math.max(toInt(url.searchParams.get("totalLimit"), 80), 1), 300);
  const groups = await getOverdueUnmarkedFollowupGroups({
    thresholdHours,
    lookbackDays,
    perTeacherLimit,
    totalLimit,
  });

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    query: { thresholdHours, lookbackDays, perTeacherLimit, totalLimit },
    totalTeachers: groups.length,
    totalSessions: groups.reduce((sum, group) => sum + group.count, 0),
    groups,
  });
}
