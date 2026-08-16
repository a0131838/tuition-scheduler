import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import { listMiniappConsentAttention } from "@/lib/miniapp-reminder-attention";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { logAudit } from "@/lib/audit-log";
import {
  COMMUNICATION_REMINDER_ENTITY,
  COMMUNICATION_REMINDER_MODULE,
  communicationReminderSummary,
  listCommunicationReminders,
  normalizeCommunicationReminderStatus,
} from "@/lib/communication-reminders";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Reminder attention permission required", 403);
  const [items, rows] = await Promise.all([
    listCommunicationReminders(new Date(), 200),
    listMiniappConsentAttention(200),
  ]);
  return ok({
    total: items.length,
    summary: communicationReminderSummary(items),
    reminders: items,
    consentTotal: rows.length,
    consentReminders: rows.map((row) => {
      const payload = row.payloadJson && typeof row.payloadJson === "object" ? row.payloadJson as any : {};
      return {
        id: row.id,
        scheduledAt: row.scheduledAt.toISOString(),
        scheduledText: formatBusinessDateTime(row.scheduledAt),
        eventTimeText: formatBusinessDateTime(new Date(String(payload.startAt || payload.updatedAt || payload.issueDate || payload.receiptDate || payload.submittedAt || row.scheduledAt))),
        categoryLabel: ({
          course_reminder_24h: "课程提醒",
          request_status_changed: "请求状态",
          finance_unpaid: "待付提醒",
          invoice_issued: "发票已出",
          receipt_issued: "收据已出",
          feedback_published: "课后反馈",
        } as Record<string, string>)[row.templateKey] || "微信提醒",
        subjectLabel: String(payload.courseLabel || payload.type || payload.invoiceNo || payload.receiptNo || "家长服务通知"),
        detailLabel: String(payload.teacherName || payload.statusLabel || payload.status || ""),
        parentName: row.parent.name || "家长",
        parentPhone: row.parent.phone || "",
        studentName: row.student?.name || String(payload.studentName || "学员"),
        instruction: row.templateKey === "course_reminder_24h"
          ? "请在微信群提醒家长打开小程序，点击“开启未来 3 节课提醒”。"
          : ["request_status_changed", "finance_unpaid"].includes(row.templateKey)
            ? "请在微信群提醒家长打开小程序，在首页点击“请求与财务进度”。"
            : ["invoice_issued", "receipt_issued"].includes(row.templateKey)
              ? "请在微信群提醒家长打开小程序，在首页点击对应的发票或收据提醒。"
              : "请在微信群提醒家长打开小程序，在首页点击“开启课后反馈提醒”。",
      };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Reminder attention permission required", 403);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  const key = String(body?.key ?? "").trim();
  const status = normalizeCommunicationReminderStatus(body?.status);
  if (!key || key.length > 240 || !/^[A-Z0-9_:-]+$/i.test(key) || !status) return bad("Invalid reminder action", 409);
  const snoozedUntil = status === "SNOOZED"
    ? String(body?.snoozedUntil ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()).trim()
    : "";
  if (snoozedUntil && Number.isNaN(new Date(snoozedUntil).getTime())) return bad("Invalid snooze time", 409);
  await logAudit({
    actor: auth.user,
    module: COMMUNICATION_REMINDER_MODULE,
    action: `REMINDER_${status}`,
    entityType: COMMUNICATION_REMINDER_ENTITY,
    entityId: key,
    meta: {
      status,
      language: String(body?.language ?? ""),
      note: String(body?.note ?? "").trim().slice(0, 500),
      snoozedUntil: snoozedUntil || undefined,
    },
  });
  return ok({ key, status });
}
