import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { campusRequiresRoom } from "@/lib/campus";

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
  const isOnline = Boolean(body?.isOnline);
  const requiresRoom = body?.requiresRoom == null ? !isOnline : Boolean(body.requiresRoom);
  if (!name) return bad("Name is required", 409);

  const created = await prisma.campus.create({
    data: { name, isOnline, requiresRoom: isOnline ? false : requiresRoom },
    select: { id: true, name: true, isOnline: true, requiresRoom: true },
  });

  return Response.json({ ok: true, campus: created }, { status: 201 });
}

export async function PATCH(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const campusId = String(body?.id ?? "");
  if (!campusId) return bad("Missing id", 409);

  const current = await prisma.campus.findUnique({
    where: { id: campusId },
    select: { id: true, isOnline: true, requiresRoom: true },
  });
  if (!current) return bad("Campus not found", 404);

  const nextIsOnline = body?.isOnline == null ? current.isOnline : Boolean(body.isOnline);
  const nextRequiresRoom =
    body?.requiresRoom == null
      ? campusRequiresRoom(current)
      : Boolean(body.requiresRoom);

  const updated = await prisma.campus.update({
    where: { id: campusId },
    data: {
      isOnline: nextIsOnline,
      requiresRoom: nextIsOnline ? false : nextRequiresRoom,
    },
    select: { id: true, name: true, isOnline: true, requiresRoom: true },
  });

  return Response.json({ ok: true, campus: updated });
}

export async function DELETE(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const campusId = String(body?.id ?? "");
  if (!campusId) return bad("Missing id", 409);

  const classes = await prisma.class.findMany({
    where: { campusId },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);

  if (classIds.length > 0) {
    await prisma.enrollment.deleteMany({ where: { classId: { in: classIds } } });
    await prisma.session.deleteMany({ where: { classId: { in: classIds } } });
  }

  await prisma.class.deleteMany({ where: { campusId } });
  await prisma.room.deleteMany({ where: { campusId } });
  await prisma.campus.delete({ where: { id: campusId } });

  return Response.json({ ok: true });
}
