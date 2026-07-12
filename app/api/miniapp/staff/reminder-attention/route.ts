import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import { listMiniappConsentAttention } from "@/lib/miniapp-reminder-attention";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Reminder attention permission required", 403);
  const rows = await listMiniappConsentAttention(200);
  return ok({
    total: rows.length,
    reminders: rows.map((row) => {
      const payload = row.payloadJson && typeof row.payloadJson === "object" ? row.payloadJson as any : {};
      return {
        id: row.id,
        scheduledAt: row.scheduledAt.toISOString(),
        scheduledText: formatBusinessDateTime(row.scheduledAt),
        eventTimeText: formatBusinessDateTime(new Date(String(payload.startAt || payload.updatedAt || payload.issueDate || payload.receiptDate || row.scheduledAt))),
        categoryLabel: ({
          course_reminder_24h: "课程提醒",
          request_status_changed: "请求状态",
          finance_unpaid: "待付提醒",
          invoice_issued: "发票已出",
          receipt_issued: "收据已出",
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
            : "请在微信群提醒家长打开小程序，在首页点击“发票与收据”。",
      };
    }),
  });
}
