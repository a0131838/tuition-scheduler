import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { getStaffMiniappDailySchedule } from "@/lib/miniapp-staff-schedule";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const scope = String(url.searchParams.get("scope") ?? "all").trim().toLowerCase();
  const date = String(url.searchParams.get("date") ?? "").trim();
  const includeExcused = String(url.searchParams.get("includeExcused") ?? "false").toLowerCase() === "true";

  let teacherId = String(url.searchParams.get("teacherId") ?? "").trim();
  const isTeacher = auth.user.role === "TEACHER";
  if (isTeacher) {
    if (!auth.user.teacherId) return bad("Teacher profile is not linked", 403);
    teacherId = auth.user.teacherId;
  } else if (scope === "mine") {
    teacherId = auth.user.teacherId ?? "";
  }

  try {
    const data = await getStaffMiniappDailySchedule({
      date: date || null,
      teacherId: teacherId || null,
      includeExcused,
      hideFullyExcused: true,
    });

    return ok({
      role: auth.user.role,
      teacherOnly: isTeacher,
      scope: isTeacher ? "mine" : scope,
      date: data.date,
      summary: data.summary,
      sessions: data.items,
    });
  } catch (error: any) {
    return bad(error?.message || "Failed to load schedule", 409);
  }
}
