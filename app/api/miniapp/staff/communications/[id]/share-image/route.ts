import { bad } from "@/app/api/miniapp/_lib";
import { requireMiniappStaff } from "@/app/api/miniapp/staff/_lib";
import { buildCommunicationShareImage } from "@/lib/communication-share-image";
import { canManageMiniappSchedulingCoordination } from "@/lib/miniapp-staff-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMiniappStaff(req);
  if (!auth.ok) return auth.response;
  if (!canManageMiniappSchedulingCoordination(auth.user)) return bad("Communication center permission required", 403);
  const { id } = await params;
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id }, select: { title: true, messageText: true, kind: true } });
  if (!task) return bad("Communication task not found", 404);
  const image = await buildCommunicationShareImage(task);
  return new Response(new Uint8Array(image), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
