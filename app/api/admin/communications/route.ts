import { communicationActor, requireCommunicationCenterUser } from "@/lib/communication-access";
import { listParentCommunicationTasks, syncParentCommunicationCenter } from "@/lib/parent-communication-center";

export async function GET(req: Request) {
  const user = await requireCommunicationCenterUser();
  const url = new URL(req.url);
  const result = await listParentCommunicationTasks({
    status: String(url.searchParams.get("status") ?? "OPEN"),
    kind: String(url.searchParams.get("kind") ?? "ALL"),
    limit: Number(url.searchParams.get("limit") ?? 250),
    taskId: url.searchParams.get("taskId") || undefined,
    actorId: user.id,
  });
  return Response.json({ ok: true, ...result });
}

export async function POST() {
  const user = await requireCommunicationCenterUser();
  const result = await syncParentCommunicationCenter(communicationActor(user));
  return Response.json({ ok: true, ...result });
}
