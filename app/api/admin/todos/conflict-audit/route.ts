import { requireAdmin } from "@/lib/auth";
import { autoResolveTeacherConflicts, refreshDailyConflictAudit, saveAutoFixResult } from "@/lib/conflict-audit";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const action = String(body?.action ?? "");
  if (action !== "rerun" && action !== "autofix") return bad("Invalid action");

  const now = new Date();
  if (action === "rerun") {
    await refreshDailyConflictAudit(now);
    return Response.json({ ok: true, action });
  }

  const result = await autoResolveTeacherConflicts(now);
  await saveAutoFixResult(result, now);
  await refreshDailyConflictAudit(now);
  return Response.json({ ok: true, action, result });
}

