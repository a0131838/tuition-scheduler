import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PARENT_PORTAL_SESSION_DAYS = 30;

export type ParentPortalPermission =
  | "canViewSchedule"
  | "canViewFeedback"
  | "canViewFinance"
  | "canViewReports"
  | "canCreateRequests";

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function createParentPortalToken() {
  return randomToken(32);
}

export function createParentBindInviteToken() {
  return randomToken(24);
}

export async function createParentPortalSession(parentId: string) {
  const token = createParentPortalToken();
  const expiresAt = new Date(Date.now() + PARENT_PORTAL_SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.parentPortalSession.create({
    data: { parentId, token, expiresAt },
  });
  return session;
}

export async function getParentPortalSession(token: string) {
  const cleanToken = String(token ?? "").trim();
  if (!cleanToken) return null;

  const session = await prisma.parentPortalSession.findUnique({
    where: { token: cleanToken },
    include: { parent: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.parentPortalSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  return session;
}

export async function createParentBindInvite(input: {
  studentId: string;
  createdBy?: string | null;
  expiresAt?: Date | null;
}) {
  return prisma.parentBindInvite.create({
    data: {
      studentId: input.studentId,
      createdBy: input.createdBy || null,
      expiresAt: input.expiresAt || null,
      token: createParentBindInviteToken(),
    },
  });
}

export async function bindParentToInvite(input: {
  token: string;
  parentId: string;
  relationship?: string | null;
  parentName?: string | null;
  phone?: string | null;
  phoneCountry?: string | null;
}) {
  const cleanToken = String(input.token ?? "").trim();
  if (!cleanToken) throw new Error("Missing invite token");

  return prisma.$transaction(async (tx) => {
    const invite = await tx.parentBindInvite.findUnique({
      where: { token: cleanToken },
      select: {
        id: true,
        studentId: true,
        expiresAt: true,
        usedAt: true,
        isActive: true,
      },
    });
    if (!invite || !invite.isActive) throw new Error("Invite is invalid");
    if (invite.usedAt) throw new Error("Invite has already been used");
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite has expired");

    const parentUpdate: {
      name?: string;
      phone?: string;
      phoneCountry?: string;
    } = {};
    if (input.parentName?.trim()) parentUpdate.name = input.parentName.trim();
    if (input.phone?.trim()) parentUpdate.phone = input.phone.trim();
    if (input.phoneCountry?.trim()) parentUpdate.phoneCountry = input.phoneCountry.trim();

    if (Object.keys(parentUpdate).length > 0) {
      await tx.parentAccount.update({
        where: { id: input.parentId },
        data: parentUpdate,
      });
    }

    const link = await tx.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: input.parentId,
          studentId: invite.studentId,
        },
      },
      update: {
        relationship: input.relationship?.trim() || undefined,
      },
      create: {
        parentId: input.parentId,
        studentId: invite.studentId,
        relationship: input.relationship?.trim() || null,
      },
    });

    await tx.parentBindInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedById: input.parentId,
        isActive: false,
      },
    });

    return link;
  });
}

export async function getParentStudentLink(input: {
  parentId: string;
  studentId: string;
  permission?: ParentPortalPermission;
}) {
  const link = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: {
        parentId: input.parentId,
        studentId: input.studentId,
      },
    },
  });
  if (!link) return null;
  if (input.permission && !link[input.permission]) return null;
  return link;
}

export async function requireParentStudentAccess(input: {
  parentId: string;
  studentId: string;
  permission?: ParentPortalPermission;
}) {
  const link = await getParentStudentLink(input);
  if (!link) throw new Error("Parent does not have access to this student");
  return link;
}

export async function logParentPortalAudit(input: {
  parentId?: string | null;
  studentId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Prisma.InputJsonValue | null;
}) {
  return prisma.parentPortalAudit.create({
    data: {
      parentId: input.parentId || null,
      studentId: input.studentId || null,
      action: input.action,
      targetType: input.targetType || null,
      targetId: input.targetId || null,
      metaJson: input.meta ?? Prisma.JsonNull,
    },
  });
}
