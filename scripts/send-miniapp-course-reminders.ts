import { prisma } from "@/lib/prisma";
import { availableCourseTemplate, payloadWithDeliveredTemplate, sendCourseReminder } from "@/lib/wechat-miniapp-subscription";
import { logAudit } from "@/lib/audit-log";

const SYSTEM_ACTOR = { email: "system-reminders@sgtmanage.local", name: "Automatic Reminder", role: "SYSTEM" };

function attemptNumber(error: string | null) {
  return Number(error?.match(/^attempt=(\d+)/)?.[1] ?? 0) + 1;
}

async function main() {
  const now = new Date();
  const rows = await prisma.miniappNotificationOutbox.findMany({
    where: { status: "PENDING", templateKey: "course_reminder_24h", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });
  const summary = { scanned: rows.length, sent: 0, waitingConsent: 0, retried: 0, failed: 0, skipped: 0 };

  for (const row of rows) {
    if (row.scheduledAt.getTime() < now.getTime() - 2 * 60 * 60 * 1000) {
      await prisma.miniappNotificationOutbox.update({ where: { id: row.id }, data: { status: "SKIPPED", error: "Reminder window expired" } });
      await logAudit({ actor: SYSTEM_ACTOR, module: "NOTIFICATIONS", action: "AUTO_REMINDER_SKIPPED", entityType: "MiniappNotificationOutbox", entityId: row.id, meta: { reason: "Reminder window expired" } });
      summary.skipped += 1;
      continue;
    }
    const template = row.openId ? await availableCourseTemplate(row.parentId) : null;
    if (!row.openId || !template) {
      summary.waitingConsent += 1;
      continue;
    }
    const claimed = await prisma.miniappNotificationOutbox.updateMany({ where: { id: row.id, status: "PENDING" }, data: { status: "PROCESSING" } });
    if (claimed.count !== 1) continue;
    const attempt = attemptNumber(row.error);
    try {
      await sendCourseReminder({ openId: row.openId, payload: row.payloadJson, template });
      await prisma.miniappNotificationOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), error: null, payloadJson: payloadWithDeliveredTemplate(row.payloadJson, template.templateId) } });
      await logAudit({ actor: SYSTEM_ACTOR, module: "NOTIFICATIONS", action: "AUTO_REMINDER_SENT", entityType: "MiniappNotificationOutbox", entityId: row.id, meta: { templateKey: row.templateKey, targetId: row.targetId } });
      summary.sent += 1;
    } catch (error: any) {
      const permanent = [40037, 43101].includes(Number(error?.errcode));
      const retry = !permanent && attempt < 3;
      await prisma.miniappNotificationOutbox.update({
        where: { id: row.id },
        data: retry
          ? { status: "PENDING", scheduledAt: new Date(Date.now() + attempt * 5 * 60 * 1000), error: `attempt=${attempt}; ${String(error?.message ?? error).slice(0, 450)}` }
          : { status: "FAILED", error: `attempt=${attempt}; ${String(error?.message ?? error).slice(0, 450)}` },
      });
      if (retry) summary.retried += 1;
      else summary.failed += 1;
      await logAudit({ actor: SYSTEM_ACTOR, module: "NOTIFICATIONS", action: retry ? "AUTO_REMINDER_RETRY" : "AUTO_REMINDER_FAILED", entityType: "MiniappNotificationOutbox", entityId: row.id, meta: { attempt, error: String(error?.message ?? error).slice(0, 450) } });
    }
  }
  console.log(JSON.stringify({ ok: true, ...summary, generatedAt: new Date().toISOString() }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
