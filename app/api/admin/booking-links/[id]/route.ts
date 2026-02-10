import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400) {
  return new Response(message, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!id) return bad("Missing link id");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const data: any = {};
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.onlySelectedSlots === "boolean") data.onlySelectedSlots = body.onlySelectedSlots;
  if (Object.keys(data).length === 0) return bad("No fields to update");

  const updated = await prisma.studentBookingLink.update({
    where: { id },
    data,
    select: { id: true, isActive: true, onlySelectedSlots: true },
  });

  return Response.json({ link: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!id) return bad("Missing link id");

  await prisma.studentBookingLink.delete({ where: { id } });
  return Response.json({ ok: true });
}

