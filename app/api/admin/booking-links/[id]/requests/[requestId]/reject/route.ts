import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string; requestId: string }> }) {
  const admin = await requireAdmin();
  const { id: linkId, requestId } = await ctx.params;
  if (!linkId) return bad("Missing id", 409);
  if (!requestId) return bad("Missing requestId", 409);

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const note = String(body?.note ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.studentBookingRequest.updateMany({
      where: { id: requestId, linkId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: admin.name,
        adminNote: note,
      },
    });
    await tx.$executeRaw`
      DELETE FROM "StudentBookingRequestSlotLock"
      WHERE "requestId" = ${requestId}
    `;
  });

  return Response.json({ ok: true });
}
