import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappAcademicDesk, cleanMiniappText } from "@/lib/miniapp-staff-action-center";
import {
  getMonthlySchedulingCampaign,
  expireMonthlySchedulingOfferHolds,
  itemStatusLabels,
  MONTHLY_SCHEDULING_ITEM_STATUSES,
  MONTHLY_SCHEDULING_INTENTS,
  monthlySchedulingMonthKey,
  monthlySchedulingCohortForSourceName,
  monthlySchedulingExceptionReason,
  monthlySchedulingFamilyCanKeep,
  monthlySchedulingQueueLane,
  monthlySchedulingOfferView,
  monthlySchedulingParentMessageFromTemplate,
  listMonthlySchedulingQualifiedTeachers,
  nextMonthlySchedulingMonth,
  rankMonthlySchedulingOffersByStaff,
  submitMonthlySchedulingPreferenceByStaff,
  submitMonthlySchedulingFamilyKeepByStaff,
  updateMonthlySchedulingItem,
  type MonthlySchedulingIntent,
  type MonthlySchedulingItemStatus,
  type MonthlySchedulingResponseChannel,
  type MonthlySchedulingCohort,
} from "@/lib/monthly-scheduling";

const QUEUE_LANES = ["READY_CONFIRM", "WAITING_PARENT", "EXCEPTIONS", "COMPLETED"] as const;

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Academic scheduling permission required", 403);
  const url = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("month") ?? "") ? url.searchParams.get("month")! : nextMonthlySchedulingMonth();
  const status = url.searchParams.get("status") ?? "READY_CONFIRM";
  const cohort: MonthlySchedulingCohort = url.searchParams.get("cohort") === "XDF" ? "XDF" : "BOSS_OTHER";
  const itemId = cleanMiniappText(url.searchParams.get("itemId"), 80);
  if (status !== "ALL" && !QUEUE_LANES.includes(status as (typeof QUEUE_LANES)[number]) && !MONTHLY_SCHEDULING_ITEM_STATUSES.includes(status as MonthlySchedulingItemStatus)) return bad("Invalid status");
  await expireMonthlySchedulingOfferHolds();
  const campaign = await getMonthlySchedulingCampaign(month);
  if (!campaign) return ok({ month, campaign: null, cohort, cohortCounts: { BOSS_OTHER: 0, XDF: 0 }, items: [], counts: {} });
  const teacherOptionsByCourse = await listMonthlySchedulingQualifiedTeachers(campaign.items.map((row) => row.courseId));
  const cohortCounts = {
    BOSS_OTHER: campaign.items.filter((row) => monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === "BOSS_OTHER" && row.status !== "EXCLUDED").length,
    XDF: campaign.items.filter((row) => monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === "XDF" && row.status !== "EXCLUDED").length,
  };
  const selectedItem = itemId ? campaign.items.find((row) => row.id === itemId) : null;
  const scopeCohort = selectedItem ? monthlySchedulingCohortForSourceName(selectedItem.student.sourceChannel?.name) : cohort;
  const scopeItems = campaign.items.filter((row) => monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === scopeCohort);
  const counts = Object.fromEntries([
    ...MONTHLY_SCHEDULING_ITEM_STATUSES.map((value) => [value, scopeItems.filter((row) => row.status === value).length] as const),
    ...QUEUE_LANES.map((lane) => [lane, scopeItems.filter((row) => monthlySchedulingQueueLane(row) === lane).length] as const),
  ]);
  const familyRows = new Map<string, typeof campaign.items>();
  for (const row of scopeItems) {
    if (row.status === "EXCLUDED") continue;
    const key = row.parentId ?? `STUDENT:${row.studentId}`;
    familyRows.set(key, [...(familyRows.get(key) ?? []), row]);
  }
  const familyMessages = new Map<string, string>();
  for (const [key, rows] of familyRows) {
    const row = rows[0];
    if (!row) continue;
    familyMessages.set(key, await monthlySchedulingParentMessageFromTemplate({
      parentName: row.parent?.name,
      month,
      dueAt: campaign.dueAt,
      students: rows.map((candidate) => ({ studentName: candidate.student.name, courseName: candidate.course.name })),
    }));
  }
  const familyLeadIds = new Set(Array.from(familyRows.values()).map((rows) => rows[0]?.id).filter(Boolean));
  const items = scopeItems.filter((row) => {
    if (itemId) return row.id === itemId;
    if (status === "ALL") return true;
    if (QUEUE_LANES.includes(status as (typeof QUEUE_LANES)[number])) return monthlySchedulingQueueLane(row) === status;
    return row.status === status;
  }).slice(0, 300).map((row) => {
    const selectedOffer = row.offers.find((offer) => ["HELD", "ACCEPTED"].includes(offer.status));
    const familyKey = row.parentId ?? `STUDENT:${row.studentId}`;
    const family = familyRows.get(familyKey) ?? [row];
    return {
      id: row.id,
      campaignId: row.campaignId,
      familyKey,
      familyItemCount: family.length,
      familyCanKeep: monthlySchedulingFamilyCanKeep(family),
      isFamilyLead: familyLeadIds.has(row.id),
      studentId: row.studentId,
      courseId: row.courseId,
      studentName: row.student.name,
      cohort: monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name),
      sourceLabel: row.student.sourceChannel?.name ?? "博思及其他",
      sourceGroupLabel: monthlySchedulingCohortForSourceName(row.student.sourceChannel?.name) === "XDF" ? "新东方学生" : row.student.sourceChannel?.name ?? "博思及其他",
      grade: row.student.grade,
      courseName: row.course.name,
      parentName: row.parent?.name ?? null,
      parentPhone: row.parent?.phone ?? null,
      status: row.status,
      statusLabel: itemStatusLabels[row.status as MonthlySchedulingItemStatus]?.zh ?? row.status,
      intent: row.intent,
      expectedSessionsPerWeek: row.expectedSessionsPerWeek,
      expectedMinutes: row.expectedMinutes,
      preferredMode: row.preferredMode,
      preferredTeacher: row.preferredTeacher,
      preferredTeacherId: row.preferredTeacherId,
      teacherPreferenceType: row.teacherPreferenceType,
      teacherPreferenceNote: row.teacherPreferenceNote,
      teacherOptions: teacherOptionsByCourse.get(row.courseId) ?? [],
      parentNotes: row.parentNotes,
      availability: row.availabilityJson,
      unavailableDates: row.unavailableDatesJson,
      currentSchedule: Array.isArray(row.currentScheduleJson) ? row.currentScheduleJson : [],
      carryForwardSchedule: Array.isArray(row.carryForwardScheduleJson) ? row.carryForwardScheduleJson : [],
      exceptionReason: monthlySchedulingExceptionReason(row),
      internalNote: row.internalNote,
      ownerName: row.ownerName,
      responseEntryMode: row.responseEntryMode,
      responseChannel: row.responseChannel,
      respondedByName: row.respondedByName,
      parentConfirmationNote: row.parentConfirmationNote,
      parentConfirmedAt: row.parentConfirmedAt?.toISOString() ?? null,
      offerSelectionEntryMode: row.offerSelectionEntryMode,
      offerSelectionChannel: row.offerSelectionChannel,
      offerSelectedByName: row.offerSelectedByName,
      offerSelectionNote: row.offerSelectionNote,
      offerParentConfirmedAt: row.offerParentConfirmedAt?.toISOString() ?? null,
      offers: row.offers.map(monthlySchedulingOfferView),
      selectedOffer: selectedOffer ? monthlySchedulingOfferView(selectedOffer) : null,
      message: familyMessages.get(row.parentId ?? `STUDENT:${row.studentId}`) ?? "",
    };
  });
  return ok({ month: monthlySchedulingMonthKey(campaign.month), campaign: { id: campaign.id, status: campaign.status, dueAt: campaign.dueAt?.toISOString() ?? null }, cohort: scopeCohort, cohortCounts, counts, items });
}

