import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: teacherId } = await ctx.params;
  if (!teacherId) return bad("Missing teacherId", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const userId = String(body?.userId ?? "");
  if (!userId) return bad("Missing userId", 409);

  await prisma.user.updateMany({
    where: { id: userId, teacherId },
    data: { teacherId: null },
  });

  return Response.json({ ok: true });
}

