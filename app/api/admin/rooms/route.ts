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
  const campusId = String(body?.campusId ?? "").trim();
  const capacity = Number(body?.capacity ?? 0);

  if (!name) return bad("Name is required", 409);
  if (!campusId) return bad("Campus is required", 409);
  if (!Number.isFinite(capacity) || capacity <= 0) return bad("Invalid capacity", 409);

  const created = await prisma.room.create({
    data: { name, campusId, capacity },
    include: { campus: true },
  });

  return Response.json(
    {
      ok: true,
      room: { id: created.id, name: created.name, capacity: created.capacity, campusId: created.campusId, campusName: created.campus.name },
    },
    { status: 201 }
  );
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

  await prisma.class.updateMany({ where: { roomId: id }, data: { roomId: null } });
  await prisma.room.delete({ where: { id } });

  return Response.json({ ok: true });
}

