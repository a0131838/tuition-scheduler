import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { issueAiMiniappDelegation } from "@/lib/ai-miniapp-delegation";

function config() {
  const baseUrl = String(process.env.SGT_AI_BASE_URL || "").trim().replace(/\/$/, "");
  const secret = String(process.env.SGT_AI_MINIAPP_SHARED_SECRET || "").trim();
  if (!baseUrl || secret.length < 32) throw new Error("AI 工作台尚未配置。");
  return { baseUrl, secret };
}

async function callAi(path: string, token: string, init?: RequestInit) {
  const { baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "AI 工作台暂时无法访问。");
  return result;
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  try {
    const { secret } = config();
    const token = issueAiMiniappDelegation(auth.user, secret);
    return ok(await callAi("/api/miniapp-ai/work-queue", token));
  } catch (error) { return bad(error instanceof Error ? error.message : "AI 工作台读取失败。", 503); }
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const intakeId = String(body?.intakeId || "").trim();
  const action = String(body?.action || "").trim();
  if (!intakeId || !["prepare", "resolve_target_session", "refresh"].includes(action)) return bad("请求无效。", 400);
  try {
    const { secret } = config();
    const token = issueAiMiniappDelegation(auth.user, secret);
    const path = action === "resolve_target_session"
      ? "/api/miniapp-ai/resolve-target-session"
      : action === "refresh" ? "/api/miniapp-ai/refresh-ticket" : "/api/miniapp-ai/autopilot";
    const payload = action === "refresh"
      ? { ticketId: String(body?.ticketId || "").trim() }
      : action === "resolve_target_session"
      ? { intakeId, sessionId: String(body?.sessionId || "").trim() }
      : {
          intakeId,
          ...(typeof body?.charge === "boolean" ? { charge: body.charge } : {}),
          note: String(body?.note || "").trim(),
          newTeacherId: String(body?.newTeacherId || "").trim(),
          reason: String(body?.reason || "").trim(),
        };
    if (action === "resolve_target_session" && !payload.sessionId) return bad("请选择目标课次。", 400);
    if (action === "refresh" && !("ticketId" in payload && payload.ticketId)) return bad("正式工单编号缺失。", 400);
    const result = await callAi(path, token, { method: "POST", body: JSON.stringify(payload) });
    return ok(result);
  } catch (error) { return bad(error instanceof Error ? error.message : "AI 处理失败。", 409); }
}
