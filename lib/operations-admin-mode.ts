function operationsAdminSecret() {
  return String(process.env.OPERATIONS_ADMIN_MODE_SECRET || process.env.OBSERVER_MODE_SECRET || process.env.DATABASE_URL || "").trim();
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function operationsAdminSignature(baseToken: string) {
  const secret = operationsAdminSecret();
  if (secret.length < 16) throw new Error("Operations admin signing secret is not configured");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`operations-admin:${baseToken}`));
  return hex(signature);
}

export async function operationsAdminSessionToken(baseToken: string) {
  return `ops.${baseToken}.${await operationsAdminSignature(baseToken)}`;
}

export async function validOperationsAdminSessionToken(sessionToken: string | undefined) {
  if (!sessionToken?.startsWith("ops.")) return false;
  try {
    const [, baseToken, signature, extra] = sessionToken.split(".");
    if (!baseToken || !signature || extra) return false;
    return signature === await operationsAdminSignature(baseToken);
  } catch {
    return false;
  }
}
