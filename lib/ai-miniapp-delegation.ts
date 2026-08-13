import crypto from "crypto";

const ROLE_MAP: Record<string, string> = {
  ADMIN: "OWNER",
  CS: "CUSTOMER_SERVICE",
  FINANCE: "MANAGER_FINANCE",
  SALES: "CUSTOMER_SERVICE",
  TEACHER: "VIEWER",
};

const AI_ROLES = new Set(["OWNER", "MANAGER", "MANAGER_FINANCE", "ACADEMIC", "CUSTOMER_SERVICE", "VIEWER"]);

export function issueAiMiniappDelegation(
  input: { id: string; name: string | null; role: string; aiRole?: string; isObserver?: boolean },
  secret: string,
  now = Date.now(),
  ttlSeconds = 300,
) {
  if (secret.length < 32) throw new Error("AI miniapp integration is not configured");
  const requestedRole = String(input.aiRole || "").toUpperCase();
  const role = input.isObserver ? "VIEWER" : AI_ROLES.has(requestedRole) ? requestedRole : ROLE_MAP[input.role];
  if (!role) throw new Error("Current staff role cannot access AI work");
  const safeTtl = Math.min(Math.max(Number(ttlSeconds) || 300, 30), 600);
  const payload = Buffer.from(JSON.stringify({
    aud: "sgt-ai-os", sub: input.id, displayName: input.name || input.id, role,
    iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + safeTtl,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `sgt1.${payload}.${signature}`;
}
