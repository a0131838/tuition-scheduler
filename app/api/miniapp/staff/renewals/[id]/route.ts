import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { canUseMiniappAcademicDesk } from "@/lib/miniapp-staff-action-center";
import { updateRenewalTask } from "@/lib/renewal-management";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canUseMiniappAcademicDesk(auth.user)) return bad("Renewal center permission required", 403);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const task = await updateRenewalTask({ id, actor: auth.user, ...(body ?? {}) });
    return ok({ task });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Failed to update renewal task");
  }
}
