import { requireOwnerManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickStaffWorkspaces, STAFF_WORKSPACES } from "@/lib/staff-roles";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwnerManager();
  const { id } = await params;
  if (!id) return bad("Missing user id");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return bad("User not found", 404);

  const selected = pickStaffWorkspaces(body?.workspaces);
  await prisma.$transaction(async (tx) => {
    for (const workspace of STAFF_WORKSPACES) {
      const isActive = selected.includes(workspace);
      await tx.userWorkspaceAccess.upsert({
        where: { userId_workspace: { userId: id, workspace } },
        update: { isActive, isDefault: false },
        create: {
          userId: id,
          workspace,
          isActive,
          isDefault: false,
          note: "Managed from System User Admin",
        },
      });
    }
  });

  return Response.json({ ok: true, message: "Workspace access updated", workspaces: selected });
}
