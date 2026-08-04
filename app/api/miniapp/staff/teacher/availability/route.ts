import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { AVAIL_MAX_TIME, AVAIL_MIN_TIME, fromMin, inAllowedWindow, toMin } from "@/app/api/teacher/availability/_lib";
import { findDateAvailabilityOverlap, isAvailabilityDuplicateError } from "@/lib/availability-conflict";
import { formatBusinessDateOnly, parseBusinessDateEnd, parseBusinessDateStart } from "@/lib/date-only";
import { MINIAPP_TEACHER_AVAILABILITY_DAYS, validateMiniappTeacherAvailabilityDate } from "@/lib/miniapp-teacher-workbench";
import { prisma } from "@/lib/prisma";
import { monthlySchedulingMonthKey, monthlySchedulingRange } from "@/lib/monthly-scheduling";

export async function GET(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const todayText = formatBusinessDateOnly(new Date());
  const from = parseBusinessDateStart(todayText) ?? new Date();
  const endCursor = new Date(from.getTime() + MINIAPP_TEACHER_AVAILABILITY_DAYS * 24 * 60 * 60 * 1000);
  const to = parseBusinessDateEnd(formatBusinessDateOnly(endCursor)) ?? endCursor;
  const [slots, campaign, weeklyCount] = await Promise.all([
    prisma.teacherAvailabilityDate.findMany({
      where: { teacherId: access.teacherId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
    }),
    prisma.monthlySchedulingCampaign.findFirst({ where: { status: "OPEN" }, orderBy: { month: "asc" } }),
    prisma.teacherAvailability.count({ where: { teacherId: access.teacherId } }),
  ]);
  const campaignRange = campaign ? monthlySchedulingRange(monthlySchedulingMonthKey(campaign.month)) : null;
  const campaignSlotCount = campaignRange ? slots.filter((row) => row.date >= campaignRange.start && row.date < campaignRange.end).length : 0;
  return ok({
    from: todayText,
    to: formatBusinessDateOnly(endCursor),
    slots: slots.map((row) => ({ id: row.id, date: formatBusinessDateOnly(row.date), start: fromMin(row.startMin), end: fromMin(row.endMin), timeText: `${fromMin(row.startMin)} - ${fromMin(row.endMin)}` })),
    campaign: campaign ? {
      month: monthlySchedulingMonthKey(campaign.month),
      dueAt: campaign.teacherAvailabilityDueAt?.toISOString() ?? null,
      dueText: campaign.teacherAvailabilityDueAt ? formatBusinessDateOnly(campaign.teacherAvailabilityDueAt) : "-",
      savedSlotCount: campaignSlotCount,
      hasRecurringTemplate: weeklyCount > 0,
      complete: campaignSlotCount > 0,
    } : null,
  });
}

export async function POST(req: Request) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid JSON");
  const dateText = String((body as any).date ?? "").trim();
  const start = String((body as any).start ?? "").trim();
  const end = String((body as any).end ?? "").trim();
  const dateCheck = validateMiniappTeacherAvailabilityDate(dateText);
  if (!dateCheck.ok) return bad(dateCheck.message, 409);
  const startMin = toMin(start);
  const endMin = toMin(end);
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) return bad("结束时间必须晚于开始时间", 409);
  if (!inAllowedWindow(startMin, endMin)) return bad(`时间必须在 ${AVAIL_MIN_TIME} 至 ${AVAIL_MAX_TIME} 之间`, 409);
  const overlap = await findDateAvailabilityOverlap(prisma, access.teacherId, dateCheck.date, startMin, endMin);
  if (overlap) return bad("该时间与现有可用时段重叠", 409);
  try {
    const row = await prisma.teacherAvailabilityDate.create({ data: { teacherId: access.teacherId, date: dateCheck.date, startMin, endMin } });
    return ok({ slot: { id: row.id, date: dateText, start, end, timeText: `${start} - ${end}` } });
  } catch (error) {
    if (isAvailabilityDuplicateError(error)) return bad("该可用时段已经存在", 409);
    throw error;
  }
}
