import { autoResolveTeacherConflicts, getOrRunDailyConflictAudit, saveAutoFixResult } from "@/lib/conflict-audit";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("secret") ?? "";
  const h = req.headers.get("x-cron-secret") ?? "";
  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  return q === secret || h === secret || bearer === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const autoFix = url.searchParams.get("autofix") === "1";
  const snapshot = await getOrRunDailyConflictAudit(new Date());
  const autoFixResult = autoFix ? await autoResolveTeacherConflicts(new Date()) : null;
  if (autoFixResult) {
    await saveAutoFixResult(autoFixResult, new Date());
  }
  return Response.json({ ok: true, snapshot, autoFixResult });
}

export async function POST(req: Request) {
  return GET(req);
}
