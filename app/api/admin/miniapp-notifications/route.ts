import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { miniappSubscriptionConfiguration } from "@/lib/miniapp-subscription-config";
import { listCourseReminderConsentAttention } from "@/lib/miniapp-reminder-attention";

function toInt(v: string | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const status = String(url.searchParams.get("status") ?? "PENDING").trim();
  const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 100), 1), 300);

  const [attentionRows, regularRows, summaryRows] = await Promise.all([
    listCourseReminderConsentAttention(limit),
    prisma.miniappNotificationOutbox.findMany({
      where: status === "ALL" || status === "WAITING_CONSENT" ? {} : { status },
      include: {
        parent: { select: { id: true, name: true, phone: true, wechatOpenId: true, status: true } },
        student: { select: { id: true, name: true, school: true, grade: true } },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.miniappNotificationOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const rows = status === "WAITING_CONSENT" ? attentionRows : regularRows;

  return Response.json({
    ok: true,
    query: { status, limit },
    configuration: miniappSubscriptionConfiguration(),
    summary: summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, { WAITING_CONSENT: attentionRows.length }),
    notifications: rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      studentId: row.studentId,
      openId: row.openId,
      templateKey: row.templateKey,
      eventType: row.eventType,
      targetType: row.targetType,
      targetId: row.targetId,
      payloadJson: row.payloadJson,
      status: row.status,
      scheduledAt: row.scheduledAt.toISOString(),
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      attentionReason: attentionRows.some((item) => item.id === row.id) ? "WAITING_CONSENT" : null,
      parent: row.parent,
      student: row.student,
    })),
  });
}
