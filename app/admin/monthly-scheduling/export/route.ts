import { requireMonthlySchedulingUser } from "@/lib/monthly-scheduling-access";
import { getMonthlySchedulingCampaign, itemStatusLabels, type MonthlySchedulingItemStatus } from "@/lib/monthly-scheduling";

function csv(value: unknown) {
  const raw = String(value ?? "");
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: Request) {
  await requireMonthlySchedulingUser();
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return new Response("Invalid month", { status: 400 });
  const campaign = await getMonthlySchedulingCampaign(month);
  if (!campaign) return new Response("Campaign not found", { status: 404 });
  const headers = ["Month", "Student", "Grade", "Course", "Parent", "Status", "Intent", "Sessions per week", "Expected minutes", "Mode", "Campus", "Teacher", "Parent notes", "Internal note"];
  const rows = campaign.items.map((item) => [month, item.student.name, item.student.grade, item.course.name, item.parent?.name, itemStatusLabels[item.status as MonthlySchedulingItemStatus]?.en ?? item.status, item.intent, item.expectedSessionsPerWeek, item.expectedMinutes, item.preferredMode, item.preferredCampus, item.preferredTeacher, item.parentNotes, item.internalNote]);
  const body = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
  return new Response(`\uFEFF${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="monthly-scheduling-${month}.csv"` } });
}
