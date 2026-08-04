import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappAcademicDesk, cleanMiniappText } from "@/lib/miniapp-staff-action-center";
import {
  getMonthlySchedulingCampaign,
  itemStatusLabels,
  MONTHLY_SCHEDULING_ITEM_STATUSES,
  monthlySchedulingMonthKey,
  monthlySchedulingParentMessage,
  nextMonthlySchedulingMonth,
  updateMonthlySchedulingItem,
  type MonthlySchedulingItemStatus,
} from "@/lib/monthly-scheduling";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Academic scheduling permission required", 403);
  const url = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get("month") ?? "") ? url.searchParams.get("month")! : nextMonthlySchedulingMonth();
  const status = url.searchParams.get("status") ?? "ALL";
  if (status !== "ALL" && !MONTHLY_SCHEDULING_ITEM_STATUSES.includes(status as MonthlySchedulingItemStatus)) return bad("Invalid status");
  const campaign = await getMonthlySchedulingCampaign(month);
  if (!campaign) return ok({ month, campaign: null, items: [], counts: {} });
  const counts = Object.fromEntries(MONTHLY_SCHEDULING_ITEM_STATUSES.map((value) => [value, campaign.items.filter((row) => row.status === value).length]));
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
  const items = campaign.items.filter((row) => status === "ALL" || row.status === status).slice(0, 300).map((row) => ({
    id: row.id,
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
    message: familyMessages.get(row.parentId ?? `STUDENT:${row.studentId}`) ?? "",
  }));
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
