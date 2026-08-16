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
  if (!id || typeof body?.enabled !== "boolean") return bad("Invalid operations administrator setting");
  if (id === actor.id) return bad("Owner account cannot use the restricted operations role", 409);

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isObserver: true },
  });
  if (!target) return bad("User not found", 404);
  if (body.enabled && (target.role === "FINANCE" || target.role === "STUDENT")) {
    return bad("Finance and student accounts cannot become teaching operations administrators", 409);
  }
  if (body.enabled && target.isObserver) return bad("Disable observer mode before enabling operations administrator access", 409);

  const email = target.email.trim().toLowerCase();
  const previous = await prisma.operationsAdminAcl.findUnique({ where: { email }, select: { isActive: true } });
  await prisma.$transaction([
    prisma.operationsAdminAcl.upsert({
      where: { email },
      update: {
        isActive: body.enabled,
        note: body.enabled ? "Teaching operations administrator; company finance access prohibited" : "Operations access disabled",
      },
      create: {
        email,
        isActive: body.enabled,
        note: body.enabled ? "Teaching operations administrator; company finance access prohibited" : "Operations access disabled",
      },
    }),
    prisma.authSession.deleteMany({ where: { userId: id } }),
    prisma.staffMiniappSession.deleteMany({ where: { userId: id } }),
  ]);
  await logAudit({
    actor,
    module: "ACCESS_CONTROL",
    action: body.enabled ? "ENABLE_OPERATIONS_ADMIN" : "DISABLE_OPERATIONS_ADMIN",
    entityType: "User",
    entityId: id,
    meta: { targetEmail: email, previous: Boolean(previous?.isActive), next: body.enabled, companyFinance: false },
  });

  return Response.json({ ok: true, message: "Operations administrator setting updated. Existing sessions were signed out." });
}
