import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; templateId: string }> }) {
  await requireAdmin();
  const { id: teacherId, templateId } = await ctx.params;
  if (!teacherId) return bad("Missing teacherId", 409);
  if (!templateId) return bad("Missing templateId", 409);

  await prisma.teacherOneOnOneTemplate.deleteMany({ where: { id: templateId, teacherId } });
  return Response.json({ ok: true });
}

