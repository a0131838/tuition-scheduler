import {deleteUnusedSchedulingContainer} from '@/lib/scheduling-container-deletion';
import {requireSessionDeletionActor} from '@/lib/session-deletion-auth';
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
  let actor;try{actor=await requireSessionDeletionActor();}catch{return bad('Teaching management permission required / 需要教学管理权限',403);}
  let body;try{body=await req.json();}catch{return bad('Invalid JSON / 请求格式无效');}const id=String(body?.id??'');
  try{return Response.json(await deleteUnusedSchedulingContainer('Campus',id,actor));}
  catch(e){return bad(e instanceof Error?e.message:'Delete failed / 删除失败',409);}
}
