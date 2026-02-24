import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditActor = {
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type AuditInput = {
  actor: AuditActor;
  module: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Prisma.JsonValue;
};

function normalizeEmail(email?: string | null) {
  return String(email ?? "").trim().toLowerCase();
}

function isMissingAuditTableError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021" || err.code === "P2022";
}

export async function logAudit(input: AuditInput) {
  const actorEmail = normalizeEmail(input.actor.email);
  if (!actorEmail || !input.module || !input.action) return;

  try {
    await prisma.auditLog.create({
      data: {
        actorEmail,
        actorName: input.actor.name?.trim() || null,
        actorRole: input.actor.role?.trim() || null,
        module: input.module,
        action: input.action,
        entityType: input.entityType?.trim() || null,
        entityId: input.entityId?.trim() || null,
        meta: input.meta ?? undefined,
      },
    });
  } catch (err) {
    if (isMissingAuditTableError(err)) return;
    throw err;
  }
}

