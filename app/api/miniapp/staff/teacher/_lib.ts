import { bad } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";

export async function requireMiniappTeacher(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth;
  if (auth.user.role !== "TEACHER") {
    return { ok: false as const, response: bad("Teacher role required", 403) };
  }
  if (!auth.user.teacherId) {
    return { ok: false as const, response: bad("Teacher profile is not linked", 403) };
  }
  return { ok: true as const, auth, user: auth.user, teacherId: auth.user.teacherId };
}