export async function POST(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Academic scheduling permission required", 403);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const action = String((body as any).action ?? "");
  try {
    if (action === "PROXY_PREFERENCE") {
      const intent = String((body as any).intent ?? "") as MonthlySchedulingIntent;
      if (!MONTHLY_SCHEDULING_INTENTS.includes(intent)) return bad("请选择家长的下月安排");
      const row = await submitMonthlySchedulingPreferenceByStaff({
        itemId: String((body as any).itemId ?? ""),
        expectedStatus: String((body as any).expectedStatus ?? "") as MonthlySchedulingItemStatus,
        intent,
        expectedSessionsPerWeek: (body as any).expectedSessionsPerWeek,
        expectedMinutes: (body as any).expectedMinutes,
        preferredMode: (body as any).preferredMode,
        preferredCampus: (body as any).preferredCampus,
        preferredTeacher: (body as any).preferredTeacher,
        preferredTeacherId: (body as any).preferredTeacherId,
        teacherPreferenceType: (body as any).teacherPreferenceType,
        teacherPreferenceNote: cleanMiniappText((body as any).teacherPreferenceNote, 300),
        availability: (body as any).availability,
        unavailableDates: (body as any).unavailableDates,
        parentNotes: cleanMiniappText((body as any).parentNotes, 1000),
        responseChannel: String((body as any).responseChannel ?? "") as MonthlySchedulingResponseChannel,
        parentConfirmationNote: cleanMiniappText((body as any).parentConfirmationNote, 1000),
        parentConfirmedAt: String((body as any).parentConfirmedAt ?? ""),
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorName: auth.user.name,
        actorRole: auth.user.role,
      });
      return ok({ itemId: row.id, status: row.status, message: row.status === "OFFERED" ? "已代录并生成候选时间" : "已代家长录入" });
    }
    if (action === "PROXY_RANK_OFFERS") {
      const selected = await rankMonthlySchedulingOffersByStaff({
        itemId: String((body as any).itemId ?? ""),
        offerIds: Array.isArray((body as any).offerIds) ? (body as any).offerIds : [],
        responseChannel: String((body as any).responseChannel ?? "") as MonthlySchedulingResponseChannel,
        parentConfirmationNote: cleanMiniappText((body as any).parentConfirmationNote, 1000),
        parentConfirmedAt: String((body as any).parentConfirmedAt ?? ""),
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorName: auth.user.name,
        actorRole: auth.user.role,
      });
      return ok({ itemId: String((body as any).itemId ?? ""), status: "PARENT_SELECTED", selectedOffer: selected, message: "已按家长回复临时保留时间" });
    }
    if (action === "PROXY_KEEP_FAMILY") {
      const result = await submitMonthlySchedulingFamilyKeepByStaff({
        campaignId: String((body as any).campaignId ?? ""),
        seedItemId: String((body as any).itemId ?? ""),
        responseChannel: String((body as any).responseChannel ?? "") as MonthlySchedulingResponseChannel,
        parentConfirmationNote: cleanMiniappText((body as any).parentConfirmationNote, 1000),
        parentConfirmedAt: String((body as any).parentConfirmedAt ?? ""),
        actorUserId: auth.user.id,
        actorEmail: auth.user.email,
        actorName: auth.user.name,
        actorRole: auth.user.role,
      });
      return ok({ ...result, status: "SUBMITTED", message: `已代录全家 ${result.count} 项沿用本月安排` });
    }
    return bad("Invalid action");
  } catch (error) {
    return bad(error instanceof Error ? error.message : "代录失败", 409);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Academic scheduling permission required", 403);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const status = String((body as any).status ?? "") as MonthlySchedulingItemStatus;
  const expectedStatus = String((body as any).expectedStatus ?? "") as MonthlySchedulingItemStatus;
  if (!MONTHLY_SCHEDULING_ITEM_STATUSES.includes(status)) return bad("Invalid status");
  if (!MONTHLY_SCHEDULING_ITEM_STATUSES.includes(expectedStatus)) return bad("Invalid current status");
  try {
    const row = await updateMonthlySchedulingItem({
      itemId: String((body as any).itemId ?? ""),
      status,
      expectedStatus,
      ownerUserId: auth.user.id,
      ownerName: auth.user.name,
      internalNote: cleanMiniappText((body as any).internalNote, 1000) || null,
    });
    return ok({ itemId: row.id, status: row.status, message: "状态已更新" });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "更新失败", 409);
  }
}
