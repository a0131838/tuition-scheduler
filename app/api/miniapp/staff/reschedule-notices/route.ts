import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { getRescheduleInbox } from "@/lib/reschedule-notices";

export async function GET(req: Request) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (auth.user.isObserver || !canManageMiniappSchedulingCoordination(auth.user)) return bad("Communication center permission required", 403);
  return ok(await getRescheduleInbox(auth.user.id));
}
