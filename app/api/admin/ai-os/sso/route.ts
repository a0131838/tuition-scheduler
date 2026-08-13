import { getCurrentUser, isManagerUser, isOwnerManager } from "@/lib/auth";
import { issueAiMiniappDelegation } from "@/lib/ai-miniapp-delegation";

const AI_ORIGIN = "https://gtaisg.com";

function safeAiPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.slice(0, 1_000);
}

function formalOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  if (host) return `${protocol}://${host}`;
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  return configured ? new URL(configured).origin : new URL(req.url).origin;
}

async function aiRoleFor(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  if (isOwnerManager(user)) return "OWNER";
  if (user.role === "FINANCE") return "MANAGER_FINANCE";
  if (user.role === "CS" || user.role === "SALES") return "CUSTOMER_SERVICE";
  if (user.role === "TEACHER") return "VIEWER";
  if (user.role === "ADMIN" && await isManagerUser(user)) return "MANAGER";
  if (user.role === "ADMIN") return "ACADEMIC";
  throw new Error("Current account cannot access AI OS");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = formalOrigin(req);
  const next = safeAiPath(url.searchParams.get("next"));
  const user = await getCurrentUser();
  if (!user) {
    const returnPath = `/api/admin/ai-os/sso?next=${encodeURIComponent(next)}`;
    return Response.redirect(new URL(`/admin/login?next=${encodeURIComponent(returnPath)}`, origin), 302);
  }

  try {
    const secret = String(process.env.SGT_AI_MINIAPP_SHARED_SECRET || "").trim();
    const token = issueAiMiniappDelegation({
      id: user.id,
      name: user.name,
      role: user.role,
      aiRole: await aiRoleFor(user),
    }, secret, Date.now(), 60);
    const target = new URL("/auth/sso", AI_ORIGIN);
    target.searchParams.set("token", token);
    target.searchParams.set("next", next);
    return Response.redirect(target, 302);
  } catch {
    return Response.redirect(new URL("/admin?err=AI+OS+access+is+not+configured", origin), 302);
  }
}
