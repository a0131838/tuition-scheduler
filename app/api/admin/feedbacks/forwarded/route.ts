import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const id = String(body?.id ?? "");
  const channel = String(body?.channel ?? "").trim();
  const note = String(body?.note ?? "").trim();
  if (!id) return bad("Missing id", 409);

  await prisma.sessionFeedback.update({
    where: { id },
    data: {
      forwardedAt: new Date(),
      forwardedBy: admin.name,
      forwardChannel: channel || null,
      forwardNote: note || null,
    },
  });

  return Response.json({ ok: true });
}

