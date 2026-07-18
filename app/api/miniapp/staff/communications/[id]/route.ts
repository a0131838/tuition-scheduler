import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { updateParentCommunicationTask } from "@/lib/parent-communication-center";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Communication center permission required", 403);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid request");
  try {
    const task = await updateParentCommunicationTask({
      id,
      action: String((body as any).action ?? ""),
      actor: { id: auth.user.id, email: auth.user.email, name: auth.user.name, role: auth.user.role },
      data: (body as any).data && typeof (body as any).data === "object" ? (body as any).data : {},
    });
    return ok({ task });
  } catch (error: any) {
    return bad(String(error?.message ?? "操作失败"), 409);
  }
}
