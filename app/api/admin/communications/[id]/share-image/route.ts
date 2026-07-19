import { requireCommunicationCenterUser } from "@/lib/communication-access";
import { buildCommunicationShareImage } from "@/lib/communication-share-image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCommunicationCenterUser();
  const { id } = await params;
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id }, select: { title: true, messageText: true, kind: true } });
  if (!task) return new Response("Not found", { status: 404 });
  const image = await buildCommunicationShareImage(task);
  return new Response(new Uint8Array(image), { headers: { "content-type": "image/png", "content-disposition": `attachment; filename="communication-${id}.png"`, "cache-control": "no-store" } });
}
