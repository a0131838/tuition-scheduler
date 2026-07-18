import { communicationActor, requireCommunicationCenterUser } from "@/lib/communication-access";
import { updateParentCommunicationTask } from "@/lib/parent-communication-center";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCommunicationCenterUser();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ ok: false, message: "Invalid request" }, { status: 400 });
  try {
    const task = await updateParentCommunicationTask({
      id,
      action: String((body as any).action ?? ""),
      actor: communicationActor(user),
      data: (body as any).data && typeof (body as any).data === "object" ? (body as any).data : {},
    });
    return Response.json({ ok: true, task });
  } catch (error: any) {
    return Response.json({ ok: false, message: String(error?.message ?? "操作失败") }, { status: 409 });
  }
}
