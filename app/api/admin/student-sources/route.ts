import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = String(body?.name ?? "").trim();
  if (!name) return bad("Name is required", 409);

  const created = await prisma.studentSourceChannel.create({
    data: { name },
    select: { id: true, name: true, isActive: true },
  });

  return Response.json({ ok: true, source: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const id = String(body?.id ?? "");
  const isActive = Boolean(body?.isActive);
  if (!id) return bad("Missing id", 409);

  const updated = await prisma.studentSourceChannel.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, isActive: true },
  });

  return Response.json({ ok: true, source: updated });
}

export async function DELETE(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const id = String(body?.id ?? "");
  if (!id) return bad("Missing id", 409);

  const count = await prisma.student.count({ where: { sourceChannelId: id } });
  if (count > 0) return bad("Source is used by students", 409);

  await prisma.studentSourceChannel.delete({ where: { id } });
  return Response.json({ ok: true });
}

