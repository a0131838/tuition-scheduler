import { prisma } from "@/lib/prisma";
import { createPasswordHash, getManagerEmailSet, isOwnerManager, requireManager } from "@/lib/auth";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const manager = await requireManager();
  const { id } = await params;
  if (!id) return bad("Missing user id");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const password = String(body?.password ?? "");
  if (!password) return bad("Missing password", 409);
  if (password.length < 8) return bad("Password must be at least 8 characters", 409);

  const check = await requireEditableTarget({ id: manager.id, email: manager.email, role: manager.role as any }, id);
  if (!check.ok) return bad(check.message, check.status);

  const { salt, hash } = createPasswordHash(password);
  await prisma.user.update({
    where: { id },
    data: { passwordSalt: salt, passwordHash: hash },
  });
  await prisma.authSession.deleteMany({ where: { userId: id } });

  return Response.json({ ok: true, message: "Password reset (all sessions revoked)" });
}

