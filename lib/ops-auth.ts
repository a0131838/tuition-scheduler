import crypto from "node:crypto";
import { requireAdmin } from "@/lib/auth";

type OpsActor = {
  kind: "ops-key" | "admin-session";
  email: string;
  name: string;
  role: string;
};

type GuardResult =
  | { ok: true; actor: OpsActor }
  | { ok: false; response: Response };

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function normalizeIp(ip: string) {
  const raw = ip.trim().toLowerCase();
  if (raw.startsWith("::ffff:")) return raw.slice(7);
  return raw;
}

function isLoopbackIp(ip: string) {
  const n = normalizeIp(ip);
  return n === "127.0.0.1" || n === "::1" || n === "localhost";
}

function parseClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const xri = req.headers.get("x-real-ip");
  if (xri) return normalizeIp(xri);

  const cfi = req.headers.get("cf-connecting-ip");
  if (cfi) return normalizeIp(cfi);

  const host = new URL(req.url).hostname;
  if (host) return normalizeIp(host);
  return "unknown";
}

function ipAllowlist() {
  const raw = String(process.env.OPENCLAW_OPS_IP_ALLOWLIST ?? "127.0.0.1,::1,localhost").trim();
  return raw
    .split(",")
    .map((v) => normalizeIp(v))
    .filter(Boolean);
}

function ipAllowed(ip: string, allowlist: string[]) {
  if (allowlist.includes("*")) return true;
  const n = normalizeIp(ip);
  if (allowlist.includes(n)) return true;
  return allowlist.includes("loopback") && isLoopbackIp(n);
}

export async function guardOpsReadAccess(req: Request): Promise<GuardResult> {
  const expected = String(process.env.OPENCLAW_OPS_KEY ?? "").trim();
  const provided = String(req.headers.get("x-ops-key") ?? "").trim();

  if (provided) {
    if (!expected || !safeEqual(expected, provided)) {
      return {
        ok: false,
        response: Response.json({ ok: false, message: "Invalid x-ops-key" }, { status: 401 }),
      };
    }

    const clientIp = parseClientIp(req);
    const allow = ipAllowlist();
    if (!ipAllowed(clientIp, allow)) {
      return {
        ok: false,
        response: Response.json(
          {
            ok: false,
            message: "IP not allowed for ops key",
            clientIp,
          },
          { status: 403 },
        ),
      };
    }

    return {
      ok: true,
      actor: {
        kind: "ops-key",
        email: "openclaw-bot@local",
        name: "openclaw-bot",
        role: "OPS_BOT",
      },
    };
  }

  const user = await requireAdmin();
  return {
    ok: true,
    actor: {
      kind: "admin-session",
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
