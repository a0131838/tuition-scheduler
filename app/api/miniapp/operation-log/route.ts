import { bearerToken, bad, ok } from "@/app/api/miniapp/_lib";
import { logAudit } from "@/lib/audit-log";
import { getParentPortalSession } from "@/lib/parent-portal";
import { getStaffMiniappSession } from "@/lib/miniapp-staff";

const REDACTED_KEYS = new Set([
  "authorization",
  "code",
  "mockopenid",
  "password",
  "previewtoken",
  "signaturedataurl",
  "token",
]);

function clean(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return value.slice(0, 1200);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => clean(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [key, REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : clean(item, depth + 1)])
    );
  }
  return String(value ?? "").slice(0, 1200);
}

function requestPath(value: unknown) {
  const path = String(value ?? "").trim().slice(0, 500);
  if (!path.startsWith("/api/miniapp/") || path === "/api/miniapp/operation-log") return "";
  return path;
}

export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return bad("Unauthorized", 401);
  const [staffSession, parentSession] = await Promise.all([
    getStaffMiniappSession(token),
    getParentPortalSession(token),
  ]);
  if (!staffSession && !parentSession) return bad("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const path = requestPath((body as any).path);
  const method = String((body as any).method ?? "").trim().toUpperCase();
  const outcome = String((body as any).outcome ?? "").trim().toUpperCase() === "SUCCESS" ? "SUCCESS" : "FAILED";
  const statusCode = Number((body as any).statusCode ?? 0);
  if (!path || !["POST", "PATCH", "PUT", "DELETE", "UPLOAD"].includes(method)) return bad("Invalid operation log", 409);

  const actor = staffSession
    ? { email: staffSession.user.email, name: staffSession.user.name, role: staffSession.user.role }
    : {
        email: `miniapp-parent-${parentSession!.parent.id}@sgtmanage.local`,
        name: parentSession!.parent.name,
        role: "PARENT",
      };

  await logAudit({
    actor,
    module: "MINIAPP",
    action: `${method}_${outcome}`,
    entityType: "MiniappOperation",
    entityId: path,
    meta: clean({
      path,
      method,
      outcome,
      statusCode: Number.isFinite(statusCode) ? statusCode : 0,
      request: (body as any).requestData,
      response: (body as any).responseData,
      error: (body as any).error,
      clientAt: (body as any).clientAt,
    }) as any,
  });
  return ok({ logged: true });
}
