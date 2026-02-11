import { prisma } from "@/lib/prisma";
import { requireOwnerManager } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwnerManager();
  const { id } = await params;
  if (!id) return bad("Missing manager id");

  try {
    await prisma.managerAcl.delete({ where: { id } });
  } catch (e: any) {
    return bad(String(e?.message ?? "Remove failed"), 500);
  }

  return Response.json({ ok: true, message: "Manager removed" });
}

