function observerSecret() {
  return String(process.env.OBSERVER_MODE_SECRET || process.env.DATABASE_URL || "").trim();
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function observerSignature(baseToken: string) {
  const secret = observerSecret();
  if (secret.length < 16) throw new Error("Observer mode signing secret is not configured");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`observer:${baseToken}`));
  return hex(signature);
}

export async function observerSessionToken(baseToken: string) {
  return `obs.${baseToken}.${await observerSignature(baseToken)}`;
}

export async function validObserverSessionToken(sessionToken: string | undefined) {
  if (!sessionToken?.startsWith("obs.")) return false;
  try {
    const [, baseToken, signature, extra] = sessionToken.split(".");
    if (!baseToken || !signature || extra) return false;
    return signature === await observerSignature(baseToken);
  } catch {
    return false;
  }
}

export function isMutationMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "").toUpperCase());
}
