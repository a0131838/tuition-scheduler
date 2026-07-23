import { requireRenewalCenterUser } from "@/lib/renewal-access";
import { updateRenewalTask } from "@/lib/renewal-management";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRenewalCenterUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const task = await updateRenewalTask({ id, actor: user, ...(body ?? {}) });
    return Response.json({ ok: true, task });
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update renewal task" },
      { status: 400 }
    );
  }
}
