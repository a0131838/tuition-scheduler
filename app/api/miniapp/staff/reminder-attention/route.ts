import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { formatBusinessDateTime } from "@/lib/date-only";
import { listCourseReminderConsentAttention } from "@/lib/miniapp-reminder-attention";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Reminder attention permission required", 403);
  const rows = await listCourseReminderConsentAttention(200);
  return ok({
    total: rows.length,
    reminders: rows.map((row) => {
      const payload = row.payloadJson && typeof row.payloadJson === "object" ? row.payloadJson as any : {};
      return {
        id: row.id,
        scheduledAt: row.scheduledAt.toISOString(),
        scheduledText: formatBusinessDateTime(row.scheduledAt),
        sessionStartText: formatBusinessDateTime(new Date(String(payload.startAt || row.scheduledAt))),
        courseLabel: String(payload.courseLabel || payload.courseName || "课程"),
        teacherName: String(payload.teacherName || "老师未定"),
        parentName: row.parent.name || "家长",
        parentPhone: row.parent.phone || "",
        studentName: row.student?.name || String(payload.studentName || "学员"),
        instruction: "请在微信群提醒家长打开小程序，点击“开启未来 3 节课提醒”。",
      };
    }),
  });
}
