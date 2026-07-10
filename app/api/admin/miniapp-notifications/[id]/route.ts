import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const action = String((body as any).action ?? "").trim();
  if (action !== "skip" && action !== "reset") return bad("Invalid action", 409);

  const existing = await prisma.miniappNotificationOutbox.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return bad("Notification not found", 404);

  const updated = await prisma.miniappNotificationOutbox.update({
    where: { id },
    data:
      action === "skip"
        ? { status: "SKIPPED", error: String((body as any).reason ?? "Skipped by admin").slice(0, 500) }
        : { status: "PENDING", error: null, sentAt: null, scheduledAt: new Date() },
  });

  return Response.json({
    ok: true,
    notification: {
      id: updated.id,
      status: updated.status,
      error: updated.error,
      scheduledAt: updated.scheduledAt.toISOString(),
      sentAt: updated.sentAt ? updated.sentAt.toISOString() : null,
    },
  });
}
