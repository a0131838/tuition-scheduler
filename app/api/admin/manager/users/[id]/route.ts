import { prisma } from "@/lib/prisma";
import { getManagerEmailSet, isOwnerManager, requireManager } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function pickRole(v: string) {
  return v === "ADMIN" || v === "TEACHER" || v === "STUDENT" ? v : "ADMIN";
}

function pickLang(v: string) {
  return v === "BILINGUAL" || v === "ZH" || v === "EN" ? v : "BILINGUAL";
}

type BasicUser = { id: string; email: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

function canEditTargetUser(
  actor: BasicUser,
  target: BasicUser,
  managerSet: Set<string>
): { ok: true } | { ok: false; reason: string } {
  const actorIsOwner = isOwnerManager(actor);
  const targetIsOwner = isOwnerManager(target);
  const targetIsManagerAdmin = target.role === "ADMIN" && managerSet.has(target.email.toLowerCase());

  if (!actorIsOwner && targetIsOwner) {
    return { ok: false, reason: "Only owner manager can edit zhao hongwei account" };
  }
  if (targetIsManagerAdmin) {
    return { ok: false, reason: "Manager-admin accounts are protected and cannot be edited" };
  }
  return { ok: true };
}

async function requireEditableTarget(actor: BasicUser, id: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false as const, status: 404 as const, message: "User not found" };

  const targetUser: BasicUser = {
    id: target.id,
    email: target.email,
    role: target.role as BasicUser["role"],
  };

  const managerSet = await getManagerEmailSet();
  const check = canEditTargetUser(actor, targetUser, managerSet);
  if (!check.ok) return { ok: false as const, status: 403 as const, message: check.reason };

  return { ok: true as const, targetUser };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const manager = await requireManager();
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim();
  const role = pickRole(String(body?.role ?? ""));
  const language = pickLang(String(body?.language ?? ""));
  const teacherIdRaw = String(body?.teacherId ?? "").trim();

  if (!id || !email || !name) return bad("Missing required fields", 409);

  const check = await requireEditableTarget({ id: manager.id, email: manager.email, role: manager.role as any }, id);
  if (!check.ok) return bad(check.message, check.status);

  if (id === manager.id && role !== "ADMIN") return bad("You cannot change your own role from ADMIN", 403);

  const teacherId = role === "TEACHER" || role === "ADMIN" ? teacherIdRaw || null : null;
  if (teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
    if (!teacher) return bad("Teacher not found", 404);
    const linked = await prisma.user.findFirst({ where: { teacherId, NOT: { id } }, select: { email: true } });
    if (linked) return bad(`Teacher already linked to ${linked.email}`, 409);
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { email, name, role: role as any, language: language as any, teacherId },
    });
  } catch {
    return bad("Save failed (email may already exist)", 409);
  }

  return Response.json({ ok: true, message: "User updated" });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const manager = await requireManager();
  const { id } = await params;
  if (!id) return bad("Missing user id");

  const check = await requireEditableTarget({ id: manager.id, email: manager.email, role: manager.role as any }, id);
  if (!check.ok) return bad(check.message, check.status);

  if (id === manager.id) return bad("You cannot delete your own account", 403);

  await prisma.authSession.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return Response.json({ ok: true, message: "User deleted" });
}

