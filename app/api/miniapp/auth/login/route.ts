import { prisma } from "@/lib/prisma";
import { createParentPortalSession } from "@/lib/parent-portal";
import { bad, ok } from "../../_lib";

async function resolveWechatIdentity(body: any) {
  const mockOpenId = String(body?.mockOpenId ?? "").trim();
  if (mockOpenId && process.env.NODE_ENV !== "production") {
    return {
      openid: mockOpenId,
      unionid: String(body?.mockUnionId ?? "").trim() || null,
    };
  }

  const code = String(body?.code ?? "").trim();
  if (!code) throw new Error("Missing login code");

  const appid = process.env.WECHAT_MINIAPP_APPID;
  const secret = process.env.WECHAT_MINIAPP_SECRET;
  if (!appid || !secret) throw new Error("Wechat miniapp credentials are not configured");

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url);
  const data = (await res.json()) as any;
  if (!res.ok || data.errcode) throw new Error(String(data.errmsg ?? "Wechat login failed"));
  if (!data.openid) throw new Error("Wechat login did not return openid");
  return {
    openid: String(data.openid),
    unionid: data.unionid ? String(data.unionid) : null,
  };
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  let identity: { openid: string; unionid: string | null };
  try {
    identity = await resolveWechatIdentity(body);
  } catch (error: any) {
    return bad(String(error?.message ?? "Login failed"), 401);
  }

  const parent = await prisma.parentAccount.upsert({
    where: { wechatOpenId: identity.openid },
    update: {
      wechatUnionId: identity.unionid,
      status: "ACTIVE",
    },
    create: {
      wechatOpenId: identity.openid,
      wechatUnionId: identity.unionid,
      status: "ACTIVE",
    },
  });

  const session = await createParentPortalSession(parent.id);
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: parent.id },
    include: { student: { select: { id: true, name: true, school: true, grade: true, servicePlanType: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    parent: {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
      status: parent.status,
    },
    students: links.map((link) => ({
      id: link.student.id,
      name: link.student.name,
      school: link.student.school,
      grade: link.student.grade,
      servicePlanType: link.student.servicePlanType,
      relationship: link.relationship,
    })),
  });
}
