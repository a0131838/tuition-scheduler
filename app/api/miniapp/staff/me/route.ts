import { ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { staffMiniappUserDto } from "@/lib/miniapp-staff";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  return ok({ staff: staffMiniappUserDto(auth.user) });
}
