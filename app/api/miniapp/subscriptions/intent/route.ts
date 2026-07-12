import { bad, ok, requireMiniappParent } from "@/app/api/miniapp/_lib";
import { getParentCourseReminderCoverage } from "@/lib/miniapp-course-reminder-coverage";
import { miniappSubscriptionGroups } from "@/lib/miniapp-subscription-config";
import { prisma } from "@/lib/prisma";

function clean(value: unknown, maxLen: number) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export async function GET(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const studentId = clean(new URL(req.url).searchParams.get("studentId"), 80);
  if (studentId) {
    const link = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: auth.parent.id, studentId } },
      select: { canViewSchedule: true },
    });
    if (!link?.canViewSchedule) return bad("Forbidden", 403);
  }
  const groups = miniappSubscriptionGroups();
  const courseReminder = await getParentCourseReminderCoverage(auth.parent.id, studentId || null);
  return ok({ groups, courseReminder, hasConfiguredTemplates: groups.some((group) => group.configured) });
}

export async function POST(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const groupKey = clean((body as any).groupKey, 40);
  const studentId = clean((body as any).studentId, 80);
  const result = (body as any).result;
  const group = miniappSubscriptionGroups().find((item) => item.key === groupKey);
  if (!group?.configured) return bad("Subscription template group is not configured", 409);
  if (studentId) {
    const link = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: auth.parent.id, studentId } },
      select: { canViewSchedule: true },
    });
    if (!link?.canViewSchedule) return bad("Forbidden", 403);
  }
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
  const courseReminder = group.key === "course"
    ? await getParentCourseReminderCoverage(auth.parent.id, studentId || null)
    : null;
  return ok({
    acceptedCount: acceptedTemplateIds.length,
    courseReminder,
    message: acceptedTemplateIds.length ? `已新增 ${acceptedTemplateIds.length} 条提醒额度。` : "本次未开启提醒。",
  });
}
