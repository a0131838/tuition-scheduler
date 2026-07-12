import { prisma } from "@/lib/prisma";
import { courseTemplates, summarizeCourseTemplateQuota } from "@/lib/wechat-miniapp-subscription";

export async function listCourseReminderConsentAttention(limit = 200) {
  const candidates = await prisma.miniappNotificationOutbox.findMany({
    where: {
      status: "PENDING",
      templateKey: "course_reminder_24h",
      scheduledAt: { lte: new Date() },
    },
    include: {
      parent: { select: { id: true, name: true, phone: true, wechatOpenId: true, status: true } },
      student: { select: { id: true, name: true, school: true, grade: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(Math.max(limit, 1), 300),
  });
  const parentIds = Array.from(new Set(candidates.map((row) => row.parentId)));
  if (parentIds.length === 0) return [];
  const [audits, sentRows] = await Promise.all([
    prisma.parentPortalAudit.findMany({
      where: { parentId: { in: parentIds }, action: "MINIAPP_SUBSCRIPTION_INTENT", targetId: "course" },
      select: { parentId: true, metaJson: true },
      take: 5000,
    }),
    prisma.miniappNotificationOutbox.findMany({
      where: { parentId: { in: parentIds }, status: "SENT", eventType: { in: ["COURSE_REMINDER", "COURSE_REMINDER_TEST"] } },
      select: { parentId: true, templateKey: true, payloadJson: true },
      take: 5000,
    }),
  ]);
  const templates = courseTemplates();
  const availableByParent = new Map(parentIds.map((parentId) => {
    const quota = summarizeCourseTemplateQuota(
      templates,
      audits.filter((row) => row.parentId === parentId),
      sentRows.filter((row) => row.parentId === parentId)
    );
    return [parentId, quota.availableCount];
  }));
  return candidates.filter((row) => (availableByParent.get(row.parentId) ?? 0) === 0);
}
