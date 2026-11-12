import { communicationActor, requireCommunicationCenterUser } from "@/lib/communication-access";
import { listParentCommunicationTasks, syncParentCommunicationCenter } from "@/lib/parent-communication-center";

export async function GET(req: Request) {
  const user = await requireCommunicationCenterUser();
  const url = new URL(req.url);
  const date = url.searchParams.get("homeworkDate") || "";
  const start = new Date(`${date}T00:00:00+08:00`);
  const result = await listParentCommunicationTasks({
    status: String(url.searchParams.get("status") ?? "OPEN"),
    kind: String(url.searchParams.get("kind") ?? "ALL"),
    limit: Number(url.searchParams.get("limit") ?? 250),
    taskId: url.searchParams.get("taskId") || undefined,
    actorId: user.id,
    webAttachmentLinks: true,
    homeworkStudent: url.searchParams.get("homeworkStudent")?.trim().slice(0, 100),
    homeworkDate: /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(start.getTime())
      ? { start, end: new Date(start.getTime() + 86400000) } : undefined,
  });
  return Response.json({ ok: true, ...result });
}

export async function POST() {
  const user = await requireCommunicationCenterUser();
  const result = await syncParentCommunicationCenter(communicationActor(user));
  return Response.json({ ok: true, ...result });
}
