import { prisma } from "@/lib/prisma";
import { availableCourseTemplate } from "@/lib/wechat-miniapp-subscription";
import { availableServiceTemplate } from "@/lib/wechat-miniapp-service-subscription";

const SUPPORTED_KEYS = ["course_reminder_24h", "request_status_changed", "finance_unpaid", "invoice_issued", "receipt_issued"];

export async function listMiniappConsentAttention(limit = 200) {
  const candidates = await prisma.miniappNotificationOutbox.findMany({
    where: {
      status: "PENDING",
      templateKey: { in: SUPPORTED_KEYS },
      scheduledAt: { lte: new Date() },
    },
    include: {
      parent: { select: { id: true, name: true, phone: true, wechatOpenId: true, status: true } },
      student: { select: { id: true, name: true, school: true, grade: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: Math.min(Math.max(limit, 1), 300),
  });
  const checks = new Map<string, Promise<boolean>>();
  for (const row of candidates) {
    const key = `${row.parentId}:${row.templateKey}`;
    if (checks.has(key)) continue;
    checks.set(key, row.templateKey === "course_reminder_24h"
      ? availableCourseTemplate(row.parentId).then(Boolean)
      : availableServiceTemplate(row.parentId, row.templateKey).then(Boolean));
  }
  const availability = new Map<string, boolean>();
  await Promise.all(Array.from(checks.entries()).map(async ([key, check]) => availability.set(key, await check)));
  return candidates.filter((row) => !availability.get(`${row.parentId}:${row.templateKey}`));
}

export async function listCourseReminderConsentAttention(limit = 200) {
  return (await listMiniappConsentAttention(limit)).filter((row) => row.templateKey === "course_reminder_24h");
}
