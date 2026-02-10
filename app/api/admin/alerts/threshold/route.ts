import { requireAdmin } from "@/lib/auth";
import { setSignInAlertThresholdMin } from "@/lib/signin-alerts";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const min = Number(String(body?.thresholdMin ?? "10"));
  const normalized = Number.isFinite(min) ? Math.max(1, Math.floor(min)) : 10;
  await setSignInAlertThresholdMin(normalized);

  return Response.json({ ok: true, thresholdMin: normalized });
}

