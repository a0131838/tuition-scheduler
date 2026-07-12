import { prisma } from "@/lib/prisma";
import {
  availableServiceTemplate,
  sendServiceNotification,
  servicePayloadWithDeliveredTemplate,
} from "@/lib/wechat-miniapp-service-subscription";

const TEMPLATE_KEYS = ["request_status_changed", "finance_unpaid", "invoice_issued", "receipt_issued", "feedback_published"];

function attemptNumber(error: string | null) {
  return Number(error?.match(/^attempt=(\d+)/)?.[1] ?? 0) + 1;
}

async function main() {
  const now = new Date();
  const rows = await prisma.miniappNotificationOutbox.findMany({
    where: { status: "PENDING", templateKey: { in: TEMPLATE_KEYS }, scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });
  const summary = { scanned: rows.length, sent: 0, waitingConsent: 0, retried: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    if (row.scheduledAt.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
      await prisma.miniappNotificationOutbox.update({ where: { id: row.id }, data: { status: "SKIPPED", error: "Notification window expired" } });
      summary.skipped += 1;
      continue;
    }
    const template = row.openId ? await availableServiceTemplate(row.parentId, row.templateKey) : null;
    if (!row.openId || !template) {
      summary.waitingConsent += 1;
      continue;
    }
    const claimed = await prisma.miniappNotificationOutbox.updateMany({
      where: { id: row.id, status: "PENDING" }, data: { status: "PROCESSING" },
    });
    if (claimed.count !== 1) continue;
    const attempt = attemptNumber(row.error);
    try {
      await sendServiceNotification({ openId: row.openId, payload: row.payloadJson, template });
      await prisma.miniappNotificationOutbox.update({
        where: { id: row.id },
        data: {
          status: "SENT", sentAt: new Date(), error: null,
          payloadJson: servicePayloadWithDeliveredTemplate(row.payloadJson, template.templateId, template.groupKey),
        },
      });
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
    }
  }
  console.log(JSON.stringify({ ok: true, ...summary, generatedAt: new Date().toISOString() }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
