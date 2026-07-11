import { bad, ok, requireMiniappParent } from "@/app/api/miniapp/_lib";
import { miniappSubscriptionGroups } from "@/lib/miniapp-subscription-config";
import { prisma } from "@/lib/prisma";

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export async function GET(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const groups = miniappSubscriptionGroups();
  return ok({ groups, hasConfiguredTemplates: groups.some((group) => group.configured) });
}

export async function POST(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const groupKey = clean((body as any).groupKey, 40);
  const result = (body as any).result;
  const group = miniappSubscriptionGroups().find((item) => item.key === groupKey);
  if (!group?.configured) return bad("Subscription template group is not configured", 409);
  if (!result || typeof result !== "object" || Array.isArray(result)) return bad("Subscription result is required", 409);
  const acceptedTemplateIds = group.templateIds.filter((id) => clean((result as any)[id], 30) === "accept");
  await prisma.parentPortalAudit.create({
    data: {
      parentId: auth.parent.id,
      action: "MINIAPP_SUBSCRIPTION_INTENT",
      targetType: "SubscriptionGroup",
      targetId: group.key,
      metaJson: { result, acceptedTemplateIds },
    },
  });
  return ok({ acceptedCount: acceptedTemplateIds.length, message: acceptedTemplateIds.length ? "提醒授权已记录。" : "本次未开启提醒。" });
}
