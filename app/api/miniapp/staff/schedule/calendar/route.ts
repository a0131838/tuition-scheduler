import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { getStaffMiniappScheduleCalendar } from "@/lib/miniapp-staff-schedule-calendar";
import { canManageMiniappSchedulingCoordination, canManageMiniappSchedulingWrites } from "@/lib/miniapp-staff-session";

function clean(value: string | null, maxLen = 80) {
  return String(value ?? "").trim().slice(0, maxLen);
}

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  const isTeacher = auth.user.role === "TEACHER";
  const canCoordinate = canManageMiniappSchedulingCoordination(auth.user);
  if (!isTeacher && !canCoordinate) return bad("Scheduling calendar permission required", 403);
  if (isTeacher && !auth.user.teacherId) return bad("Teacher profile is not linked", 403);

  const url = new URL(req.url);
  const from = clean(url.searchParams.get("from"), 10);
  const to = clean(url.searchParams.get("to"), 10);
  if (!from || !to) return bad("Calendar range is required", 409);
  const teacherId = isTeacher ? auth.user.teacherId : clean(url.searchParams.get("teacherId"));

  try {
    const data = await getStaffMiniappScheduleCalendar({
      from,
      to,
      teacherId,
      campusId: clean(url.searchParams.get("campusId")),
      courseId: clean(url.searchParams.get("courseId")),
      studentQuery: clean(url.searchParams.get("q")),
    });
    return ok({
      ...data,
      filters: isTeacher
        ? {
            ...data.filters,
            teachers: data.filters.teachers.filter((teacher) => teacher.id === auth.user.teacherId),
          }
        : data.filters,
      role: auth.user.role,
      teacherOnly: isTeacher,
      capabilities: {
        canSchedule: canManageMiniappSchedulingWrites(auth.user),
        canCoordinate,
      },
    });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Failed to load scheduling calendar", 409);
  }
}
