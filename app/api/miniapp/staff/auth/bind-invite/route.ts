import { prisma } from "@/lib/prisma";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { bindStaffMiniappInvite, createStaffMiniappSession, resolveStaffWechatIdentity, staffMiniappUserDto } from "@/lib/miniapp-staff";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  const token = String((body as any).token ?? "").trim();
  if (!token) return bad("Binding code is required", 409);

  try {
    const identity = await resolveStaffWechatIdentity({
      code: (body as any).code,
      mockOpenId: (body as any).mockOpenId,
    });
    const userId = await bindStaffMiniappInvite({ token, openId: identity.openId, unionId: identity.unionId });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceAccesses: {
          where: { isActive: true },
          select: { workspace: true },
        },
      },
    });
    if (!user) return bad("User not found", 404);

    const session = await createStaffMiniappSession(user.id, identity.openId);
    return ok({
      token: session.token,
      staff: staffMiniappUserDto(user),
    });
  } catch (error: any) {
    return bad(error?.message || "Bind failed", 409);
  }
}
