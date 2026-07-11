import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import {
  canAccessMiniappStaffSession,
  canManageMiniappSchedulingCoordination,
  canTeachMiniappSession,
  getMiniappStaffSessionContext,
  miniappStaffSessionDto,
} from "@/lib/miniapp-staff-session";

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;

  const { sessionId } = await ctx.params;
  const session = await getMiniappStaffSessionContext(sessionId);
  if (!session || !canAccessMiniappStaffSession(auth.user, session)) {
    return bad("Session not found or no permission", 404);
  }

  return ok({
    session: miniappStaffSessionDto(session),
    capabilities: {
      canTeachSession: canTeachMiniappSession(auth.user, session),
      canManageCoordination: canManageMiniappSchedulingCoordination(auth.user),
    },
  });
}
