import { bad, ok, requireMiniappParent } from "@/app/api/miniapp/_lib";
import {
  intentLabels,
  itemStatusLabels,
  listParentMonthlyScheduling,
  listMonthlySchedulingQualifiedTeachers,
  monthlySchedulingOfferView,
  MONTHLY_SCHEDULING_INTENTS,
  monthlySchedulingMonthKey,
  monthlySchedulingRange,
  rankMonthlySchedulingOffers,
  requestMonthlySchedulingChange,
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
  const teacherOptionsByCourse = await listMonthlySchedulingQualifiedTeachers(rows.map((row) => row.courseId));
  return ok({
    items: rows.map((row) => {
      const month = monthlySchedulingMonthKey(row.campaign.month);
      const range = monthlySchedulingRange(month);
      const selectedOffer = row.offers.find((offer) => ["HELD", "ACCEPTED"].includes(offer.status));
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
        preferredTeacherId: row.preferredTeacherId,
        teacherPreferenceType: row.teacherPreferenceType,
        teacherPreferenceNote: row.teacherPreferenceNote,
        teacherOptions: teacherOptionsByCourse.get(row.courseId) ?? [],
        availability: row.availabilityJson,
        unavailableDates: row.unavailableDatesJson,
        parentNotes: row.parentNotes,
        currentSchedule: scheduleRows(row.currentScheduleJson),
        offers: row.offers.map(monthlySchedulingOfferView),
        selectedOffer: selectedOffer ? monthlySchedulingOfferView(selectedOffer) : null,
        submittedAt: row.submittedAt?.toISOString() ?? null,
        locked: ["OFFERED", "PARENT_SELECTED", "MATCHED", "SCHEDULED", "CHANGE_REQUESTED"].includes(row.status),
        canRankOffers: ["OFFERED", "PARENT_SELECTED"].includes(row.status),
        canRequestChange: ["MATCHED", "SCHEDULED"].includes(row.status),
      };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const action = String((body as any).action ?? "PREFERENCE");
  try {
    if (action === "RANK_OFFERS") {
      const selected = await rankMonthlySchedulingOffers({
        itemId: String((body as any).itemId ?? ""),
        parentId: auth.parent.id,
        offerIds: Array.isArray((body as any).offerIds) ? (body as any).offerIds : [],
      });
      return ok({ itemId: String((body as any).itemId ?? ""), status: "PARENT_SELECTED", selectedOffer: selected, message: "已临时保留首选时间" });
    }
    if (action === "REQUEST_CHANGE") {
      const item = await requestMonthlySchedulingChange({
        itemId: String((body as any).itemId ?? ""),
        parentId: auth.parent.id,
        note: String((body as any).note ?? ""),
      });
      return ok({ itemId: item.id, status: item.status, message: "调整申请已提交，原安排会保留至学校确认新方案" });
    }
  } catch (error) {
    return bad(error instanceof Error ? error.message : "提交失败", 409);
  }
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
      preferredTeacherId: (body as any).preferredTeacherId,
      teacherPreferenceType: (body as any).teacherPreferenceType,
      teacherPreferenceNote: (body as any).teacherPreferenceNote,
      availability: (body as any).availability,
      unavailableDates: (body as any).unavailableDates,
      parentNotes: (body as any).parentNotes,
    });
    return ok({ itemId: item.id, status: item.status, message: "下月上课安排已提交" });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "提交失败", 409);
  }
}
