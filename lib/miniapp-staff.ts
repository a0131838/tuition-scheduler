import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getOperationsAdminEmailSet } from "@/lib/auth";

export const STAFF_MINIAPP_SESSION_DAYS = 30;

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function createStaffMiniappInviteToken() {
  return randomToken(20);
}

export async function createStaffMiniappSession(userId: string, wechatOpenId?: string | null) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + STAFF_MINIAPP_SESSION_DAYS * 24 * 60 * 60 * 1000);
  return prisma.staffMiniappSession.create({
    data: { userId, wechatOpenId: wechatOpenId || null, token, expiresAt },
  });
}

export async function getStaffMiniappSession(token: string) {
  const cleanToken = String(token ?? "").trim();
  if (!cleanToken) return null;

  const session = await prisma.staffMiniappSession.findUnique({
    where: { token: cleanToken },
    include: {
      user: {
        include: {
          workspaceAccesses: {
            where: { isActive: true },
            select: { workspace: true },
          },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.staffMiniappSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  const operationsAdminEmails = await getOperationsAdminEmailSet();
  return {
    ...session,
    user: {
      ...session.user,
      operationsAdmin: operationsAdminEmails.has(session.user.email.trim().toLowerCase()),
    },
  };
}

export function staffMiniappUserDto(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  teacherId: string | null;
  isObserver: boolean;
  workspaceAccesses?: Array<{ workspace: string }>;
  operationsAdmin?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teacherId: user.teacherId,
    isObserver: user.isObserver,
    operationsAdmin: Boolean(user.operationsAdmin),
    workspaces: (user.workspaceAccesses ?? []).map((x) => x.workspace),
  };
}

export async function listStaffMiniappAccounts(openId: string) {
  const cleanOpenId = String(openId ?? "").trim();
  if (!cleanOpenId) return [];
  const bindings = await prisma.staffMiniappBinding.findMany({
    where: { wechatOpenId: cleanOpenId, status: "ACTIVE" },
    include: {
      user: {
        include: {
          workspaceAccesses: {
            where: { isActive: true },
            select: { workspace: true },
          },
        },
      },
    },
    orderBy: [{ boundAt: "asc" }, { createdAt: "asc" }],
  });
  const operationsAdminEmails = await getOperationsAdminEmailSet();
  return bindings.map((binding) => staffMiniappUserDto({
    ...binding.user,
    operationsAdmin: operationsAdminEmails.has(binding.user.email.trim().toLowerCase()),
  }));
}

export async function resolveStaffWechatIdentity(input: { code?: string | null; mockOpenId?: string | null }) {
  const mockOpenId = String(input.mockOpenId ?? "").trim();
  if (process.env.NODE_ENV !== "production" && mockOpenId) {
    return { openId: mockOpenId, unionId: null as string | null };
  }

  const appid = String(process.env.WECHAT_MINIAPP_APPID ?? "").trim();
  const secret = String(process.env.WECHAT_MINIAPP_SECRET ?? "").trim();
  const code = String(input.code ?? "").trim();
  if (!appid || !secret) throw new Error("Wechat miniapp credentials are not configured");
  if (!code) throw new Error("Wechat login code is required");

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.errcode) {
    throw new Error(data.errmsg || "Wechat login failed");
  }
  if (!data.openid) throw new Error("Wechat openid missing");
  return { openId: String(data.openid), unionId: data.unionid ? String(data.unionid) : null };
}

export async function createStaffMiniappBindInvite(input: { userId: string; createdBy?: string | null; expiresAt?: Date | null }) {
  return prisma.staffMiniappBindInvite.create({
    data: {
      userId: input.userId,
      createdBy: input.createdBy || null,
      expiresAt: input.expiresAt || null,
      token: createStaffMiniappInviteToken(),
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function bindStaffMiniappInvite(input: { token: string; openId: string; unionId?: string | null }) {
  const cleanToken = String(input.token ?? "").trim();
  if (!cleanToken) throw new Error("Missing bind invite token");

  return prisma.$transaction(async (tx) => {
    const invite = await tx.staffMiniappBindInvite.findUnique({
      where: { token: cleanToken },
      select: { id: true, userId: true, expiresAt: true, usedAt: true, isActive: true },
    });
    if (!invite || !invite.isActive) throw new Error("Invite is invalid");
    if (invite.usedAt) throw new Error("Invite has already been used");
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite has expired");

    await tx.staffMiniappBinding.upsert({
      where: { wechatOpenId_userId: { wechatOpenId: input.openId, userId: invite.userId } },
      update: {
        wechatUnionId: input.unionId || null,
        status: "ACTIVE",
        revokedAt: null,
        boundAt: new Date(),
      },
      create: {
        userId: invite.userId,
        wechatOpenId: input.openId,
        wechatUnionId: input.unionId || null,
      },
    });

    await tx.staffMiniappBindInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedByOpenId: input.openId,
        isActive: false,
      },
    });

    return invite.userId;
  });
}
