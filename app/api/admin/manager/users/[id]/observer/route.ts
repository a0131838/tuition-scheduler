import { requireOwnerManager } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireOwnerManager();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!id || typeof body?.isObserver !== "boolean") return bad("Invalid observer setting");
  if (id === actor.id) return bad("Owner account cannot be changed to observer mode", 409);

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, isObserver: true },
  });
  if (!target) return bad("User not found", 404);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isObserver: body.isObserver } }),
    prisma.authSession.deleteMany({ where: { userId: id } }),
    prisma.staffMiniappSession.deleteMany({ where: { userId: id } }),
  ]);
  await logAudit({
    actor,
    module: "ACCESS_CONTROL",
    action: body.isObserver ? "ENABLE_OBSERVER" : "DISABLE_OBSERVER",
    entityType: "User",
    entityId: id,
    meta: { targetEmail: target.email, previous: target.isObserver, next: body.isObserver },
  });

  return Response.json({ ok: true, message: "Observer setting updated. Existing sessions were signed out." });
}
