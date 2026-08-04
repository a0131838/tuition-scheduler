import { requireMonthlySchedulingUser } from "@/lib/monthly-scheduling-access";
import { getMonthlySchedulingCampaign, itemStatusLabels, monthlySchedulingCohortForSourceName, monthlySchedulingExceptionReason, normalizeMonthlyAvailability, type MonthlySchedulingCohort, type MonthlySchedulingItemStatus } from "@/lib/monthly-scheduling";

function csv(value: unknown) {
  const raw = String(value ?? "");
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: Request) {
  await requireMonthlySchedulingUser();
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? "";
  const cohort: MonthlySchedulingCohort = url.searchParams.get("cohort") === "XDF" ? "XDF" : "BOSS_OTHER";
  if (!/^\d{4}-\d{2}$/.test(month)) return new Response("Invalid month", { status: 400 });
  const campaign = await getMonthlySchedulingCampaign(month);
  if (!campaign) return new Response("Campaign not found", { status: 404 });
  const headers = ["Month", "Student group", "Source", "Student", "Grade", "Course", "Parent", "Status", "Exception reason", "Intent", "Sessions per week", "Expected minutes", "Mode", "Campus", "Teacher preference type", "Teacher", "Teacher ID", "Teacher verification note", "Carry-forward suggestion", "Time preference levels", "Family decision batch", "Parent notes", "Internal note", "Response entry mode", "Response channel", "Entered by", "Parent confirmed at", "Parent confirmation note", "Offer selection entry mode", "Offer selection channel", "Offer selection entered by", "Offer parent confirmed at", "Offer selection note"];
  const rows = campaign.items.filter((item) => monthlySchedulingCohortForSourceName(item.student.sourceChannel?.name) === cohort).map((item) => {
    const carry = Array.isArray(item.carryForwardScheduleJson) ? item.carryForwardScheduleJson as any[] : [];
    const availability = normalizeMonthlyAvailability(item.availabilityJson);
    return [month, cohort === "XDF" ? "New Oriental / 新东方学生" : "Boss and other / 博思及其他", item.student.sourceChannel?.name, item.student.name, item.student.grade, item.course.name, item.parent?.name, itemStatusLabels[item.status as MonthlySchedulingItemStatus]?.en ?? item.status, monthlySchedulingExceptionReason(item), item.intent, item.expectedSessionsPerWeek, item.expectedMinutes, item.preferredMode, item.preferredCampus, item.teacherPreferenceType, item.preferredTeacher, item.preferredTeacherId, item.teacherPreferenceNote, carry.map((row) => `${row.weekdayLabel ?? ""} ${row.start ?? ""}-${row.end ?? ""} ${row.teacher ?? ""}`).join("; "), availability.timeRanges.map((row) => `${row.priority}:${row.start}-${row.end}`).join("; "), item.familyDecisionBatchId, item.parentNotes, item.internalNote, item.responseEntryMode, item.responseChannel, item.respondedByName, item.parentConfirmedAt?.toISOString(), item.parentConfirmationNote, item.offerSelectionEntryMode, item.offerSelectionChannel, item.offerSelectedByName, item.offerParentConfirmedAt?.toISOString(), item.offerSelectionNote];
  });
  const body = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
  return new Response(`\uFEFF${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="monthly-scheduling-${month}-${cohort === "XDF" ? "xdf" : "other"}.csv"` } });
}
