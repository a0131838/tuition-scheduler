import { prisma } from "@/lib/prisma";
import { bad, ok } from "@/app/api/miniapp/_lib";
import { createStaffMiniappSession, resolveStaffWechatIdentity, staffMiniappUserDto } from "@/lib/miniapp-staff";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");

  try {
    const identity = await resolveStaffWechatIdentity({
      code: (body as any).code,
      mockOpenId: (body as any).mockOpenId,
    });
    const binding = await prisma.staffMiniappBinding.findUnique({
      where: { wechatOpenId: identity.openId },
      include: {
        user: {
          include: {
            workspaceAccesses: {
              where: { isActive: true },
              select: { workspace: true },
            },
          },
        },
      },
    });

    if (!binding || binding.status !== "ACTIVE") {
      return ok({ needsBind: true, openIdBound: false });
    }

    const session = await createStaffMiniappSession(binding.userId);
    return ok({
      needsBind: false,
      token: session.token,
      staff: staffMiniappUserDto(binding.user),
    });
  } catch (error: any) {
    return bad(error?.message || "Staff login failed", 409);
  }
}
