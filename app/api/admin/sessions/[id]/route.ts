import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: sessionId } = await params;
  if (!sessionId) return bad("Missing sessionId");

  const existing = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!existing) return bad("Session not found", 404);

  try {
    await prisma.session.delete({ where: { id: sessionId } });
  } catch (e: any) {
    return bad(String(e?.message ?? "Delete failed"), 500);
  }

  return Response.json({ ok: true });
}

