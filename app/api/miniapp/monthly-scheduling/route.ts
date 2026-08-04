import { bad, ok, requireMiniappParent } from "@/app/api/miniapp/_lib";
import {
  intentLabels,
  itemStatusLabels,
  listParentMonthlyScheduling,
  MONTHLY_SCHEDULING_INTENTS,
  monthlySchedulingMonthKey,
  monthlySchedulingRange,
  submitMonthlySchedulingPreference,
  type MonthlySchedulingIntent,
  type MonthlySchedulingItemStatus,
} from "@/lib/monthly-scheduling";
import { formatBusinessDateOnly } from "@/lib/date-only";

function scheduleRows(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export async function GET(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const markViewed = new URL(req.url).searchParams.get("markViewed") === "1";
  const rows = await listParentMonthlyScheduling(auth.parent.id, { markViewed });
  return ok({
    items: rows.map((row) => {
      const month = monthlySchedulingMonthKey(row.campaign.month);
      const range = monthlySchedulingRange(month);
      return {
        id: row.id,
        month,
        monthStart: range ? formatBusinessDateOnly(range.start) : null,
        monthEnd: range ? formatBusinessDateOnly(new Date(range.end.getTime() - 1)) : null,
        campaignStatus: row.campaign.status,
        dueAt: row.campaign.dueAt ? row.campaign.dueAt.toISOString() : null,
        dueText: row.campaign.dueAt ? formatBusinessDateOnly(row.campaign.dueAt) : "-",
        student: row.student,
        course: row.course,
        package: row.package,
        status: row.status,
        statusLabel: itemStatusLabels[row.status as MonthlySchedulingItemStatus]?.zh ?? row.status,
        intent: row.intent,
        intentLabel: row.intent ? intentLabels[row.intent as MonthlySchedulingIntent]?.zh ?? row.intent : null,
        expectedSessionsPerWeek: row.expectedSessionsPerWeek,
        expectedMinutes: row.expectedMinutes,
        preferredMode: row.preferredMode,
        preferredCampus: row.preferredCampus,
        preferredTeacher: row.preferredTeacher,
        availability: row.availabilityJson,
        unavailableDates: row.unavailableDatesJson,
        parentNotes: row.parentNotes,
        currentSchedule: scheduleRows(row.currentScheduleJson),
        submittedAt: row.submittedAt?.toISOString() ?? null,
        locked: ["MATCHED", "SCHEDULED"].includes(row.status),
      };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const intent = String((body as any).intent ?? "") as MonthlySchedulingIntent;
  if (!MONTHLY_SCHEDULING_INTENTS.includes(intent)) return bad("请选择下个月的安排");
  try {
    const item = await submitMonthlySchedulingPreference({
      itemId: String((body as any).itemId ?? ""),
      parentId: auth.parent.id,
      intent,
      expectedSessionsPerWeek: (body as any).expectedSessionsPerWeek,
      expectedMinutes: (body as any).expectedMinutes,
      preferredMode: (body as any).preferredMode,
      preferredCampus: (body as any).preferredCampus,
      preferredTeacher: (body as any).preferredTeacher,
      availability: (body as any).availability,
      unavailableDates: (body as any).unavailableDates,
      parentNotes: (body as any).parentNotes,
    });
    return ok({ itemId: item.id, status: item.status, message: "下月上课安排已提交" });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "提交失败", 409);
  }
}
