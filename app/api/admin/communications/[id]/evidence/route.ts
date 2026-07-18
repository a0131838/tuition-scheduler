import { communicationActor, requireCommunicationCenterUser } from "@/lib/communication-access";
import { logAudit } from "@/lib/audit-log";
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload } from "@/lib/business-file-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCommunicationCenterUser();
  const { id } = await params;
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id } });
  if (!task) return Response.json({ ok: false, message: "Communication task not found" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ ok: false, message: "请选择图片截图" }, { status: 400 });
  const stored = await storeBusinessUpload(file, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications, maxBytes: 10 * 1024 * 1024, fallbackOriginalName: "wechat-evidence.jpg" });
  await prisma.parentCommunicationTask.update({ where: { id }, data: { evidenceUrl: stored.relativePath } });
  await logAudit({ actor: communicationActor(user), module: "COMMUNICATION", action: "UPLOAD_WECHAT_EVIDENCE", entityType: "ParentCommunicationTask", entityId: id, meta: { evidenceUrl: stored.relativePath } });
  return Response.json({ ok: true, evidenceUrl: stored.relativePath });
}
