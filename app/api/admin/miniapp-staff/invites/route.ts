import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaffMiniappBindInvite } from "@/lib/miniapp-staff";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function GET() {
  await requireAdmin();
  const invites = await prisma.staffMiniappBindInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  return Response.json({ ok: true, invites });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => null);
  const userId = String((body as any)?.userId ?? "").trim();
  if (!userId) return bad("userId is required", 409);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return bad("User not found", 404);

  await prisma.staffMiniappBindInvite.updateMany({
    where: { userId, isActive: true, usedAt: null },
    data: { isActive: false },
  });

  const invite = await createStaffMiniappBindInvite({
    userId,
    createdBy: admin.id,
    expiresAt: null,
  });
  return Response.json({
    ok: true,
    invite,
    miniappPath: `/pages/staff-bind/staff-bind?token=${encodeURIComponent(invite.token)}`,
  });
}
