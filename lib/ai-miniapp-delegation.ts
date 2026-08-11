import crypto from "crypto";

const ROLE_MAP: Record<string, string> = {
  ADMIN: "OWNER",
  CS: "CUSTOMER_SERVICE",
  FINANCE: "MANAGER_FINANCE",
  SALES: "CUSTOMER_SERVICE",
  TEACHER: "VIEWER",
};

export function issueAiMiniappDelegation(input: { id: string; name: string | null; role: string }, secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("AI miniapp integration is not configured");
  const role = ROLE_MAP[input.role];
  if (!role) throw new Error("Current staff role cannot access AI work");
  const payload = Buffer.from(JSON.stringify({
    aud: "sgt-ai-os", sub: input.id, displayName: input.name || input.id, role,
    iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 300,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `sgt1.${payload}.${signature}`;
}
