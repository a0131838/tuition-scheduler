import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappAcademicDesk, cleanMiniappText } from "@/lib/miniapp-staff-action-center";
import {
  getMonthlySchedulingCampaign,
  expireMonthlySchedulingOfferHolds,
  itemStatusLabels,
  MONTHLY_SCHEDULING_ITEM_STATUSES,
  monthlySchedulingMonthKey,
  monthlySchedulingOfferView,
  monthlySchedulingParentMessage,
  nextMonthlySchedulingMonth,
  updateMonthlySchedulingItem,
  type MonthlySchedulingItemStatus,
} from "@/lib/monthly-scheduling";

const QUEUE_LANES: Record<string, MonthlySchedulingItemStatus[]> = {
  READY_CONFIRM: ["PARENT_SELECTED"],
  WAITING_PARENT: ["NOT_SENT", "SENT", "VIEWED", "OFFERED"],
  EXCEPTIONS: ["SUBMITTED", "NEEDS_CLARIFICATION", "TEACHER_EXCEPTION", "CHANGE_REQUESTED"],
  COMPLETED: ["MATCHED", "SCHEDULED", "PAUSED"],
};

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Academic scheduling permission required", 403);
  const url = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("month") ?? "") ? url.searchParams.get("month")! : nextMonthlySchedulingMonth();
  const status = url.searchParams.get("status") ?? "READY_CONFIRM";
  if (status !== "ALL" && !QUEUE_LANES[status] && !MONTHLY_SCHEDULING_ITEM_STATUSES.includes(status as MonthlySchedulingItemStatus)) return bad("Invalid status");
  await expireMonthlySchedulingOfferHolds();
  const campaign = await getMonthlySchedulingCampaign(month);
  if (!campaign) return ok({ month, campaign: null, items: [], counts: {} });
  const counts = Object.fromEntries([
    ...MONTHLY_SCHEDULING_ITEM_STATUSES.map((value) => [value, campaign.items.filter((row) => row.status === value).length] as const),
    ...Object.entries(QUEUE_LANES).map(([lane, statuses]) => [lane, campaign.items.filter((row) => statuses.includes(row.status as MonthlySchedulingItemStatus)).length] as const),
  ]);
  const familyRows = new Map<string, typeof campaign.items>();
  for (const row of campaign.items) {
    if (row.status === "EXCLUDED") continue;
    const key = row.parentId ?? `STUDENT:${row.studentId}`;
    familyRows.set(key, [...(familyRows.get(key) ?? []), row]);
  }
  const familyMessages = new Map<string, string>();
  for (const [key, rows] of familyRows) {
    const row = rows[0];
    if (!row) continue;
    familyMessages.set(key, monthlySchedulingParentMessage({
      parentName: row.parent?.name,
      month,
      dueAt: campaign.dueAt,
      students: rows.map((candidate) => ({ studentName: candidate.student.name, courseName: candidate.course.name })),
    }));
  }
  const selectedStatuses = QUEUE_LANES[status] ?? (status === "ALL" ? null : [status as MonthlySchedulingItemStatus]);
  const items = campaign.items.filter((row) => !selectedStatuses || selectedStatuses.includes(row.status as MonthlySchedulingItemStatus)).slice(0, 300).map((row) => {
    const selectedOffer = row.offers.find((offer) => ["HELD", "ACCEPTED"].includes(offer.status));
    return {
      id: row.id,
      studentId: row.studentId,
      courseId: row.courseId,
      studentName: row.student.name,
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
      parentNotes: row.parentNotes,
      internalNote: row.internalNote,
      ownerName: row.ownerName,
      offers: row.offers.map(monthlySchedulingOfferView),
      selectedOffer: selectedOffer ? monthlySchedulingOfferView(selectedOffer) : null,
      message: familyMessages.get(row.parentId ?? `STUDENT:${row.studentId}`) ?? "",
    };
  });
  return ok({ month: monthlySchedulingMonthKey(campaign.month), campaign: { id: campaign.id, status: campaign.status, dueAt: campaign.dueAt?.toISOString() ?? null }, counts, items });
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
